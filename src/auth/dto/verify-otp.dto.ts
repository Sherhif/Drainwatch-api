import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import {
  IsGhanaPhone,
  NormalizeGhanaPhone,
} from '../../common/validators/is-ghana-phone.decorator';

export class VerifyOtpDto {
  @ApiProperty({
    example: '233501234567',
    description: 'Accepts 233XXXXXXXXX or +233XXXXXXXXX; normalized before OTP verification.',
  })
  @NormalizeGhanaPhone()
  @IsGhanaPhone()
  phone_number: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'otp_code must be a 6 digit number',
  })
  otp_code: string;
}
