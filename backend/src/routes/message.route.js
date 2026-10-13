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
  getMessages,
  deleteChat,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleStarMessage,
  togglePinMessage,
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
router.delete('/contacts/:userId', protectRoute, removeContact);
router.get('/:userId', protectRoute, getMessages);
router.delete('/:userId', protectRoute, deleteChat);
router.post('/send/:userId', protectRoute, sendMessage);
router.post('/:messageId/forward', protectRoute, forwardMessage);
router.patch('/:messageId/star', protectRoute, toggleStarMessage);
router.patch('/:messageId/pin', protectRoute, togglePinMessage);
router.put('/:messageId', protectRoute, editMessage);
router.delete('/:messageId', protectRoute, deleteMessage);

export default router;
