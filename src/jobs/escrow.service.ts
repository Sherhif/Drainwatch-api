import { BadRequestException, Injectable } from '@nestjs/common';

type LiabilityStatus = 'held' | 'released' | 'refunded' | 'partially_released';

type Liability = {
  jobId: string;
  sponsorId: string;
  amount: string;
  currency: string;
  status: LiabilityStatus;
  heldAt: Date;
  releasedAt?: Date | null;
  refundedAt?: Date | null;
};

@Injectable()
export class EscrowService {
  private readonly liabilities = new Map<string, Liability>();

  hold(input: {
    jobId: string;
    sponsorId: string;
    amount: string;
    currency: string;
  }) {
    const existing = this.liabilities.get(input.jobId);

    if (existing) {
      return existing;
    }

    const liability: Liability = {
      ...input,
      status: 'held',
      heldAt: new Date(),
      releasedAt: null,
      refundedAt: null,
    };

    this.liabilities.set(input.jobId, liability);
    return liability;
  }

  release(jobId: string) {
    const liability = this.assertHeld(jobId);
    liability.status = 'released';
    liability.releasedAt = new Date();
    return liability;
  }

  refund(jobId: string) {
    const liability = this.assertHeld(jobId);
    liability.status = 'refunded';
    liability.refundedAt = new Date();
    return liability;
  }

  partiallyRelease(jobId: string) {
    const liability = this.assertHeld(jobId);
    liability.status = 'partially_released';
    liability.releasedAt = new Date();
    return liability;
  }

  get(jobId: string) {
    return this.liabilities.get(jobId) ?? null;
  }

  private assertHeld(jobId: string) {
    const liability = this.liabilities.get(jobId);

    if (!liability) {
      throw new BadRequestException('No held funds found for this job');
    }

    if (liability.status !== 'held') {
      throw new BadRequestException(`Funds are already ${liability.status}`);
    }

    return liability;
  }
}
