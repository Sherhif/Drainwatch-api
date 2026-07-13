import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  otpBypassEnabled:
    process.env.OTP_BYPASS_ENABLED !== undefined
      ? process.env.OTP_BYPASS_ENABLED === 'true'
      : ['development', 'test'].includes(process.env.NODE_ENV ?? 'development'),
}));
