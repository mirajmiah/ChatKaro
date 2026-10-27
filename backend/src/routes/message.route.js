import express from 'express';
import {
  getUsers,
  searchContact,
  addContact,
  getContactRequests,
  getMessageRequests,
  getMessageRequestMessages,
  respondToMessageRequest,
  respondToContactRequest,
  declineContactRequest,
  removeContact,
  restoreContact,
  getMessages,
  getMessageDocument,
  downloadMessageMedia,
  markMessagesRead,
  deleteChat,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleStarMessage,
  togglePinMessage,
  toggleMessageReaction,
  forwardMessage,
} from '../controllers/message.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/users', protectRoute, getUsers);
router.get('/contacts/search', protectRoute, searchContact);
router.get('/contacts/requests', protectRoute, getContactRequests);
router.get('/contacts/message-requests', protectRoute, getMessageRequests);
router.get('/contacts/message-requests/:userId/messages', protectRoute, getMessageRequestMessages);
router.patch('/contacts/message-requests/:userId', protectRoute, respondToMessageRequest);
router.delete('/contacts/message-requests/:userId', protectRoute, respondToMessageRequest);
router.patch('/contacts/requests/:requestId/accept', protectRoute, respondToContactRequest);
router.delete('/contacts/requests/:requestId', protectRoute, declineContactRequest);
router.post('/contacts', protectRoute, addContact);
router.post('/contacts/restore/:userId', protectRoute, restoreContact);
router.delete('/contacts/:userId', protectRoute, removeContact);

// Use a distinct path for clearing a conversation so it cannot be mistaken for a message ID.
router.delete('/clear-chat/:userId', protectRoute, deleteChat);
router.get('/:messageId/document', protectRoute, getMessageDocument);
router.get('/:messageId/download', protectRoute, downloadMessageMedia);
router.get('/:userId', protectRoute, getMessages);
router.patch('/:userId/read', protectRoute, markMessagesRead);
router.delete('/:messageId', protectRoute, deleteMessage);

router.post('/send/:userId', protectRoute, sendMessage);
router.post('/:messageId/forward', protectRoute, forwardMessage);
router.patch('/:messageId/star', protectRoute, toggleStarMessage);
router.patch('/:messageId/pin', protectRoute, togglePinMessage);
router.patch('/:messageId/react', protectRoute, toggleMessageReaction);
router.put('/:messageId', protectRoute, editMessage);

export default router;
