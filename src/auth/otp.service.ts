import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';
import { OtpCode } from './entities/otp-code.entity';

@Injectable()
export class OtpService {
  private readonly otpCodes = new Map<string, OtpCode[]>();

  create(phoneNumber: string) {
    const recentOtp = this.getLatestActiveOtp(phoneNumber);

    if (recentOtp && recentOtp.createdAt.getTime() > Date.now() - 30_000) {
      throw new HttpException(
        'Please wait before requesting another OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = new OtpCode();
    otp.id = randomUUID();
    otp.phoneNumber = phoneNumber;
    otp.otpCode = String(randomInt(100000, 999999));
    otp.expiresAt = new Date(Date.now() + 5 * 60_000);
    otp.consumedAt = null;
    otp.createdAt = new Date();

    const userOtps = this.otpCodes.get(phoneNumber) ?? [];
    userOtps.push(otp);
    this.otpCodes.set(phoneNumber, userOtps);

    return otp;
  }

  verify(phoneNumber: string, otpCode: string) {
    const otp = this.getLatestActiveOtp(phoneNumber);

    if (!otp || otp.otpCode !== otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP code has expired');
    }

    otp.consumedAt = new Date();
  }

  private getLatestActiveOtp(phoneNumber: string) {
    const userOtps = this.otpCodes.get(phoneNumber) ?? [];

    return [...userOtps].reverse().find((otp) => !otp.consumedAt);
  }
}
