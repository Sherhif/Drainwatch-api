import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { JobSeverity } from '../enums/job-severity.enum';
import { JobStatus } from '../enums/job-status.enum';

export class GetJobsQueryDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ enum: JobSeverity })
  @IsOptional()
  @IsEnum(JobSeverity)
  severity?: JobSeverity;

  @ApiPropertyOptional({
    example: 5.6037,
    description: 'Latitude used with near_lng and radius for nearby filtering.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  near_lat?: number;

  @ApiPropertyOptional({
    example: -0.187,
    description:
      'Longitude used with near_lat and radius for nearby filtering.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  near_lng?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Nearby search radius in kilometers.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  radius?: number;

  @ApiPropertyOptional({
    example: 'me',
    description:
      'Filter jobs by sponsor id. Use "me" for the authenticated user.',
  })
  @IsOptional()
  @IsString()
  sponsor_id?: string;

  @ApiPropertyOptional({
    example: 'me',
    description:
      'Filter jobs by worker id. Use "me" for the authenticated user.',
  })
  @IsOptional()
  @IsString()
  worker_id?: string;

  @ApiPropertyOptional({
    example: 'me',
    description:
      'Filter jobs by reporter id. Use "me" for the authenticated user.',
  })
  @IsOptional()
  @IsString()
  reporter_id?: string;
}
