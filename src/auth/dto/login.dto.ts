import { ApiProperty } from '@nestjs/swagger';
import { IsGhanaPhone } from '../../common/validators/is-ghana-phone.decorator';

export class LoginDto {
  @ApiProperty({ example: '+233501234567' })
  @IsGhanaPhone()
  phone_number: string;
}
