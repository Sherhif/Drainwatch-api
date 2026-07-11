import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JobSeverity } from '../enums/job-severity.enum';

export class CreateJobDto {
  @ApiProperty({
    example: 5.6037,
    description: 'Auto-captured latitude from the reporting device.',
  })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({
    example: -0.187,
    description: 'Auto-captured longitude from the reporting device.',
  })
  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @ApiProperty({ enum: JobSeverity, example: JobSeverity.Moderate })
  @IsEnum(JobSeverity)
  severity: JobSeverity;

  @ApiPropertyOptional({
    example: 'Drain beside the market is blocked with plastic waste.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/report-photo.jpg',
    description:
      'Development fallback when multipart photo upload is not used.',
  })
  @IsOptional()
  @IsString()
  report_photo_url?: string;
}
