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

type CollectionInput = PaymentInput & {
  payer: string;
  channel: string;
};

type TransferInput = PaymentInput & {
  receiver: string;
  channel: string;
};

type SmsInput = {
  phoneNumber: string;
  message: string;
  idempotencyKey: string;
};

@Injectable()
export class MoolreService {
  constructor(private readonly configService: ConfigService) {}

  collect(input: CollectionInput) {
    return this.callCollectionEndpoint(input);
  }

  disburse(input: TransferInput) {
    return this.callTransferEndpoint(input);
  }

  refund(input: PaymentInput) {
    return this.callPaymentEndpoint('refund', 'refundsPath', input);
  }

  async getPaymentStatus(input: {
    providerReference: string;
    idempotencyKey: string;
  }): Promise<MoolrePaymentResult> {
    return this.getTransactionStatus('payment', input);
  }

  async getDisbursementStatus(input: {
    providerReference: string;
    idempotencyKey: string;
  }): Promise<MoolrePaymentResult> {
    return this.getTransactionStatus('disbursement', input);
  }

  private async getTransactionStatus(
    action: 'payment' | 'disbursement',
    input: { providerReference: string; idempotencyKey: string },
  ): Promise<MoolrePaymentResult> {
    if (this.configService.get<string>('moolre.paymentsMode') !== 'live') {
      return {
        reference: input.providerReference,
        status: TransactionStatus.Success,
        rawResponse: {
          provider: 'moolre-stub',
          action: `${action}_status`,
          reference: input.providerReference,
          status: '1',
        },
      };
    }

    const baseUrl = this.configService.getOrThrow<string>('moolre.baseUrl');
    const path = this.configService.getOrThrow<string>(
      'moolre.paymentStatusPath',
    );

    try {
      const response = await fetch(new URL(path, baseUrl), {
        method: 'POST',
        headers:
          action === 'payment'
            ? this.buildPaymentStatusHeaders()
            : this.buildPaymentHeaders(),
        body: JSON.stringify({
          type: 1,
          idtype: '1',
          id: input.idempotencyKey,
          accountnumber: this.configService.get<string>(
            'moolre.businessWalletRef',
          ),
        }),
      });

      const rawResponse = (await response.json().catch(() => ({
        status_code: response.status,
        message: response.statusText,
      }))) as Record<string, unknown>;

      return {
        reference: this.extractReference(rawResponse, 'collection') || input.providerReference,
        status: response.ok
          ? this.extractPaymentStatus(rawResponse)
          : TransactionStatus.Failed,
        rawResponse,
      };
    } catch (error) {
      throw new BadGatewayException({
        message: 'Moolre payment status request failed',
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendSms(input: SmsInput) {
    if (this.configService.get<string>('moolre.smsMode') !== 'live') {
      return {
        reference: `stub-sms-${input.idempotencyKey}`,
        status: 'success',
        rawResponse: {
          provider: 'moolre-stub',
          action: 'sms',
          phone_number: input.phoneNumber,
          message: input.message,
          idempotency_key: input.idempotencyKey,
          status: 'success',
        },
      };
    }

    const baseUrl = this.configService.getOrThrow<string>('moolre.baseUrl');
    const path = this.configService.getOrThrow<string>('moolre.smsPath');
    const response = await fetch(new URL(path, baseUrl), {
      method: 'POST',
      headers: this.buildSmsHeaders(),
      body: JSON.stringify({
        type: 1,
        accountnumber: this.configService.get<string>(
          'moolre.businessWalletRef',
        ),
        senderid: this.configService.get<string>('moolre.smsSenderId'),
        messages: [
          {
            recipient: this.formatSmsRecipient(input.phoneNumber),
            message: input.message,
            ref: input.idempotencyKey,
          },
        ],
      }),
    });

    const rawResponse = (await response.json().catch(() => ({
      status_code: response.status,
      message: response.statusText,
    }))) as Record<string, unknown>;

    return {
      reference: this.extractReference(rawResponse, 'sms'),
      status: response.ok && this.isMoolreSuccess(rawResponse) ? 'success' : 'failed',
      rawResponse,
    };
  }

  private async callCollectionEndpoint(
    input: CollectionInput,
  ): Promise<MoolrePaymentResult> {
    if (this.configService.get<string>('moolre.paymentsMode') !== 'live') {
      return this.stubResult('collection', input);
    }

    const baseUrl = this.configService.getOrThrow<string>('moolre.baseUrl');
    const path = this.configService.getOrThrow<string>(
      'moolre.collectionsPath',
    );

    try {
      const response = await fetch(new URL(path, baseUrl), {
        method: 'POST',
        headers: this.buildPaymentHeaders(),
        body: JSON.stringify({
          type: 1,
          channel: input.channel,
          currency: input.currency,
          payer: this.formatPaymentPhone(input.payer),
          amount: input.amount,
          externalref: input.idempotencyKey,
          reference: `DrainWatch job funding ${input.jobId}`,
          accountnumber: this.configService.get<string>(
            'moolre.businessWalletRef',
          ),
        }),
      });

      const rawResponse = (await response.json().catch(() => ({
        status_code: response.status,
        message: response.statusText,
      }))) as Record<string, unknown>;

      return {
        reference: this.extractReference(rawResponse, 'collection'),
        status: response.ok
          ? this.extractCollectionStatus(rawResponse)
          : TransactionStatus.Failed,
        rawResponse,
      };
    } catch (error) {
      throw new BadGatewayException({
        message: 'Moolre collection request failed',
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async callTransferEndpoint(
    input: TransferInput,
  ): Promise<MoolrePaymentResult> {
    if (this.configService.get<string>('moolre.paymentsMode') !== 'live') {
      return this.stubResult('disbursement', input);
    }

    const baseUrl = this.configService.getOrThrow<string>('moolre.baseUrl');
    const path = this.configService.getOrThrow<string>(
      'moolre.disbursementsPath',
    );

    try {
      const response = await fetch(new URL(path, baseUrl), {
        method: 'POST',
        headers: this.buildPaymentHeaders(),
        body: JSON.stringify({
          type: 1,
          channel: input.channel,
          currency: input.currency,
          amount: input.amount,
          receiver: this.formatPaymentPhone(input.receiver),
          externalref: input.idempotencyKey,
          reference: `DrainWatch worker payout ${input.jobId}`,
          accountnumber: this.configService.get<string>(
            'moolre.businessWalletRef',
          ),
        }),
      });

      const rawResponse = (await response.json().catch(() => ({
        status_code: response.status,
        message: response.statusText,
      }))) as Record<string, unknown>;

      return {
        reference: this.extractReference(rawResponse, 'disbursement'),
        status: response.ok
          ? this.extractTransferStatus(rawResponse)
          : TransactionStatus.Failed,
        rawResponse,
      };
    } catch (error) {
      throw new BadGatewayException({
        message: 'Moolre disbursement request failed',
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async callPaymentEndpoint(
    action: 'collection' | 'disbursement' | 'refund',
    pathConfigKey: 'collectionsPath' | 'disbursementsPath' | 'refundsPath',
    input: PaymentInput,
  ): Promise<MoolrePaymentResult> {
    if (this.configService.get<string>('moolre.paymentsMode') !== 'live') {
      return this.stubResult(action, input);
    }

    const baseUrl = this.configService.getOrThrow<string>('moolre.baseUrl');
    const path = this.configService.getOrThrow<string>(
      `moolre.${pathConfigKey}`,
    );
    try {
      const response = await fetch(new URL(path, baseUrl), {
        method: 'POST',
        headers: this.buildPaymentHeaders(),
        body: JSON.stringify({
          accountnumber: this.configService.get<string>(
            'moolre.businessWalletRef',
          ),
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

  private buildPaymentHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const headerMap = {
      'X-API-USER': this.configService.get<string>('moolre.apiUser')?.trim(),
      'X-API-KEY': this.configService.get<string>('moolre.apiKey')?.trim(),
    };

    for (const [name, value] of Object.entries(headerMap)) {
      if (value) {
        headers[name] = value;
      }
    }

    return headers;
  }

  private buildPaymentStatusHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const headerMap = {
      'X-API-USER': this.configService.get<string>('moolre.apiUser')?.trim(),
      'X-API-PUBKEY': this.configService
        .get<string>('moolre.apiPubKey')
        ?.trim(),
    };

    for (const [name, value] of Object.entries(headerMap)) {
      if (value) {
        headers[name] = value;
      }
    }

    return headers;
  }

  private buildSmsHeaders() {
    const vasKey = this.configService
      .get<string>('moolre.apiVasKey')
      ?.trim();

    return {
      'Content-Type': 'application/json',
      ...(vasKey ? { 'X-API-VASKEY': vasKey } : {}),
    };
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
    action: 'collection' | 'disbursement' | 'refund' | 'sms',
  ) {
    const possibleReference =
      rawResponse.reference ??
      rawResponse.transaction_ref ??
      rawResponse.transactionReference ??
      rawResponse.id ??
      (typeof rawResponse.data === 'string' ? rawResponse.data : null) ??
      (typeof rawResponse.data === 'object' && rawResponse.data !== null
        ? (rawResponse.data as Record<string, unknown>).transactionid ??
          (rawResponse.data as Record<string, unknown>).thirdpartyref ??
          (rawResponse.data as Record<string, unknown>).externalref
        : null);

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

  private extractCollectionStatus(rawResponse: Record<string, unknown>) {
    if (String(rawResponse.status) !== '1') {
      return TransactionStatus.Failed;
    }

    const code = String(rawResponse.code ?? '');

    if (code === 'TP14' || code === 'TR099') {
      return TransactionStatus.Pending;
    }

    return TransactionStatus.Success;
  }

  private extractPaymentStatus(rawResponse: Record<string, unknown>) {
    if (String(rawResponse.status) !== '1') {
      return TransactionStatus.Failed;
    }

    const data =
      typeof rawResponse.data === 'object' && rawResponse.data !== null
        ? (rawResponse.data as Record<string, unknown>)
        : null;
    const transactionStatus = String(data?.txstatus ?? '');

    if (transactionStatus === '1') {
      return TransactionStatus.Success;
    }

    if (transactionStatus === '2') {
      return TransactionStatus.Failed;
    }

    return TransactionStatus.Pending;
  }

  private extractTransferStatus(rawResponse: Record<string, unknown>) {
    if (String(rawResponse.status) !== '1') {
      return TransactionStatus.Failed;
    }

    const data =
      typeof rawResponse.data === 'object' && rawResponse.data !== null
        ? (rawResponse.data as Record<string, unknown>)
        : null;
    const transactionStatus = String(data?.txstatus ?? '');

    if (transactionStatus === '1') {
      return TransactionStatus.Success;
    }

    if (transactionStatus === '2') {
      return TransactionStatus.Failed;
    }

    return TransactionStatus.Pending;
  }

  private formatSmsRecipient(phoneNumber: string) {
    return phoneNumber.replace(/^\+/, '');
  }

  private formatPaymentPhone(phoneNumber: string) {
    return phoneNumber.replace(/^\+/, '');
  }

  private isMoolreSuccess(rawResponse: Record<string, unknown>) {
    return String(rawResponse.status) === '1';
  }
}
