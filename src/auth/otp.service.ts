import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { OtpCode } from './entities/otp-code.entity';

@Injectable()
export class OtpService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(OtpCode)
    private readonly otpCodesRepository: Repository<OtpCode>,
  ) {}

  async create(phoneNumber: string) {
    const recentOtp = await this.getLatestActiveOtp(phoneNumber);

    if (recentOtp && recentOtp.createdAt.getTime() > Date.now() - 30_000) {
      throw new HttpException(
        'Please wait before requesting another OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.otpCodesRepository.create({
      phoneNumber,
      otpCode: String(randomInt(100000, 999999)),
      expiresAt: new Date(Date.now() + 5 * 60_000),
      consumedAt: null,
    });

    return this.otpCodesRepository.save(otp);
  }

  async verify(phoneNumber: string, otpCode: string) {
    const otp = await this.getLatestActiveOtp(phoneNumber);

    if (this.isOtpBypassEnabled()) {
      if (otp) {
        otp.consumedAt = new Date();
        await this.otpCodesRepository.save(otp);
      }

      return;
    }

    if (!otp || otp.otpCode !== otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP code has expired');
    }

    otp.consumedAt = new Date();
    await this.otpCodesRepository.save(otp);
  }

  async consume(otp: OtpCode) {
    otp.consumedAt = new Date();
    return this.otpCodesRepository.save(otp);
  }

  private getLatestActiveOtp(phoneNumber: string) {
    return this.otpCodesRepository.findOne({
      where: { phoneNumber, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  private isOtpBypassEnabled() {
    return this.configService.get<boolean>('auth.otpBypassEnabled') === true;
  }
}
