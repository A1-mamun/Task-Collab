import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import Auth from '../../middlewares/auth';
import { AuthValidation } from './auth.validation';
import { AuthController } from './auth.controller';

const router = Router();

router.post(
  '/signup',
  validateRequest(AuthValidation.SignupSchema),
  AuthController.signup,
);

router.post(
  '/verify-email-otp',
  validateRequest(AuthValidation.VerifyEmailOtpSchema),
  AuthController.verifyEmailOtp,
);

router.post(
  '/resend-otp',
  validateRequest(AuthValidation.ResendOtpSchema),
  AuthController.resendOtp,
);

router.post(
  '/login',
  validateRequest(AuthValidation.LoginSchema),
  AuthController.login,
);

// router.post('/demo-login', AuthController.demoLogin);

router.post(
  '/google',
  validateRequest(AuthValidation.GoogleLoginSchema),
  AuthController.googleLogin,
);

router.get('/me', Auth(), AuthController.getMe);

router.post(
  '/refresh-token',
  validateRequest(AuthValidation.RefreshTokenSchema),
  AuthController.refreshToken,
);

router.post('/logout', Auth(), AuthController.logout);

router.post(
  '/change-password',
  Auth(),
  validateRequest(AuthValidation.ChangePasswordSchema),
  AuthController.changePassword,
);

router.post(
  '/forget-password',
  validateRequest(AuthValidation.ForgetPasswordSchema),
  AuthController.forgetPassword,
);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.ResetPasswordSchema),
  AuthController.resetPassword,
);

export const AuthRoutes = router;
