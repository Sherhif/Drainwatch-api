import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JobsService } from '../jobs/jobs.service';
import { UserRole } from '../users/enums/user-role.enum';
import { presentAdminDispute } from './admin-disputes.presenter';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@ApiTags('admin-disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOkResponse({ description: 'List unresolved disputes with job evidence.' })
  async findAll() {
    const disputes = await this.jobsService.findOpenDisputes();

    return Promise.all(
      disputes.map(({ dispute, job }) =>
        this.presentDispute(dispute.id, job.id),
      ),
    );
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({
    description: 'Resolve a dispute into paid, refunded, or partially paid.',
  })
  async resolve(
    @Param('id') id: string,
    @Body() resolveDisputeDto: ResolveDisputeDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    const { dispute, job } = await this.jobsService.resolveDispute(
      id,
      resolveDisputeDto,
      currentUser,
    );

    return this.presentDispute(dispute.id, job.id);
  }

  private async presentDispute(disputeId: string, jobId: string) {
    const [dispute, job] = await Promise.all([
      this.jobsService.findDisputeById(disputeId),
      this.jobsService.findOne(jobId),
    ]);
    const [statusHistory, transactions] = await Promise.all([
      this.jobsService.getStatusHistory(job.id),
      this.jobsService.getTransactions(job.id),
    ]);

    return presentAdminDispute(dispute, {
      job,
      statusHistory,
      transactions,
    });
  }
}
