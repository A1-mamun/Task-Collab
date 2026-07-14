import { randomInt } from 'crypto';

export const generateOtp = () => {
  const otp = randomInt(100000, 999999).toString(); // 6-digit
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // valid for 5 minutes

  return { otp, expiresAt };
};
