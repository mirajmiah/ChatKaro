import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    document: {
      type: String,
    },
    documentName: {
      type: String,
      maxlength: 255,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    messageRequestStatus: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    starredBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    pinnedAt: {
      type: Date,
    },
    pinnedUntil: {
      type: Date,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

export default Message;
