import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { JwtUser } from '../auth/types/jwt-user.type';
import { JobSeverity } from '../jobs/enums/job-severity.enum';
import { JobsService } from '../jobs/jobs.service';
import { MoolreChannel } from '../moolre/moolre-channel.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { presentUser } from '../users/users.presenter';
import { UsersService } from '../users/users.service';

@Injectable()
export class DemoService {
  constructor(
    private readonly authService: AuthService,
    private readonly jobsService: JobsService,
    private readonly usersService: UsersService,
  ) {}

  async seed() {
    const reporter = await this.findOrCreateUser(
      'Demo Reporter',
      '+233500000001',
      UserRole.Reporter,
    );
    const sponsor = await this.findOrCreateUser(
      'Demo Sponsor',
      '+233500000002',
      UserRole.Sponsor,
    );
    const worker = await this.findOrCreateUser(
      'Demo Worker',
      '+233500000003',
      UserRole.Worker,
    );
    const admin = await this.findOrCreateUser(
      'Demo Admin',
      '+233500000004',
      UserRole.Admin,
    );

    const reporterJwt = this.toJwtUser(reporter);
    const sponsorJwt = this.toJwtUser(sponsor);
    const workerJwt = this.toJwtUser(worker);

    const openJob = await this.jobsService.create(
      {
        lat: 5.6037,
        lng: -0.187,
        severity: JobSeverity.Moderate,
        description: 'Demo open blocked drain near Makola.',
        report_photo_url: 'https://example.com/demo-before-open.jpg',
      },
      reporterJwt,
    );

    const fundedJob = await this.jobsService.create(
      {
        lat: 5.61,
        lng: -0.2,
        severity: JobSeverity.Severe,
        description: 'Demo funded drain awaiting worker claim.',
        report_photo_url: 'https://example.com/demo-before-funded.jpg',
      },
      reporterJwt,
    );
    await this.jobsService.fund(
      fundedJob.id,
      { amount: 150, currency: 'GHS', channel: MoolreChannel.Mtn },
      sponsorJwt,
    );

    const completedJob = await this.jobsService.create(
      {
        lat: 5.59,
        lng: -0.18,
        severity: JobSeverity.Minor,
        description: 'Demo completed job pending sponsor review.',
        report_photo_url: 'https://example.com/demo-before-completed.jpg',
      },
      reporterJwt,
    );
    await this.jobsService.fund(
      completedJob.id,
      { amount: 80, currency: 'GHS', channel: MoolreChannel.Mtn },
      sponsorJwt,
    );
    await this.jobsService.claim(completedJob.id, workerJwt);
    await this.jobsService.start(completedJob.id, workerJwt);
    await this.jobsService.complete(
      completedJob.id,
      { completion_photo_url: 'https://example.com/demo-after-completed.jpg' },
      workerJwt,
    );

    return {
      users: {
        reporter: await this.presentSeedUser(reporter),
        sponsor: await this.presentSeedUser(sponsor),
        worker: await this.presentSeedUser(worker),
        admin: await this.presentSeedUser(admin),
      },
      jobs: {
        open_job_id: openJob.id,
        funded_job_id: fundedJob.id,
        completed_pending_review_job_id: completedJob.id,
      },
    };
  }

  private async findOrCreateUser(
    fullName: string,
    phoneNumber: string,
    role: UserRole,
  ) {
    return (
      (await this.usersService.findByPhoneNumber(phoneNumber)) ??
      (await this.usersService.create({
        fullName,
        phoneNumber,
        roles: [role],
      }))
    );
  }

  private async presentSeedUser(
    user: Awaited<ReturnType<UsersService['create']>>,
  ) {
    return {
      ...presentUser(user),
      auth_token: await this.authService.issueTokenForUser(user),
    };
  }

  private toJwtUser(
    user: Awaited<ReturnType<UsersService['create']>>,
  ): JwtUser {
    return {
      sub: user.id,
      phone_number: user.phoneNumber,
      roles: user.roles,
    };
  }
}
