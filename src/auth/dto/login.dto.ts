import { ApiProperty } from '@nestjs/swagger';
import {
  IsGhanaPhone,
  NormalizeGhanaPhone,
} from '../../common/validators/is-ghana-phone.decorator';

export class LoginDto {
  @ApiProperty({
    example: '233501234567',
    description: 'Accepts 233XXXXXXXXX or +233XXXXXXXXX; normalized before lookup.',
  })
  @NormalizeGhanaPhone()
  @IsGhanaPhone()
  phone_number: string;
}
