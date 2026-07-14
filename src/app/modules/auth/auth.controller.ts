import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import config from '../../config';
import { AuthService } from './auth.service';

const getRequestMeta = (req: import('express').Request) => {
  let ip =
    req.ip ||
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    '';
  if (Array.isArray(ip)) ip = ip[0];
  return { ipAddress: ip, userAgent: req.get('User-Agent') || '' };
};

const setRefreshTokenCookie = (
  res: import('express').Response,
  refreshToken: string,
) => {
  res.cookie('refreshToken', refreshToken, {
    secure: config.node_env === 'production',
    httpOnly: true,
    sameSite: 'lax',
  });
};

const signup = catchAsync(async (req, res) => {
  const result = await AuthService.signup(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Account created! Check your email for the verification code.',
    data: result,
  });
});

const verifyEmailOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const { accessToken, refreshToken, user } = await AuthService.verifyEmailOtp(
    email,
    otp,
    ipAddress,
    userAgent,
  );

  setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Email verified successfully!',
    data: { accessToken, user },
  });
});

const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.resendOtp(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'A new verification code has been sent to your email.',
    data: result,
  });
});

const login = catchAsync(async (req, res) => {
  const { ipAddress, userAgent } = getRequestMeta(req);
  const { accessToken, refreshToken, user } = await AuthService.login(
    req.body,
    ipAddress,
    userAgent,
  );

  setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged in successfully!',
    data: { accessToken, user },
  });
});

// const demoLogin = catchAsync(async (req, res) => {
//   const { ipAddress, userAgent } = getRequestMeta(req);
//   const { accessToken, refreshToken, user } = await AuthService.demoLogin(ipAddress, userAgent);

//   setRefreshTokenCookie(res, refreshToken);

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: 'Logged in with demo account!',
//     data: { accessToken, user },
//   });
// });

const googleLogin = catchAsync(async (req, res) => {
  const { ipAddress, userAgent } = getRequestMeta(req);
  const { accessToken, refreshToken, user } = await AuthService.googleLogin(
    req.body.idToken,
    ipAddress,
    userAgent,
  );

  setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged in with Google successfully!',
    data: { accessToken, user },
  });
});

const getMe = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await AuthService.getMe(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile retrieved successfully!',
    data: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.cookies;
  const { ipAddress, userAgent } = getRequestMeta(req);

  const result = await AuthService.refreshToken(token, ipAddress, userAgent);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token retrieved successfully!',
    data: result,
  });
});

const logout = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.cookies;
  const result = await AuthService.logout(token);

  res.clearCookie('refreshToken', {
    secure: config.node_env === 'production',
    httpOnly: true,
    sameSite: 'lax',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged out successfully!',
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await AuthService.changePassword(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      'Password changed successfully. All sessions have been logged out — please login again.',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.forgetPassword(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  const result = await AuthService.resetPassword(req.body, token!);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password reset successful! Please login with your new password.',
    data: result,
  });
});

export const AuthController = {
  signup,
  verifyEmailOtp,
  resendOtp,
  login,
  // demoLogin,
  googleLogin,
  getMe,
  refreshToken,
  logout,
  changePassword,
  forgetPassword,
  resetPassword,
};
