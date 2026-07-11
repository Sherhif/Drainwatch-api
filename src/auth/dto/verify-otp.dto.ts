import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { IsGhanaPhone } from '../../common/validators/is-ghana-phone.decorator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+233501234567' })
  @IsGhanaPhone()
  phone_number: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp_code: string;
}
