import { TransactionStatus } from '../../jobs/enums/transaction-status.enum';

export type MoolrePaymentResult = {
  reference: string;
  status: TransactionStatus;
  rawResponse: Record<string, unknown>;
};
