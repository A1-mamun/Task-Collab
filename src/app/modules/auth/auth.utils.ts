import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../../config';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { sendEmail } from '../../utils/sendEmail';
import { generateOtp } from '../../utils/generateOtp';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, Number(config.bcryptSaltRounds));
};

export const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export type TJwtPayload = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Signs a JWT and wraps it in base64 (matching the existing pentamart-backend
 * convention), so tokens leaving the server never expose the raw JWT.
 */
export const createToken = (
  payload: TJwtPayload,
  secret: string,
  expiresIn: string,
): string => {
  const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  return Buffer.from(token).toString('base64');
};

export const verifyToken = (
  base64Token: string,
  secret: string,
): JwtPayload => {
  const token = Buffer.from(base64Token, 'base64').toString('utf-8');

  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    if ((error as Error).name === 'TokenExpiredError') {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'This link/token has expired',
      );
    }
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired token');
  }
};

/**
 * Generates a 6-digit OTP, stores it against the user, and emails it.
 * Any previously issued (unused) OTPs for this email are cleared first so
 * only the latest code is ever valid.
 */
export const sendOtp = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const { otp, expiresAt } = generateOtp();

  await prisma.otp.deleteMany({ where: { email } });
  await prisma.otp.create({ data: { userId: user.id, email, otp, expiresAt } });

  const html = `<p>Your verification code is: <strong>${otp}</strong>. Don't share this code with anyone. It is valid for 5 minutes only.</p>`;

  await sendEmail(
    email,
    'Verify your email',
    `Your verification code is ${otp}. It is valid for 5 minutes.`,
    html,
  );

  return { message: 'OTP sent successfully' };
};

/**
 * Validates an OTP against the latest one issued for the email, then
 * consumes it (deletes it) so it cannot be reused.
 */
export const verifyOtpCode = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const record = await prisma.otp.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.otp.deleteMany({ where: { email } });
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'OTP expired. Please request a new one.',
    );
  }

  if (record.otp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  await prisma.otp.deleteMany({ where: { email } });

  return user;
};

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days fallback

/**
 * Persists a refresh token as a Session row so it can be looked up,
 * rotated, or revoked later (logout, password change/reset).
 */
export const createSession = async (
  userId: string,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  // Keep at most 5 active sessions per user; revoke the oldest if exceeded.
  const activeSessionCount = await prisma.session.count({
    where: { userId, isRevoked: false },
  });

  if (activeSessionCount >= 5) {
    const oldest = await prisma.session.findFirst({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'asc' },
    });

    if (oldest) {
      await prisma.session.update({
        where: { id: oldest.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'Session limit exceeded',
        },
      });
    }
  }

  return prisma.session.create({
    data: {
      userId,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
};

export const revokeSessionByRefreshToken = async (
  refreshToken: string,
  reason: string,
) => {
  await prisma.session.updateMany({
    where: { refreshToken, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
  });
};

export const revokeAllUserSessions = async (userId: string, reason: string) => {
  await prisma.session.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
  });
};
