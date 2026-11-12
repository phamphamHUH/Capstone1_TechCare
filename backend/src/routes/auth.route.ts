import { Router } from 'express';
import {
  checkPasswordLink,
  login,
  refresh,
  setPasswordFromLink,
} from '../controllers/auth/postRequests.controller.js';
import { logout, updateMyAccount } from '../controllers/auth/updateRequests.controller.js';
import { getMyAccount } from '../controllers/auth/getRequests.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import accountMiddleware from '../middlewares/account.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import { loginLimiter, sensitiveAuthLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();



router.post('/login', loginLimiter, login);
router.post('/refresh', sensitiveAuthLimiter, refresh);
// "Set your password" link from the account-created email (public).
router.post('/password-link/check', sensitiveAuthLimiter, checkPasswordLink);
router.post('/password-link', sensitiveAuthLimiter, setPasswordFromLink);

router.patch('/logout',authMiddleware, logout);

// Account settings for any signed-in staff member or patient.
router.get('/me', accountMiddleware, getMyAccount);
router.patch('/me', accountMiddleware, upload.single('image'), updateMyAccount);
router.get("/ping", (req, res) => {
  res.status(200).json({ message: "Service is awake and responding." });
});
export default router;