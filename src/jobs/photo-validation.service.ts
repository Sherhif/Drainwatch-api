import { BadRequestException, Injectable } from '@nestjs/common';
import { UploadedFile } from '../common/types/uploaded-file.type';

type PhotoValidationInput = {
  file?: UploadedFile;
  fallbackUrl?: string;
  kind: 'report' | 'completion';
};

@Injectable()
export class PhotoValidationService {
  private readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
  private readonly maxBytes = 6 * 1024 * 1024;

  validate(input: PhotoValidationInput) {
    if (!input.file && !input.fallbackUrl) {
      throw new BadRequestException(`A ${input.kind} photo is required`);
    }

    if (!input.file) {
      return;
    }

    if (
      input.file.mimetype &&
      !this.allowedMimeTypes.has(input.file.mimetype)
    ) {
      throw new BadRequestException(
        `${input.kind} photo must be a jpeg, png, or webp image`,
      );
    }

    if (input.file.size !== undefined && input.file.size > this.maxBytes) {
      throw new BadRequestException(
        `${input.kind} photo must be 6MB or smaller`,
      );
    }

    this.validateMetadataHook();
  }

  private validateMetadataHook() {
    // Hook for GPS/timestamp EXIF validation once real uploaded buffers are persisted.
    // Current demo fallback URLs cannot provide trustworthy EXIF metadata.
  }
}
