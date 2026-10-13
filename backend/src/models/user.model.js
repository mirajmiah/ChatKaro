import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: 600,
      trim: true,
    },
    contacts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    hiddenContacts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    resetPasswordOtpHash: String,
    resetPasswordOtpExpires: Date,
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
