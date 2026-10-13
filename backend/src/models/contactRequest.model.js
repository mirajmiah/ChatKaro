import mongoose from 'mongoose';

const contactRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'pending',
    },
    acceptedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

contactRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });
contactRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });

const ContactRequest = mongoose.model('ContactRequest', contactRequestSchema);

export default ContactRequest;
