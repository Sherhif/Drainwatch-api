import { registerAs } from '@nestjs/config';

export default registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  apiKey: process.env.CLOUDINARY_API_KEY ?? '',
  apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  reportFolder:
    process.env.CLOUDINARY_REPORT_FOLDER ?? 'drainwatch/report-photos',
  completionFolder:
    process.env.CLOUDINARY_COMPLETION_FOLDER ??
    'drainwatch/completion-photos',
}));
