import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { UploadedFile } from '../common/types/uploaded-file.type';

type UploadKind = 'report' | 'completion';

type UploadResult = {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  rawResponse: UploadApiResponse;
};

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        'cloudinary.cloudName',
      ),
      api_key: this.configService.getOrThrow<string>('cloudinary.apiKey'),
      api_secret: this.configService.getOrThrow<string>(
        'cloudinary.apiSecret',
      ),
      secure: true,
    });
  }

  uploadJobPhoto(file: UploadedFile, kind: UploadKind): Promise<UploadResult> {
    if (!file.buffer?.length) {
      throw new BadRequestException(`${kind} photo upload is missing file data`);
    }

    const fileBuffer = file.buffer;
    const folder =
      kind === 'report'
        ? this.configService.getOrThrow<string>('cloudinary.reportFolder')
        : this.configService.getOrThrow<string>('cloudinary.completionFolder');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(
              new BadGatewayException(
                `Cloudinary ${kind} photo upload failed`,
              ),
            );
            return;
          }

          if (!result?.secure_url || !result.public_id) {
            reject(
              new BadGatewayException(
                `Cloudinary ${kind} photo upload returned an invalid response`,
              ),
            );
            return;
          }

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            resourceType: result.resource_type,
            rawResponse: result,
          });
        },
      );

      Readable.from(fileBuffer).pipe(uploadStream);
    });
  }
}
