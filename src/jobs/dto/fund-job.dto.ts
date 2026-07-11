import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';

export class FundJobDto {
  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'GHS', default: 'GHS' })
  @IsOptional()
  @IsIn(['GHS'])
  currency?: string;
}
