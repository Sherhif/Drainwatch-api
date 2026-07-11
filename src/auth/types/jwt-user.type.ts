import { UserRole } from '../../users/enums/user-role.enum';

export type JwtUser = {
  sub: string;
  phone_number: string;
  roles: UserRole[];
};
