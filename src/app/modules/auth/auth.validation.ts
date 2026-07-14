import { z } from 'zod';

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_])[A-Za-z\d@$!%*?&#+\-_]{6,}$/;

const SignupSchema = z.object({
  body: z.object({
    name: z
      .string()
      .nonempty('Name is required')
      .min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .nonempty('Email is required')
      .email('Invalid email address'),
    password: z
      .string()
      .regex(
        passwordRegex,
        'Password must contain at least 1 uppercase, 1 lowercase, 1 number, 1 special character and be at least 6 characters long',
      ),
    // Self-signup can only become a Project Manager or a Team Member.
    // ADMIN accounts are provisioned separately (e.g. seeded or promoted by another admin).
    role: z.enum(['PROJECT_MANAGER', 'TEAM_MEMBER']).optional(),
  }),
});

const LoginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .nonempty('Email is required')
      .email('Invalid email address'),
    password: z.string().nonempty('Password is required'),
  }),
});

const GoogleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().nonempty('Google idToken is required'),
  }),
});

const VerifyEmailOtpSchema = z.object({
  body: z.object({
    email: z
      .string()
      .nonempty('Email is required')
      .email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits long'),
  }),
});

const ResendOtpSchema = z.object({
  body: z.object({
    email: z
      .string()
      .nonempty('Email is required')
      .email('Invalid email address'),
  }),
});

const ChangePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().nonempty('Old password is required'),
    newPassword: z
      .string()
      .regex(
        passwordRegex,
        'Password must contain at least 1 uppercase, 1 lowercase, 1 number, 1 special character and be at least 6 characters long',
      ),
  }),
});

const RefreshTokenSchema = z.object({
  cookies: z.object({
    refreshToken: z.string().nonempty('Refresh token is required!'),
  }),
});

const ForgetPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .nonempty('Email is required')
      .email('Invalid email address'),
  }),
});

const ResetPasswordSchema = z.object({
  body: z.object({
    id: z.string().uuid({ message: 'A valid user id is required!' }),
    newPassword: z
      .string()
      .regex(
        passwordRegex,
        'Password must contain at least 1 uppercase, 1 lowercase, 1 number, 1 special character and be at least 6 characters long',
      ),
  }),
});

export type TSignup = z.infer<typeof SignupSchema>['body'];
export type TLogin = z.infer<typeof LoginSchema>['body'];
export type TChangePassword = z.infer<typeof ChangePasswordSchema>['body'];
export type TResetPassword = z.infer<typeof ResetPasswordSchema>['body'];

export const AuthValidation = {
  SignupSchema,
  LoginSchema,
  GoogleLoginSchema,
  VerifyEmailOtpSchema,
  ResendOtpSchema,
  ChangePasswordSchema,
  RefreshTokenSchema,
  ForgetPasswordSchema,
  ResetPasswordSchema,
};
