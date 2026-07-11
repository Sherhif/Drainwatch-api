import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { CompleteJobDto } from './dto/complete-job.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { DisputeJobDto } from './dto/dispute-job.dto';
import { FundJobDto } from './dto/fund-job.dto';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto';
import { presentJob } from './jobs.presenter';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Roles(UserRole.Reporter)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: CreateJobDto })
  @ApiCreatedResponse({ description: 'Reporter creates a new open job.' })
  create(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() currentUser: JwtUser,
    @UploadedFile() reportPhoto?: { originalname?: string },
  ) {
    const job = this.jobsService.create(createJobDto, currentUser, reportPhoto);

    return this.presentJobDetail(job.id);
  }

  @Get()
  @ApiOkResponse({
    description: 'List jobs, filterable by status and severity.',
  })
  findAll(
    @Query() query: GetJobsQueryDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.jobsService
      .findAll(query, currentUser)
      .map((job) => presentJob(job));
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Get a single job detail.' })
  findOne(@Param('id') id: string) {
    return this.presentJobDetail(id);
  }

  @Post(':id/fund')
  @Roles(UserRole.Sponsor)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Sponsor funds an open job.' })
  async fund(
    @Param('id') id: string,
    @Body() fundJobDto: FundJobDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    await this.jobsService.fund(id, fundJobDto, currentUser);
    return this.presentJobDetail(id);
  }

  @Post(':id/claim')
  @Roles(UserRole.Worker)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Worker claims a funded job.' })
  async claim(@Param('id') id: string, @CurrentUser() currentUser: JwtUser) {
    await this.jobsService.claim(id, currentUser);
    return this.presentJobDetail(id);
  }

  @Post(':id/start')
  @Roles(UserRole.Worker)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Assigned worker starts a claimed job.' })
  start(@Param('id') id: string, @CurrentUser() currentUser: JwtUser) {
    this.jobsService.start(id, currentUser);
    return this.presentJobDetail(id);
  }

  @Post(':id/complete')
  @Roles(UserRole.Worker)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('completion_photo'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: CompleteJobDto })
  @ApiOkResponse({ description: 'Assigned worker submits completion proof.' })
  complete(
    @Param('id') id: string,
    @Body() completeJobDto: CompleteJobDto,
    @CurrentUser() currentUser: JwtUser,
    @UploadedFile() completionPhoto?: { originalname?: string },
  ) {
    this.jobsService.complete(id, completeJobDto, currentUser, completionPhoto);
    return this.presentJobDetail(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.Sponsor)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Sponsor approves a completed job and triggers stub payout.',
  })
  async approve(@Param('id') id: string, @CurrentUser() currentUser: JwtUser) {
    await this.jobsService.approve(id, currentUser);
    return this.presentJobDetail(id);
  }

  @Post(':id/dispute')
  @Roles(UserRole.Sponsor)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Sponsor disputes completed job proof.' })
  dispute(
    @Param('id') id: string,
    @Body() disputeJobDto: DisputeJobDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    this.jobsService.dispute(id, disputeJobDto, currentUser);
    return this.presentJobDetail(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.Reporter, UserRole.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Reporter or admin cancels an unfunded job.' })
  cancel(@Param('id') id: string, @CurrentUser() currentUser: JwtUser) {
    this.jobsService.cancel(id, currentUser);
    return this.presentJobDetail(id);
  }

  private presentJobDetail(id: string) {
    const job = this.jobsService.findOne(id);

    return presentJob(job, {
      statusHistory: this.jobsService.getStatusHistory(job.id),
      transactions: this.jobsService.getTransactions(job.id),
      dispute: this.jobsService.getDispute(job.id),
    });
  }
}
