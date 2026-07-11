import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteJobDto {
  @ApiPropertyOptional({
    example: 'https://example.com/completion-photo.jpg',
    description:
      'Development fallback when multipart completion photo is not used.',
  })
  @IsOptional()
  @IsString()
  completion_photo_url?: string;
}
