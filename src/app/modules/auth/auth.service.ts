/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import httpStatus from 'http-status';
import { OAuth2Client } from 'google-auth-library';
import config from '../../config';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { sendEmail } from '../../utils/sendEmail';
import {
  comparePassword,
  createSession,
  createToken,
  hashPassword,
  revokeAllUserSessions,
  revokeSessionByRefreshToken,
  sendOtp,
  verifyOtpCode,
  verifyToken,
} from './auth.utils';
import {
  TChangePassword,
  TLogin,
  TResetPassword,
  TSignup,
} from './auth.validation';

const googleClient = new OAuth2Client(config.googleClientId);

const sanitizeUser = <T extends { password?: string | null }>(user: T) => {
  const { password: _password, ...rest } = user;
  return rest;
};

/**
 * Signs a fresh access + refresh token pair for a user and persists the
 * refresh token as a Session so it can be revoked later.
 */
const issueTokensAndSession = async (
  user: { id: string; name: string; email: string; role: string },
  ipAddress?: string,
  userAgent?: string,
) => {
  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwtAccessSecret as string,
    config.jwtAccessExpiresIn as string,
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwtRefreshSecret as string,
    config.jwtRefreshExpiresIn as string,
  );

  await createSession(user.id, refreshToken, ipAddress, userAgent);

  return { accessToken, refreshToken };
};

/**
 * Creates the account (unverified) and emails a 6-digit OTP. No tokens are
 * issued yet — the account must be verified via verifyEmailOtp first.
 */
const signup = async (payload: TSignup) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser && existingUser.isEmailVerified) {
    throw new AppError(
      httpStatus.CONFLICT,
      'An account with this email already exists. Please login.',
    );
  }

  const hashedPassword = await hashPassword(payload.password);

  let user;
  if (existingUser && !existingUser.isEmailVerified) {
    // Re-registering before verifying: refresh their details and resend OTP.
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: payload.name,
        password: hashedPassword,
        role: payload.role || 'TEAM_MEMBER',
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword,
        role: payload.role || 'TEAM_MEMBER',
      },
    });
  }

  await sendOtp(payload.email);

  return { userId: user.id, email: user.email };
};

const verifyEmailOtp = async (
  email: string,
  otp: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  const user = await verifyOtpCode(email, otp);

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true },
  });

  const { accessToken, refreshToken } = await issueTokensAndSession(
    verifiedUser,
    ipAddress,
    userAgent,
  );

  return { accessToken, refreshToken, user: sanitizeUser(verifiedUser) };
};

const resendOtp = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  if (user.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This email is already verified.',
    );
  }

  return sendOtp(email);
};

const login = async (
  payload: TLogin,
  ipAddress?: string,
  userAgent?: string,
) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invalid email or password');
  }

  if (!user.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This account was created with Google Sign-In. Please continue with Google.',
    );
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Your email is not verified! Please verify your email first.',
    );
  }

  const isPasswordMatch = await comparePassword(
    payload.password,
    user.password,
  );

  if (!isPasswordMatch) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  const { accessToken, refreshToken } = await issueTokensAndSession(
    user,
    ipAddress,
    userAgent,
  );

  return { accessToken, refreshToken, user: sanitizeUser(user) };
};

/**
 * Seeds (if needed) and logs into a fixed, pre-verified demo account so the
 * frontend's "Demo Login" button always works out of the box.
 */
// const demoLogin = async (ipAddress?: string, userAgent?: string) => {
//   let user = await prisma.user.findUnique({
//     where: { email: config.demoEmail },
//   });

//   if (!user) {
//     const hashedPassword = await hashPassword(config.demoPassword);
//     user = await prisma.user.create({
//       data: {
//         name: 'Demo User',
//         email: config.demoEmail,
//         password: hashedPassword,
//         role: 'PROJECT_MANAGER',
//         isEmailVerified: true,
//       },
//     });
//   }

//   const { accessToken, refreshToken } = await issueTokensAndSession(
//     user,
//     ipAddress,
//     userAgent,
//   );

//   return { accessToken, refreshToken, user: sanitizeUser(user) };
// };

/**
 * Verifies a Google ID token (obtained on the frontend via NextAuth /
 * betterAuth Google provider) and issues our own access token, creating
 * the user on first sign-in. Google-authenticated emails are trusted as
 * already verified.
 */
const googleLogin = async (
  idToken: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  if (!config.googleClientId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Google login is not configured on the server.',
    );
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
  } catch {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid Google token');
  }

  const googlePayload = ticket.getPayload();

  if (!googlePayload?.email) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid Google token');
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: googlePayload.sub }, { email: googlePayload.email }],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: googlePayload.name || googlePayload.email.split('@')[0],
        email: googlePayload.email,
        googleId: googlePayload.sub,
        avatarUrl: googlePayload.picture,
        role: 'TEAM_MEMBER',
        isEmailVerified: true,
      },
    });
  } else if (!user.googleId || !user.isEmailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: googlePayload.sub,
        avatarUrl: user.avatarUrl || googlePayload.picture,
        isEmailVerified: true,
      },
    });
  }

  if (user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This account has been deactivated.',
    );
  }

  const { accessToken, refreshToken } = await issueTokensAndSession(
    user,
    ipAddress,
    userAgent,
  );

  return { accessToken, refreshToken, user: sanitizeUser(user) };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return sanitizeUser(user);
};

const refreshTokenService = async (
  token: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  const decoded = verifyToken(token, config.jwtRefreshSecret as string);
  const { userId, iat } = decoded;

  const session = await prisma.session.findUnique({
    where: { refreshToken: token },
  });

  if (!session || session.isRevoked) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized! Please login again.',
    );
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await revokeSessionByRefreshToken(token, 'Expired');
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Session expired! Please login again.',
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (
    user.passwordChangedAt &&
    (iat as number) < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    await revokeSessionByRefreshToken(
      token,
      'Password changed after token was issued',
    );
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  }

  const accessToken = createToken(
    { userId: user.id, name: user.name, email: user.email, role: user.role },
    config.jwtAccessSecret as string,
    config.jwtAccessExpiresIn as string,
  );

  // touch the session so `updatedAt`-style tracking stays accurate
  await prisma.session.update({
    where: { id: session.id },
    data: {
      ipAddress: ipAddress || session.ipAddress,
      userAgent: userAgent || session.userAgent,
    },
  });

  return { accessToken };
};

const logout = async (refreshToken?: string) => {
  if (refreshToken) {
    await revokeSessionByRefreshToken(refreshToken, 'User logged out');
  }
  return { loggedOut: true };
};

const changePassword = async (userId: string, payload: TChangePassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.password) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const isPasswordMatch = await comparePassword(
    payload.oldPassword,
    user.password,
  );

  if (!isPasswordMatch) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Old password is incorrect');
  }

  const hashedNewPassword = await hashPassword(payload.newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword, passwordChangedAt: new Date() },
  });

  // Force re-login everywhere else — every existing access/refresh token is invalidated.
  await revokeAllUserSessions(userId, 'Password changed');

  return sanitizeUser(updatedUser);
};

/**
 * Emails a short-lived (10 minute) reset link containing a signed token.
 * No OTP is used here — a clickable link is simpler and safer for an
 * email-only flow (see verifyEmailOtp for the OTP-based signup flow).
 */
const forgetPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted!');
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your email is not verified! Please verify your email first.',
    );
  }

  const resetToken = createToken(
    { userId: user.id, name: user.name, email: user.email, role: user.role },
    config.jwtAccessSecret as string,
    '10m',
  );

  const resetLink = `${config.resetPassUILink}?id=${user.id}&token=${resetToken}`;

  await sendEmail(
    user.email,
    'Reset your password',
    `Reset your password within 10 minutes: ${resetLink}`,
    `<p>Click the link below to reset your password. This link expires in 10 minutes.</p>
     <p><a href="${resetLink}">Reset your password</a></p>`,
  );

  return { message: 'Password reset link sent to your email.' };
};

const resetPassword = async (payload: TResetPassword, token: string) => {
  const user = await prisma.user.findUnique({ where: { id: payload.id } });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted!');
  }

  const decoded = verifyToken(token, config.jwtAccessSecret as string);

  if (payload.id !== decoded.userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are forbidden!');
  }

  const hashedNewPassword = await hashPassword(payload.newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword, passwordChangedAt: new Date() },
  });

  await revokeAllUserSessions(user.id, 'Password reset');

  return sanitizeUser(updatedUser);
};

export const AuthService = {
  signup,
  verifyEmailOtp,
  resendOtp,
  login,
  // demoLogin,
  googleLogin,
  getMe,
  refreshToken: refreshTokenService,
  logout,
  changePassword,
  forgetPassword,
  resetPassword,
};
