import { Router } from 'express';
import { login } from '../controllers/auth/postRequests.controller.js';
import { logout } from '../controllers/auth/updateRequests.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();



router.post('/login', login);

router.patch('/logout',authMiddleware, logout);
router.get("/ping", (req, res) => {
  res.status(200).json({ message: "Service is awake and responding." });
});
export default router;