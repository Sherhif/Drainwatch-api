import { registerAs } from '@nestjs/config';

export default registerAs('moolre', () => ({
  mode: process.env.MOOLRE_MODE ?? 'stub',
  paymentsMode:
    process.env.MOOLRE_PAYMENTS_MODE ?? process.env.MOOLRE_MODE ?? 'stub',
  smsMode: process.env.MOOLRE_SMS_MODE ?? process.env.MOOLRE_MODE ?? 'stub',
  baseUrl: process.env.MOOLRE_BASE_URL ?? '',
  collectionsPath:
    process.env.MOOLRE_COLLECTIONS_PATH ?? '/open/transact/payment',
  disbursementsPath:
    process.env.MOOLRE_DISBURSEMENTS_PATH ?? '/open/transact/transfer',
  refundsPath: process.env.MOOLRE_REFUNDS_PATH ?? '/open/transact/transfer',
  paymentStatusPath:
    process.env.MOOLRE_PAYMENT_STATUS_PATH ?? '/open/transact/status',
  smsPath: process.env.MOOLRE_SMS_PATH ?? '/open/sms/send',
  smsSenderId: process.env.MOOLRE_SMS_SENDER_ID ?? 'DrainWatch',
  apiUser: process.env.MOOLRE_API_USER ?? '',
  apiKey: process.env.MOOLRE_API_KEY ?? '',
  apiPubKey: process.env.MOOLRE_API_PUBKEY ?? '',
  apiVasKey: process.env.MOOLRE_API_VASKEY ?? '',
  businessWalletRef: process.env.MOOLRE_BUSINESS_WALLET_REF ?? '',
}));
