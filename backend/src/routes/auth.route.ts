import { Router } from 'express';
import {
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/auth/postRequests.controller.js';
import { logout } from '../controllers/auth/updateRequests.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();



router.post('/login', login);

// Public: opened from email links, the person isn't logged in.
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword); // employees only
router.post('/reset-password', resetPassword); // employees only
router.patch('/logout',authMiddleware, logout);
router.get("/ping", (req, res) => {
  res.status(200).json({ message: "Service is awake and responding." });
});
export default router;