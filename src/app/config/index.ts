import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT || 5001,
  database_url: process.env.DATABASE_URL,
  // smsApiKey: process.env.SMS_API_KEY,

  nodemailerUser: process.env.NODEMAILER_USER,
  nodemailerPass: process.env.NODEMAILER_PASS,

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,

  bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  resetPassUILink: process.env.RESET_PASS_UI_LINK,
  invitationUILink: process.env.INVITATION_UI_LINK,
  frontendUrls: process.env.FRONTEND_URLS,

  // buildVersion: process.env.BUILD_VERSION || '1',
};
