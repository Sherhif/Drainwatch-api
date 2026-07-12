import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  IsGhanaPhone,
  NormalizeGhanaPhone,
} from '../../common/validators/is-ghana-phone.decorator';
import { UserRole } from '../../users/enums/user-role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Ama Mensah' })
  @IsString()
  @MinLength(2)
  full_name: string;

  @ApiProperty({
    example: '233501234567',
    description: 'Accepts 233XXXXXXXXX or +233XXXXXXXXX; stored as +233XXXXXXXXX.',
  })
  @NormalizeGhanaPhone()
  @IsGhanaPhone()
  phone_number: string;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.Reporter],
    description: 'A user may hold multiple roles.',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @ApiProperty({
    enum: UserRole,
    example: UserRole.Reporter,
    description: 'PRD-compatible single-role shortcut.',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
