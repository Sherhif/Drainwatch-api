import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { presentUser } from '../users/users.presenter';
import { UserRole } from '../users/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';
import { JwtUser } from './types/jwt-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create({
      fullName: registerDto.full_name,
      phoneNumber: registerDto.phone_number,
      roles: this.normalizeRoles(registerDto),
    });

    return {
      user: presentUser(user),
      auth_token: await this.signUserToken(
        user.id,
        user.phoneNumber,
        user.roles,
      ),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByPhoneNumber(
      loginDto.phone_number,
    );

    if (!user) {
      throw new NotFoundException('No user found for this phone number');
    }

    const otp = await this.otpService.create(loginDto.phone_number);

    return {
      message: 'OTP sent',
      phone_number: loginDto.phone_number,
      ...(this.shouldExposeOtp() ? { otp_code: otp.otpCode } : {}),
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    await this.otpService.verify(
      verifyOtpDto.phone_number,
      verifyOtpDto.otp_code,
    );

    const user = await this.usersService.findByPhoneNumber(
      verifyOtpDto.phone_number,
    );

    if (!user) {
      throw new BadRequestException('Cannot verify OTP for an unknown user');
    }

    return {
      user: presentUser(user),
      auth_token: await this.signUserToken(
        user.id,
        user.phoneNumber,
        user.roles,
      ),
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return presentUser(user);
  }

  async issueTokenForUser(user: User) {
    return this.signUserToken(user.id, user.phoneNumber, user.roles);
  }

  private signUserToken(
    userId: string,
    phoneNumber: string,
    roles: JwtUser['roles'],
  ) {
    return this.jwtService.signAsync({
      sub: userId,
      phone_number: phoneNumber,
      roles,
    });
  }

  private normalizeRoles(registerDto: RegisterDto) {
    return registerDto.roles?.length
      ? registerDto.roles
      : [registerDto.role ?? UserRole.Reporter];
  }

  private shouldExposeOtp() {
    return this.configService.get<string>('app.nodeEnv') !== 'production';
  }
}
