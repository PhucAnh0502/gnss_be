import express from 'express';
import {register, login, forgotPassword, verifyResetOtp, changePassword, resetPassword} from '../controllers/authController.js'
import { registerValidator, loginValidator, forgotPasswordValidator, verifyResetOtpValidator, changePasswordValidator, resetPasswordValidator } from '../middlewares/authValidation.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.post('/verify-reset-otp', verifyResetOtpValidator, verifyResetOtp);
router.put('/reset-password', resetPasswordValidator, resetPassword);
router.put('/change-password', authenticateToken, changePasswordValidator, changePassword);


export default router;