import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DisputeJobDto {
  @ApiProperty({
    example:
      'The drain was only partially cleared and still blocks water flow.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason: string;
}
