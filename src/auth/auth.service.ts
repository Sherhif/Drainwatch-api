import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service';
import { presentUser } from '../users/users.presenter';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { OtpCode } from './entities/otp-code.entity';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';
import { JwtUser } from './types/jwt-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
  ) {}

  async register(registerDto: RegisterDto) {
    const roles = this.normalizeRoles(registerDto);
    const existingUser = await this.usersService.findByPhoneNumber(
      registerDto.phone_number,
    );

    if (existingUser?.status === UserStatus.Active) {
      throw new ConflictException(
        'A user with this phone number already exists. Please log in.',
      );
    }

    if (existingUser?.status === UserStatus.Suspended) {
      throw new ForbiddenException('This account is suspended');
    }

    const user = existingUser
      ? await this.usersService.updatePendingRegistration(existingUser, {
          fullName: registerDto.full_name,
          roles,
        })
      : await this.usersService.create({
          fullName: registerDto.full_name,
          phoneNumber: registerDto.phone_number,
          roles,
          status: UserStatus.PendingVerification,
        });

    const otp = await this.otpService.create(user.phoneNumber);
    await this.sendOtpOrFail(user, otp);

    return {
      message: 'OTP sent',
      phone_number: user.phoneNumber,
      user: presentUser(user),
      ...(this.shouldExposeOtp() ? { otp_code: otp.otpCode } : {}),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByPhoneNumber(
      loginDto.phone_number,
    );

    if (!user) {
      throw new NotFoundException('No user found for this phone number');
    }

    this.assertCanAuthenticate(user);

    const otp = await this.otpService.create(loginDto.phone_number);
    await this.sendOtpOrFail(user, otp);

    return {
      message: 'OTP sent',
      phone_number: loginDto.phone_number,
      ...(this.shouldExposeOtp() ? { otp_code: otp.otpCode } : {}),
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.usersService.findByPhoneNumber(
      verifyOtpDto.phone_number,
    );

    if (!user) {
      throw new BadRequestException('Cannot verify OTP for an unknown user');
    }

    this.assertCanAuthenticate(user);

    await this.otpService.verify(
      verifyOtpDto.phone_number,
      verifyOtpDto.otp_code,
    );

    const verifiedUser =
      user.status === UserStatus.PendingVerification
        ? await this.usersService.activate(user)
        : user;

    return {
      user: presentUser(verifiedUser),
      auth_token: await this.signUserToken(
        verifiedUser.id,
        verifiedUser.phoneNumber,
        verifiedUser.roles,
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
    this.assertCanAuthenticate(user);
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
    return ['development', 'test'].includes(
      this.configService.get<string>('app.nodeEnv') ?? 'development',
    );
  }

  private async sendOtpOrFail(user: User, otp: OtpCode) {
    const smsLog = await this.notificationsService.sendOtp(user, otp.otpCode);

    if (
      !this.configService.get<boolean>('auth.otpBypassEnabled') &&
      smsLog.status !== 'sent'
    ) {
      await this.otpService.consume(otp);
      throw new BadGatewayException('Unable to send OTP. Please try again.');
    }
  }

  private assertCanAuthenticate(user: User) {
    if (user.status === UserStatus.Suspended) {
      throw new ForbiddenException('This account is suspended');
    }
  }
}
