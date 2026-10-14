import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import ContactRequest from '../models/contactRequest.model.js';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { Readable } from 'node:stream';
import cloudinary from '../lib/cloudinary.js';
import { emitToUser } from '../lib/socket.js';

const MAX_IMAGE_VIDEO_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_VIDEO_BASE64_LENGTH = Math.ceil(MAX_IMAGE_VIDEO_SIZE * 4 / 3) + 1024;
const MAX_DOCUMENT_BASE64_LENGTH = Math.ceil(MAX_DOCUMENT_SIZE * 4 / 3) + 1024;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const DELETE_WINDOW_MS = 4 * 60 * 60 * 1000;
const REPLY_PREVIEW_FIELDS = 'text image video document documentName senderId deletedAt';

class AttachmentValidationError extends Error {}

const serializeMessage = (message, userId) => {
  const serialized = message.toObject();
  serialized.isStarred = message.starredBy.some((id) => id.toString() === userId.toString());
  delete serialized.starredBy;
  return serialized;
};

const emitToConversation = (message, event) => {
  const participantIds = [message.senderId.toString(), message.receiverId.toString()];
  for (const userId of new Set(participantIds)) {
    emitToUser(userId, event, serializeMessage(message, userId));
  }
};

const uploadRawDocument = (data, documentName) => {
  const extension = documentName.split('.').pop()?.toLowerCase();
  const supportedExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip']);
  if (!extension || !supportedExtensions.has(extension)) {
    throw new AttachmentValidationError('Unsupported document type.');
  }

  const dataUrl = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(data);
  if (!dataUrl) throw new AttachmentValidationError('Document data is invalid.');
  const buffer = Buffer.from(dataUrl[2], 'base64');
  if (!buffer.length || buffer.length > MAX_DOCUMENT_SIZE) {
    throw new AttachmentValidationError('Documents must be 10 MB or smaller.');
  }
  if (extension === 'pdf' && (
    dataUrl[1].toLowerCase() !== 'application/pdf' ||
    buffer.subarray(0, 5).toString() !== '%PDF-'
  )) {
    throw new AttachmentValidationError('The selected file is not a valid PDF.');
  }

  const extensionSuffix = `.${extension}`;
  const safeBaseName = documentName
    .slice(0, -extensionSuffix.length)
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 180) || 'attachment';
  const safeName = `${safeBaseName}${extensionSuffix}`;
  const publicId = `${randomUUID()}-${safeName}`;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'nexus-chat/messages', public_id: publicId, resource_type: 'raw' },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) return reject(new Error('Document upload returned no URL.'));
        resolve(result);
      }
    ).end(buffer);
  });
};

const areMutualContacts = async (userId, contactId) => {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(contactId)) return false;
  const [legacyMutualContacts, acceptedRequest] = await Promise.all([
    Promise.all([
      User.exists({ _id: userId, contacts: contactId }),
      User.exists({ _id: contactId, contacts: userId }),
    ]),
    ContactRequest.exists({
      status: 'accepted',
      $or: [
        { sender: userId, recipient: contactId },
        { sender: contactId, recipient: userId },
      ],
    }),
  ]);
  return Boolean((legacyMutualContacts[0] && legacyMutualContacts[1]) || acceptedRequest);
};

const hasHiddenConnection = async (userId, contactId) => Boolean(await User.exists({
  $or: [
    { _id: userId, hiddenContacts: contactId },
    { _id: contactId, hiddenContacts: userId },
  ],
}));

export const getUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('contacts hiddenContacts');
    const acceptedRequests = await ContactRequest.find({
      status: 'accepted',
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    }).select('sender recipient');
    const acceptedContactIds = acceptedRequests.map((request) =>
      request.sender.toString() === req.user._id.toString() ? request.recipient : request.sender
    );
    const legacyMutualContacts = await User.find({
      _id: { $in: currentUser.contacts },
      contacts: req.user._id,
    }).select('_id');
    const contactIds = new Set([
      ...acceptedContactIds.map((id) => id.toString()),
      ...legacyMutualContacts.map((user) => user._id.toString()),
    ]);
    for (const hiddenId of currentUser.hiddenContacts) {
      contactIds.delete(hiddenId.toString());
    }
    const contactObjectIds = [...contactIds].map((id) => new mongoose.Types.ObjectId(id));
    const [users, unreadCounts, latestMessages] = await Promise.all([
      User.find({ _id: { $in: [...contactIds] } })
        .select('fullName email profilePic bio lastSeen'),
      Message.aggregate([
        {
          $match: {
            receiverId: req.user._id,
            read: false,
            messageRequestStatus: { $ne: 'pending' },
            deletedAt: { $exists: false },
            deletedFor: { $ne: req.user._id },
          },
        },
        { $group: { _id: '$senderId', count: { $sum: 1 } } },
      ]),
      Message.aggregate([
        {
          $match: {
            $or: [
              { senderId: req.user._id, receiverId: { $in: contactObjectIds } },
              { receiverId: req.user._id, senderId: { $in: contactObjectIds } },
            ],
            messageRequestStatus: { $ne: 'pending' },
            deletedAt: { $exists: false },
            deletedFor: { $ne: req.user._id },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$senderId', req.user._id] },
                '$receiverId',
                '$senderId',
              ],
            },
            latestMessage: {
              $first: {
                _id: '$_id',
                text: '$text',
                image: '$image',
                video: '$video',
                documentName: '$documentName',
                senderId: '$senderId',
                createdAt: '$createdAt',
              },
            },
          },
        },
      ]),
    ]);
    const unreadBySender = new Map(unreadCounts.map(({ _id, count }) => [_id.toString(), count]));
    const latestMessageByContact = new Map(latestMessages.map(({ _id, latestMessage }) => [
      _id.toString(),
      latestMessage,
    ]));
    return res.status(200).json(users.map((user) => ({
      ...user.toObject(),
      unreadCount: unreadBySender.get(user._id.toString()) || 0,
      latestMessage: latestMessageByContact.get(user._id.toString()) || null,
    })));
  } catch (error) {
    console.error('getUsers error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const searchContact = async (req, res) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!email) return res.status(400).json({ message: 'Enter an email address to search.' });

    const contact = await User.findOne({ email }).select('fullName email profilePic lastSeen contacts');
    if (!contact) return res.status(404).json({ message: 'No account was found with that email.' });
    if (contact._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'That email belongs to your account.' });
    }

    const request = await ContactRequest.findOne({
      $or: [
        { sender: req.user._id, recipient: contact._id },
        { sender: contact._id, recipient: req.user._id },
      ],
    }).select('sender recipient status');
    const [currentUserHasAdded, contactHasAddedCurrentUser, isHidden] = await Promise.all([
      User.exists({ _id: req.user._id, contacts: contact._id }),
      User.exists({ _id: contact._id, contacts: req.user._id }),
      User.exists({ _id: req.user._id, hiddenContacts: contact._id }),
    ]);
    const requestStatus = request?.status === 'accepted'
      ? 'accepted'
      : request?.sender.toString() === req.user._id.toString()
        ? 'sent'
        : request
          ? 'received'
          : currentUserHasAdded && contactHasAddedCurrentUser
            ? 'accepted'
            : null;
    const { contacts: _contacts, ...publicContact } = contact.toObject();

    return res.status(200).json({
      contact: {
        ...publicContact,
        requestStatus,
        isHidden: Boolean(isHidden),
      },
    });
  } catch (error) {
    console.error('searchContact error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const addContact = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) return res.status(400).json({ message: 'Enter the contact email address.' });

    const contact = await User.findOne({ email }).select('fullName email profilePic lastSeen');
    if (!contact) return res.status(404).json({ message: 'No account was found with that email.' });
    if (contact._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot add your own account as a contact.' });
    }

    const isHidden = await hasHiddenConnection(req.user._id, contact._id);
    if (await areMutualContacts(req.user._id, contact._id) && !isHidden) {
      return res.status(409).json({ message: 'You are already connected.' });
    }

    let existingRequest = await ContactRequest.findOne({
      $or: [
        { sender: req.user._id, recipient: contact._id },
        { sender: contact._id, recipient: req.user._id },
      ],
    });

    if (existingRequest?.status === 'pending') {
      if (existingRequest.sender.toString() !== req.user._id.toString()) {
        return res.status(409).json({ message: 'This person already sent you a request. Accept it from your incoming requests.' });
      }
      return res.status(409).json({ message: 'Your contact request is already pending.' });
    }

    // Removing a contact hides the old connection. Allow a fresh request to reconnect.
    // Replace any old accepted request, and clear the hidden flag for the recipient only
    // after they accept the new request.
    if (existingRequest) {
      await ContactRequest.deleteOne({ _id: existingRequest._id });
    }

    await ContactRequest.create({ sender: req.user._id, recipient: contact._id });
    emitToUser(contact._id.toString(), 'contactsUpdated');
    emitToUser(contact._id.toString(), 'notification', {
      type: 'contactRequest',
      name: req.user.fullName,
    });

    return res.status(201).json({
      message: `Contact request sent to ${contact.fullName}.`,
      contact: { ...contact.toObject(), requestStatus: 'sent' },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A contact request is already pending.' });
    }
    console.error('addContact error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getContactRequests = async (req, res) => {
  try {
    const requests = await ContactRequest.find({
      recipient: req.user._id,
      status: 'pending',
    })
      .populate('sender', 'fullName email profilePic')
      .sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (error) {
    console.error('getContactRequests error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getMessageRequests = async (req, res) => {
  try {
    const requests = await Message.aggregate([
      {
        $match: {
          receiverId: req.user._id,
          messageRequestStatus: 'pending',
          deletedFor: { $ne: req.user._id },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$senderId',
          latestMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 },
        },
      },
    ]);
    const senders = await User.find({ _id: { $in: requests.map((request) => request._id) } })
      .select('fullName email profilePic');
    const sendersById = new Map(senders.map((sender) => [sender._id.toString(), sender]));
    return res.status(200).json(requests.flatMap((request) => {
      const sender = sendersById.get(request._id.toString());
      if (!sender) return [];
      const { _id, text, image, video, documentName, createdAt } = request.latestMessage;
      return [{
        sender,
        latestMessage: { _id, text, image, video, documentName, createdAt },
        messageCount: request.messageCount,
      }];
    }));
  } catch (error) {
    console.error('getMessageRequests error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getMessageRequestMessages = async (req, res) => {
  try {
    const senderId = req.params.userId;
    if (!mongoose.isValidObjectId(senderId) || senderId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Invalid message request.' });
    }
    const messages = await Message.find({
      senderId,
      receiverId: req.user._id,
      messageRequestStatus: 'pending',
      deletedFor: { $ne: req.user._id },
    })
      .select('text image video document documentName createdAt')
      .sort({ createdAt: 1 });
    if (!messages.length) {
      return res.status(404).json({ message: 'Pending message request not found.' });
    }
    return res.status(200).json(messages);
  } catch (error) {
    console.error('getMessageRequestMessages error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const respondToMessageRequest = async (req, res) => {
  try {
    const senderId = req.params.userId;
    if (!mongoose.isValidObjectId(senderId) || senderId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Invalid message request.' });
    }
    const accept = req.method === 'PATCH';
    const pendingFilter = {
      senderId,
      receiverId: req.user._id,
      messageRequestStatus: 'pending',
    };
    if (!await Message.exists(pendingFilter)) {
      return res.status(404).json({ message: 'Pending message request not found.' });
    }

    await Message.updateMany(
      pendingFilter,
      accept
        ? { $set: { messageRequestStatus: 'accepted' } }
        : {
            $set: { messageRequestStatus: 'declined' },
            $addToSet: { deletedFor: req.user._id },
          }
    );

    if (accept) {
      await User.updateMany(
        { _id: { $in: [req.user._id, senderId] } },
        { $pull: { hiddenContacts: { $in: [req.user._id, senderId] } } }
      );
    }

    emitToUser(senderId, 'contactsUpdated');
    emitToUser(req.user._id.toString(), 'contactsUpdated');

    return res.status(200).json({
      message: accept ? 'Message request accepted.' : 'Message request declined.',
    });
  } catch (error) {
    console.error('respondToMessageRequest error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const respondToContactRequest = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.requestId)) {
      return res.status(400).json({ message: 'Invalid contact request.' });
    }
    const request = await ContactRequest.findOne({
      _id: req.params.requestId,
      recipient: req.user._id,
      status: 'pending',
    });
    if (!request) return res.status(404).json({ message: 'Pending contact request not found.' });
    request.status = 'accepted';
    request.acceptedAt = new Date();
    await request.save();

    emitToUser(request.sender.toString(), 'contactsUpdated');
    emitToUser(request.recipient.toString(), 'contactsUpdated');
    emitToUser(request.sender.toString(), 'notification', {
      type: 'contactAccepted',
      name: req.user.fullName,
    });

    return res.status(200).json({ message: 'Contact request accepted.' });
  } catch (error) {
    console.error('respondToContactRequest error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const declineContactRequest = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.requestId)) {
      return res.status(400).json({ message: 'Invalid contact request.' });
    }
    const request = await ContactRequest.findOneAndDelete({
      _id: req.params.requestId,
      recipient: req.user._id,
      status: 'pending',
    });
    if (!request) return res.status(404).json({ message: 'Pending contact request not found.' });
    emitToUser(request.sender.toString(), 'contactsUpdated');
    return res.status(200).json({ message: 'Contact request declined.' });
  } catch (error) {
    console.error('declineContactRequest error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const removeContact = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid contact.' });
    }
    const userId = req.user._id;
    const otherUserId = req.params.userId;
    const [hasLegacyContact, acceptedRequest] = await Promise.all([
      User.exists({ _id: userId, contacts: otherUserId }),
      ContactRequest.exists({
        status: 'accepted',
        $or: [
          { sender: userId, recipient: otherUserId },
          { sender: otherUserId, recipient: userId },
        ],
      }),
    ]);

    if (!hasLegacyContact && !acceptedRequest) {
      return res.status(404).json({ message: 'Contact not found.' });
    }

    await Promise.all([
      Message.updateMany(
        {
          $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        { $addToSet: { deletedFor: userId } }
      ),
      User.updateOne(
        { _id: userId },
        { $addToSet: { hiddenContacts: otherUserId } }
      ),
    ]);

    return res.status(200).json({ message: 'Contact removed and chat history cleared for you.' });
  } catch (error) {
    console.error('removeContact error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const targetId = req.params.userId;
    if (!await areMutualContacts(myId, targetId)) {
      return res.status(403).json({ message: 'You can only chat with mutual contacts.' });
    }

    const now = new Date();
    await Message.updateMany(
      {
        pinnedAt: { $exists: true },
        $and: [
          {
            $or: [
              { pinnedUntil: { $exists: false } },
              { pinnedUntil: { $lte: now } },
            ],
          },
          {
            $or: [
              { senderId: myId, receiverId: targetId },
              { senderId: targetId, receiverId: myId },
            ],
          },
        ],
      },
      { $unset: { pinnedAt: 1, pinnedUntil: 1, pinnedBy: 1 } }
    );

    const messages = await Message.find({
      deletedFor: { $ne: myId },
      $and: [
        { $or: [{ senderId: myId }, { messageRequestStatus: { $ne: 'pending' } }] },
        {
          $or: [
            { senderId: myId, receiverId: targetId },
            { senderId: targetId, receiverId: myId },
          ],
        },
      ],
    })
      .populate('replyTo', REPLY_PREVIEW_FIELDS)
      .sort({ createdAt: 1 });

    const readResult = await Message.updateMany(
      {
        senderId: targetId,
        receiverId: myId,
        read: false,
        messageRequestStatus: { $ne: 'pending' },
      },
      { read: true }
    );
    if (readResult.modifiedCount > 0) {
      emitToUser(myId.toString(), 'messagesRead', { senderId: targetId.toString() });
    }

    return res.status(200).json(messages.map((message) => serializeMessage(message, myId)));
  } catch (error) {
    console.error('getMessages error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getMessageDocument = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: 'Invalid document request.' });
    }

    const message = await Message.findOne({
      _id: messageId,
      $or: [
        { senderId: req.user._id },
        { receiverId: req.user._id },
      ],
      deletedAt: { $exists: false },
      deletedFor: { $ne: req.user._id },
    }).select('document documentName');
    if (!message?.document || !message.documentName) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const documentUrl = new URL(message.document);
    if (documentUrl.protocol !== 'https:' || documentUrl.hostname !== 'res.cloudinary.com') {
      console.error('getMessageDocument error: unexpected document host.');
      return res.status(502).json({ message: 'Unable to retrieve this document.' });
    }

    const remoteResponse = await fetch(documentUrl, { redirect: 'error' });
    if (!remoteResponse.ok || !remoteResponse.body) {
      console.error(`getMessageDocument error: document host returned ${remoteResponse.status}.`);
      return res.status(502).json({ message: 'Unable to retrieve this document.' });
    }

    const fileName = message.documentName.replace(/[\\/:*?"<>|\r\n]/g, '_') || 'attachment';
    const asciiFileName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      zip: 'application/zip',
    };
    const disposition = extension === 'pdf' ? 'inline' : 'attachment';
    res.set({
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (remoteResponse.headers.has('content-length')) {
      res.set('Content-Length', remoteResponse.headers.get('content-length'));
    }
    Readable.fromWeb(remoteResponse.body)
      .on('error', (error) => {
        console.error('getMessageDocument stream error:', error.message);
        res.destroy(error);
      })
      .pipe(res);
  } catch (error) {
    console.error('getMessageDocument error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const markMessagesRead = async (req, res) => {
  try {
    const myId = req.user._id;
    const senderId = req.params.userId;
    if (!mongoose.isValidObjectId(senderId) || !(await areMutualContacts(myId, senderId))) {
      return res.status(403).json({ message: 'You can only mark a contact conversation as read.' });
    }

    const result = await Message.updateMany(
      {
        senderId,
        receiverId: myId,
        read: false,
        messageRequestStatus: { $ne: 'pending' },
        deletedAt: { $exists: false },
        deletedFor: { $ne: myId },
      },
      { $set: { read: true } }
    );
    if (result.modifiedCount > 0) {
      emitToUser(myId.toString(), 'messagesRead', { senderId: senderId.toString() });
    }
    return res.status(200).json({ markedRead: result.modifiedCount });
  } catch (error) {
    console.error('markMessagesRead error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherUserId = req.params.userId;
    if (!mongoose.isValidObjectId(otherUserId) || otherUserId === myId.toString()) {
      return res.status(400).json({ message: 'Invalid conversation.' });
    }

    const result = await Message.updateMany(
      {
        $or: [
          { senderId: myId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myId },
        ],
        deletedFor: { $ne: myId },
      },
      { $addToSet: { deletedFor: myId } }
    );

    return res.status(200).json({
      message: 'Chat history deleted for you.',
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('deleteChat error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: 'You cannot message yourself.' });
    }
    if (!await areMutualContacts(senderId, receiverId)) {
      return res.status(403).json({ message: 'You can only message mutual contacts. Add each other by email first.' });
    }
    const isMessageRequest = await hasHiddenConnection(senderId, receiverId);

    let { text, image, video, document, documentName, replyTo } = req.body;

    if (!text && !image && !video && !document) {
      return res.status(400).json({ message: 'Message must contain text or an attachment.' });
    }

    if (text) {
      text = text.trim();
      if (text.length > 2000) {
        return res.status(400).json({ message: 'Text exceeds 2000 character limit.' });
      }
    }
    if (document && (typeof documentName !== 'string' || !documentName.trim() || documentName.trim().length > 255)) {
      return res.status(400).json({ message: 'A valid document name is required.' });
    }

    let replyTarget;
    if (replyTo) {
      replyTarget = await Message.findOne({
        _id: replyTo,
        deletedAt: { $exists: false },
        deletedFor: { $ne: senderId },
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      });
      if (!replyTarget) return res.status(400).json({ message: 'Reply target is not available.' });
    }

    let imageUrl;
    let videoUrl;
    let documentUrl;
    if (image || video || document) {
      const media = image || video || document;
      const maxBase64Length = document
        ? MAX_DOCUMENT_BASE64_LENGTH
        : MAX_IMAGE_VIDEO_BASE64_LENGTH;
      if (typeof media !== 'string' || media.length > maxBase64Length) {
        return res.status(400).json({
          message: document
            ? 'Documents must be 10 MB or smaller.'
            : 'Images and videos must be 10 MB or smaller.',
        });
      }

      const uploadResult = document
        ? await uploadRawDocument(document, documentName.trim())
        : await cloudinary.uploader.upload(media, {
            folder: 'nexus-chat/messages',
            resource_type: image ? 'image' : 'video',
          });

      if (image) imageUrl = uploadResult.secure_url;
      else if (video) videoUrl = uploadResult.secure_url;
      else documentUrl = uploadResult.secure_url;
    }

    const message = await Message.create({
      senderId,
      receiverId,
      text: text || undefined,
      image: imageUrl || undefined,
      video: videoUrl || undefined,
      document: documentUrl || undefined,
      documentName: documentUrl ? documentName.trim() : undefined,
      replyTo: replyTarget?._id,
      messageRequestStatus: isMessageRequest ? 'pending' : undefined,
    });
    await message.populate('replyTo', REPLY_PREVIEW_FIELDS);

    if (isMessageRequest) {
      emitToUser(receiverId, 'contactsUpdated');
      emitToUser(receiverId, 'notification', {
        type: 'messageRequest',
        name: req.user.fullName,
      });
    } else {
      emitToConversation(message, 'newMessage');
    }

    return res.status(201).json(serializeMessage(message, senderId));
  } catch (error) {
    console.error('sendMessage error:', error.message);
    if (error instanceof AttachmentValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.findOne({
      _id: req.params.messageId,
      senderId: req.user._id,
      deletedAt: { $exists: false },
    });

    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
      return res.status(400).json({ message: 'Messages can only be edited for 15 minutes.' });
    }
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Edited text is required.' });
    }
    if (text.trim().length > 2000) {
      return res.status(400).json({ message: 'Text exceeds 2000 character limit.' });
    }

    message.text = text.trim();
    message.editedAt = new Date();
    await message.save();

    emitToConversation(message, 'messageEdited');
    return res.status(200).json(serializeMessage(message, req.user._id));
  } catch (error) {
    console.error('editMessage error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const deleteForMe = req.query.scope === 'me';
    const message = await Message.findOne({
      _id: req.params.messageId,
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    });

    if (!message) return res.status(404).json({ message: 'Message not found.' });

    if (deleteForMe) {
      await Message.updateOne(
        { _id: message._id },
        { $addToSet: { deletedFor: req.user._id } }
      );
      return res.status(200).json({ _id: message._id, deletedForMe: true });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the sender can delete for everyone.' });
    }
    if (message.deletedAt) return res.status(400).json({ message: 'Message is already deleted.' });
    if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS) {
      return res.status(400).json({ message: 'Messages can only be deleted for 4 hours.' });
    }

    message.text = undefined;
    message.image = undefined;
    message.video = undefined;
    message.document = undefined;
    message.documentName = undefined;
    message.deletedAt = new Date();
    await message.save();

    const serialized = serializeMessage(message, req.user._id);
    emitToConversation(message, 'messageDeleted');
    return res.status(200).json(serialized);
  } catch (error) {
    console.error('deleteMessage error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const toggleStarMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
      deletedAt: { $exists: false },
    });
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (typeof req.body.starred !== 'boolean') {
      return res.status(400).json({ message: 'A starred state is required.' });
    }

    if (req.body.starred) message.starredBy.addToSet(req.user._id);
    else message.starredBy.pull(req.user._id);
    await message.save();
    return res.status(200).json(serializeMessage(message, req.user._id));
  } catch (error) {
    console.error('toggleStarMessage error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const togglePinMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
      deletedAt: { $exists: false },
    });
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (typeof req.body.pinned !== 'boolean') {
      return res.status(400).json({ message: 'A pinned state is required.' });
    }

    if (req.body.pinned) {
      const durationDays = Number(req.body.durationDays);
      const allowedDurations = new Set([1, 7, 30]);
      if (!allowedDurations.has(durationDays)) {
        return res.status(400).json({ message: 'Choose a pin duration of 24 hours, 7 days, or 30 days.' });
      }
      const pinnedAt = new Date();
      message.pinnedAt = pinnedAt;
      message.pinnedUntil = new Date(pinnedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
      message.pinnedBy = req.user._id;
    } else {
      message.pinnedAt = undefined;
      message.pinnedUntil = undefined;
      message.pinnedBy = undefined;
    }
    await message.save();
    const serialized = serializeMessage(message, req.user._id);
    emitToConversation(message, 'messagePinned');
    return res.status(200).json(serialized);
  } catch (error) {
    console.error('togglePinMessage error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const forwardMessage = async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId || receiverId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Choose another user to forward this message to.' });
    }
    if (!await areMutualContacts(req.user._id, receiverId)) {
      return res.status(403).json({ message: 'You can only forward messages to mutual contacts.' });
    }

    const source = await Message.findOne({
      _id: req.params.messageId,
      deletedFor: { $ne: req.user._id },
      deletedAt: { $exists: false },
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    });
    if (!source) return res.status(404).json({ message: 'Message not found.' });
    if (!await User.exists({ _id: receiverId })) {
      return res.status(404).json({ message: 'Recipient not found.' });
    }

    const isMessageRequest = await hasHiddenConnection(req.user._id, receiverId);
    const forwarded = await Message.create({
      senderId: req.user._id,
      receiverId,
      text: source.text,
      image: source.image,
      video: source.video,
      document: source.document,
      documentName: source.documentName,
      isForwarded: true,
      messageRequestStatus: isMessageRequest ? 'pending' : undefined,
    });
    const serialized = serializeMessage(forwarded, req.user._id);
    if (isMessageRequest) {
      emitToUser(receiverId, 'contactsUpdated');
    } else {
      emitToConversation(forwarded, 'newMessage');
    }
    return res.status(201).json(serialized);
  } catch (error) {
    console.error('forwardMessage error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};