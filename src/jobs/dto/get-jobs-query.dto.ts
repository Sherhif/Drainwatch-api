import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
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
}
