import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DisputeResolution } from '../../jobs/enums/dispute-resolution.enum';

export class ResolveDisputeDto {
  @ApiProperty({
    enum: DisputeResolution,
    example: DisputeResolution.Released,
  })
  @IsEnum(DisputeResolution)
  resolution: DisputeResolution;

  @ApiPropertyOptional({
    example: 80,
    description: 'Required when resolution is partial. Amount paid to worker.',
  })
  @ValidateIf(
    (dto: ResolveDisputeDto) => dto.resolution === DisputeResolution.Partial,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  partial_amount?: number;

  @ApiPropertyOptional({
    example: 'After photo confirms most of the work was done.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
