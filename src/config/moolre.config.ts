import { registerAs } from '@nestjs/config';

export default registerAs('moolre', () => ({
  mode: process.env.MOOLRE_MODE ?? 'stub',
  baseUrl: process.env.MOOLRE_BASE_URL ?? '',
  collectionsPath: process.env.MOOLRE_COLLECTIONS_PATH ?? '/collections',
  disbursementsPath: process.env.MOOLRE_DISBURSEMENTS_PATH ?? '/disbursements',
  refundsPath: process.env.MOOLRE_REFUNDS_PATH ?? '/refunds',
  smsPath: process.env.MOOLRE_SMS_PATH ?? '/sms',
  smsSenderId: process.env.MOOLRE_SMS_SENDER_ID ?? 'DrainWatch',
  apiUser: process.env.MOOLRE_API_USER ?? '',
  apiKey: process.env.MOOLRE_API_KEY ?? '',
  apiPubKey: process.env.MOOLRE_API_PUBKEY ?? '',
  apiVasKey: process.env.MOOLRE_API_VASKEY ?? '',
  businessWalletRef: process.env.MOOLRE_BUSINESS_WALLET_REF ?? '',
}));
