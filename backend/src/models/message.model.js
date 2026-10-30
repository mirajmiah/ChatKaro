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
    audio: {
      type: String,
    },
    audioDuration: {
      type: Number,
    },
    document: {
      type: String,
    },
    documentName: {
      type: String,
      maxlength: 255,
    },
    clientMessageId: {
      type: String,
      index: true,
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
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    read: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        emoji: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ senderId: 1, receiverId: 1, clientMessageId: 1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
