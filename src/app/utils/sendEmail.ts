import nodemailer from 'nodemailer';
import config from '../config';

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string,
) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: config.nodemailerUser,
      pass: config.nodemailerPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: 'Task Collab <no-reply@taskcollab.com>',
    to,
    subject,
    text,
    html,
  });
};
