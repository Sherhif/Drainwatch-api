import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';

describe('DrainWatch API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const reflector = app.get(Reflector);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ApiResponseInterceptor(reflector));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(fullName: string, phone: string, role: string) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        full_name: fullName,
        phone_number: phone,
        role,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone_number: phone,
        otp_code: '000000',
      })
      .expect(200);

    return response.body.data.auth_token as string;
  }

  async function createJob(reporterToken: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        lat: 5.6037,
        lng: -0.187,
        severity: 'moderate',
        description: 'E2E blocked drain.',
        report_photo_url: 'https://example.com/before.jpg',
      })
      .expect(201);

    return response.body.data.id as string;
  }

  async function prepareCompletedJob(phoneSuffix: string) {
    const reporter = await register(
      `Reporter ${phoneSuffix}`,
      `+23350000${phoneSuffix}1`,
      'reporter',
    );
    const sponsor = await register(
      `Sponsor ${phoneSuffix}`,
      `+23350000${phoneSuffix}2`,
      'sponsor',
    );
    const worker = await register(
      `Worker ${phoneSuffix}`,
      `+23350000${phoneSuffix}3`,
      'worker',
    );

    const jobId = await createJob(reporter);

    await request(app.getHttpServer())
      .post(`/api/v1/jobs/${jobId}/fund`)
      .set('Authorization', `Bearer ${sponsor}`)
      .send({ amount: 120, currency: 'GHS' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/jobs/${jobId}/claim`)
      .set('Authorization', `Bearer ${worker}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/jobs/${jobId}/start`)
      .set('Authorization', `Bearer ${worker}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/jobs/${jobId}/complete`)
      .set('Authorization', `Bearer ${worker}`)
      .send({ completion_photo_url: 'https://example.com/after.jpg' })
      .expect(200);

    return { jobId, sponsor };
  }

  it('runs the happy path through payout', async () => {
    const { jobId, sponsor } = await prepareCompletedJob('101');

    const response = await request(app.getHttpServer())
      .post(`/api/v1/jobs/${jobId}/approve`)
      .set('Authorization', `Bearer ${sponsor}`)
      .expect(200);

    expect(response.body.data.status).toBe('paid');
    expect(response.body.data.transactions).toHaveLength(2);
  });

  it('runs the dispute path through admin release', async () => {
    const { jobId, sponsor } = await prepareCompletedJob('102');
    const admin = await register('Admin 102', '+233500001024', 'admin');

    const dispute = await request(app.getHttpServer())
      .post(`/api/v1/jobs/${jobId}/dispute`)
      .set('Authorization', `Bearer ${sponsor}`)
      .send({ reason: 'The drain still looks blocked.' })
      .expect(200);

    const disputeId = dispute.body.data.dispute.id;

    const resolved = await request(app.getHttpServer())
      .post(`/api/v1/admin/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ resolution: 'released', note: 'Release payment.' })
      .expect(200);

    expect(resolved.body.data.job.status).toBe('paid');
    expect(resolved.body.data.resolution).toBe('released');
  });

  it('seeds demo data outside production', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/demo/seed')
      .expect(200);

    expect(response.body.data.users.reporter.auth_token).toBeTruthy();
    expect(response.body.data.jobs.open_job_id).toBeTruthy();
  });
});
