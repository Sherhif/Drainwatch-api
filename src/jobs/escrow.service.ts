import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscrowLiability } from './entities/escrow-liability.entity';

@Injectable()
export class EscrowService {
  constructor(
    @InjectRepository(EscrowLiability)
    private readonly liabilitiesRepository: Repository<EscrowLiability>,
  ) {}

  async hold(input: {
    jobId: string;
    sponsorId: string;
    amount: string;
    currency: string;
  }) {
    const existing = await this.get(input.jobId);

    if (existing) {
      return existing;
    }

    const liability = this.liabilitiesRepository.create({
      ...input,
      status: 'held',
      heldAt: new Date(),
      releasedAt: null,
      refundedAt: null,
    });

    return this.liabilitiesRepository.save(liability);
  }

  async release(jobId: string) {
    const liability = await this.assertHeld(jobId);
    liability.status = 'released';
    liability.releasedAt = new Date();
    return this.liabilitiesRepository.save(liability);
  }

  async refund(jobId: string) {
    const liability = await this.assertHeld(jobId);
    liability.status = 'refunded';
    liability.refundedAt = new Date();
    return this.liabilitiesRepository.save(liability);
  }

  async partiallyRelease(jobId: string) {
    const liability = await this.assertHeld(jobId);
    liability.status = 'partially_released';
    liability.releasedAt = new Date();
    return this.liabilitiesRepository.save(liability);
  }

  get(jobId: string) {
    return this.liabilitiesRepository.findOne({ where: { jobId } });
  }

  private async assertHeld(jobId: string) {
    const liability = await this.get(jobId);

    if (!liability) {
      throw new BadRequestException('No held funds found for this job');
    }

    if (liability.status !== 'held') {
      throw new BadRequestException(`Funds are already ${liability.status}`);
    }

    return liability;
  }
}
