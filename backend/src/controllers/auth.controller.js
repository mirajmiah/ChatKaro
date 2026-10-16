import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import cloudinary from '../lib/cloudinary.js';
import { emitToAll } from '../lib/socket.js';
import { sendOtpEmail } from '../lib/email.js';

const COOKIE_NAME = 'nexus-jwt';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const hashOtp = (otp) => crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(otp)
  .digest('hex');

const signToken = (user) =>
  jwt.sign(
    { userId: user._id.toString(), tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const setCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
  });
};

export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (
      typeof fullName !== 'string' || !fullName.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password
    ) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });
    if (user?.emailVerified) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    const hashedPassword = await bcryptjs.hash(password, 12);
    const otp = crypto.randomInt(100000, 1000000).toString();
    if (!user) {
      user = new User({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: false,
      });
    }
    user.signupOtpHash = hashOtp(otp);
    user.signupOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      await sendOtpEmail(user.email, otp, 'signup');
    } catch (error) {
      console.error('signup verification email error:', error.message);
      user.signupOtpHash = undefined;
      user.signupOtpExpires = undefined;
      await user.save();
      return res.status(503).json({ message: 'We could not send your verification email. The email service is currently unavailable; please try again later.' });
    }

    return res.status(200).json({
      message: 'A verification code was sent to your email.',
      verificationRequired: true,
      email: user.email,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email is already in use.' });
    }
    console.error('signup error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Enter a valid six-digit verification code.' });
    }
    if (!fullName || fullName.length > 80 || password.length < 6) {
      return res.status(400).json({ message: 'Enter a valid name and a password with at least 6 characters.' });
    }

    const otpHash = hashOtp(otp);
    const user = await User.findOne({
      email,
      emailVerified: false,
      signupOtpHash: otpHash,
      signupOtpExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification code.' });

    user.fullName = fullName;
    user.password = await bcryptjs.hash(password, 12);
    user.emailVerified = true;
    user.signupOtpHash = undefined;
    user.signupOtpExpires = undefined;
    user.lastSeen = new Date();
    await user.save();
    setCookie(res, signToken(user));

    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('verifySignupOtp error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const resendSignupOtp = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const user = email ? await User.findOne({ email, emailVerified: false }) : null;
    if (!user) return res.status(404).json({ message: 'Unverified signup not found. Please create your account again.' });

    const otp = crypto.randomInt(100000, 1000000).toString();
    user.signupOtpHash = hashOtp(otp);
    user.signupOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    try {
      await sendOtpEmail(user.email, otp, 'signup');
    } catch (error) {
      console.error('resend signup verification email error:', error.message);
      user.signupOtpHash = undefined;
      user.signupOtpExpires = undefined;
      await user.save();
      return res.status(503).json({ message: 'We could not send your verification email. The email service is currently unavailable; please try again later.' });
    }
    return res.status(200).json({ message: 'A new verification code was sent to your email.' });
  } catch (error) {
    console.error('resendSignupOtp error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    const isMatch = user ? await bcryptjs.compare(password, user.password) : false;

    if (!user || !isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Please verify your email before signing in.' });
    }

    user.lastSeen = new Date();
    user.save().catch((err) => console.error('lastSeen save error:', err.message));

    const token = signToken(user);
    setCookie(res, token);

    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('login error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ message: 'Google authentication is not configured.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified || !payload.sub) {
      return res.status(401).json({ message: 'Google email is not verified.' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        profilePic: payload.picture || '',
        password: await bcryptjs.hash(crypto.randomBytes(32).toString('hex'), 12),
      });
    } else {
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({ message: 'This account is linked to another Google account.' });
      }
      if (!user.emailVerified) {
        user.password = await bcryptjs.hash(crypto.randomBytes(32).toString('hex'), 12);
      }
      user.googleId = payload.sub;
      user.emailVerified = true;
      user.signupOtpHash = undefined;
      user.signupOtpExpires = undefined;
      user.lastSeen = new Date();
      if (!user.profilePic && payload.picture) user.profilePic = payload.picture;
      await user.save();
    }

    setCookie(res, signToken(user));

    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('googleLogin error:', error.message);
    return res.status(401).json({ message: 'Google authentication failed.' });
  }
};

export const logout = (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.status(200).json({ message: 'Logged out.' });
};

export const checkAuth = (req, res) => {
  return res.status(200).json(req.user);
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;

    if (!profilePic) {
      return res.status(400).json({ message: 'Profile picture is required.' });
    }

    if (typeof profilePic !== 'string' || !profilePic.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Choose a valid image file.' });
    }

    if (profilePic.length > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'Profile picture must be smaller than 5MB.' });
    }

    const uploadResult = await cloudinary.uploader.upload(profilePic, {
      folder: 'nexus-chat/avatars',
      resource_type: 'image',
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: uploadResult.secure_url },
      { new: true }
    ).select('-password');

    emitToAll('profileUpdated', {
      _id: user._id.toString(),
      profilePic: user.profilePic,
    });
    return res.status(200).json(user);
  } catch (error) {
    console.error('updateProfile error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateBio = async (req, res) => {
  try {
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : null;

    if (bio === null) {
      return res.status(400).json({ message: 'About me must be text.' });
    }
    if (bio.length > 600) {
      return res.status(400).json({ message: 'About me must be 600 characters or fewer.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { bio },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json(user);
  } catch (error) {
    console.error('updateBio error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateName = async (req, res) => {
  try {
    const { fullName } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName: fullName.trim() },
      { new: true }
    ).select('-password');

    return res.status(200).json(user);
  } catch (error) {
    console.error('updateName error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const forgotPassword = async (req, res) => {
  const response = {
    message: 'If an account exists for that email, reset instructions have been sent.',
  };

  try {
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const user = email ? await User.findOne({ email }) : null;

    if (user) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      user.resetPasswordOtpHash = hashOtp(otp);
      user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      try {
        await sendOtpEmail(user.email, otp, 'passwordReset');
      } catch (error) {
        console.error('password reset email error:', error.message);
        user.resetPasswordOtpHash = undefined;
        user.resetPasswordOtpExpires = undefined;
        await user.save();
        return res.status(503).json({ message: 'We could not send your password reset email. The email service is currently unavailable; please try again later.' });
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('forgotPassword error:', error.message);
    return res.status(500).json({ message: 'Unable to request a password reset.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const emailAddress = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const hashedOtp = hashOtp(String(otp || ''));

    const user = await User.findOne({
      email: emailAddress,
      resetPasswordOtpHash: hashedOtp,
      resetPasswordOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    user.password = await bcryptjs.hash(password, 12);
    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.tokenVersion += 1;
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully. Please log in again.' });
  } catch (error) {
    console.error('resetPassword error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
