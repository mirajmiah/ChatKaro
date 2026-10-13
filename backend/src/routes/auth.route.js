import express from 'express';
import {
  signup,
  login,
  googleLogin,
  logout,
  checkAuth,
  updateProfile,
  updateBio,
  updateName,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleLogin);
router.post('/logout', logout);
router.put('/update-name', protectRoute, updateName);
router.get('/check', protectRoute, checkAuth);
router.put('/update-profile', protectRoute, updateProfile);
router.put('/update-bio', protectRoute, updateBio);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;
