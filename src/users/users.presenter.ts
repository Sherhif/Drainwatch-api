import { User } from './entities/user.entity';

export function presentUser(user: User) {
  return {
    id: user.id,
    full_name: user.fullName,
    phone_number: user.phoneNumber,
    roles: user.roles,
    moolre_wallet_ref: user.moolreWalletRef ?? null,
    rating: user.rating ?? null,
    status: user.status,
    created_at: user.createdAt.toISOString(),
  };
}
