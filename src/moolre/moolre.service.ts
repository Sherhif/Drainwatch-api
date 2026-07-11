import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionStatus } from '../jobs/enums/transaction-status.enum';
import { MoolrePaymentResult } from './types/moolre-payment-result.type';

type PaymentInput = {
  jobId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  sponsorId?: string;
  workerId?: string;
  collectionRef?: string;
};

@Injectable()
export class MoolreService {
  constructor(private readonly configService: ConfigService) {}

  collect(input: PaymentInput) {
    return this.callPaymentEndpoint('collection', 'collectionsPath', input);
  }

  disburse(input: PaymentInput) {
    return this.callPaymentEndpoint('disbursement', 'disbursementsPath', input);
  }

  refund(input: PaymentInput) {
    return this.callPaymentEndpoint('refund', 'refundsPath', input);
  }

  private async callPaymentEndpoint(
    action: 'collection' | 'disbursement' | 'refund',
    pathConfigKey: 'collectionsPath' | 'disbursementsPath' | 'refundsPath',
    input: PaymentInput,
  ): Promise<MoolrePaymentResult> {
    if (this.configService.get<string>('moolre.mode') !== 'live') {
      return this.stubResult(action, input);
    }

    const baseUrl = this.configService.getOrThrow<string>('moolre.baseUrl');
    const path = this.configService.getOrThrow<string>(
      `moolre.${pathConfigKey}`,
    );
    try {
      const response = await fetch(new URL(path, baseUrl), {
        method: 'POST',
        headers: this.buildHeaders(input.idempotencyKey),
        body: JSON.stringify({
          job_id: input.jobId,
          amount: input.amount,
          currency: input.currency,
          sponsor_id: input.sponsorId,
          worker_id: input.workerId,
          collection_ref: input.collectionRef,
        }),
      });

      const rawResponse = (await response.json().catch(() => ({
        status_code: response.status,
        message: response.statusText,
      }))) as Record<string, unknown>;

      return {
        reference: this.extractReference(rawResponse, action),
        status: response.ok
          ? this.extractStatus(rawResponse)
          : TransactionStatus.Failed,
        rawResponse,
      };
    } catch (error) {
      throw new BadGatewayException({
        message: `Moolre ${action} request failed`,
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private buildHeaders(idempotencyKey: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'X-Idempotency-Key': idempotencyKey,
    };

    const headerMap = {
      'X-API-USER': this.configService.get<string>('moolre.apiUser'),
      'X-API-KEY': this.configService.get<string>('moolre.apiKey'),
      'X-API-PUBKEY': this.configService.get<string>('moolre.apiPubKey'),
      'X-API-VASKEY': this.configService.get<string>('moolre.apiVasKey'),
    };

    for (const [name, value] of Object.entries(headerMap)) {
      if (value) {
        headers[name] = value;
      }
    }

    return headers;
  }

  private stubResult(
    action: 'collection' | 'disbursement' | 'refund',
    input: PaymentInput,
  ): MoolrePaymentResult {
    const reference = `stub-${action}-${input.idempotencyKey}`;

    return {
      reference,
      status: TransactionStatus.Success,
      rawResponse: {
        provider: 'moolre-stub',
        action,
        reference,
        idempotency_key: input.idempotencyKey,
        amount: input.amount,
        currency: input.currency,
        job_id: input.jobId,
        sponsor_id: input.sponsorId ?? null,
        worker_id: input.workerId ?? null,
        collection_ref: input.collectionRef ?? null,
        status: TransactionStatus.Success,
      },
    };
  }

  private extractReference(
    rawResponse: Record<string, unknown>,
    action: 'collection' | 'disbursement' | 'refund',
  ) {
    const possibleReference =
      rawResponse.reference ??
      rawResponse.transaction_ref ??
      rawResponse.transactionReference ??
      rawResponse.id;

    return typeof possibleReference === 'string'
      ? possibleReference
      : `moolre-${action}-${Date.now()}`;
  }

  private extractStatus(rawResponse: Record<string, unknown>) {
    const status = String(
      rawResponse.status ?? rawResponse.state ?? '',
    ).toLowerCase();

    if (status === 'failed') {
      return TransactionStatus.Failed;
    }

    if (status === 'pending') {
      return TransactionStatus.Pending;
    }

    return TransactionStatus.Success;
  }
}
