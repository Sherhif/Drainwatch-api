import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';

type CreateUserInput = {
  fullName: string;
  phoneNumber: string;
  roles: UserRole[];
};

@Injectable()
export class UsersService {
  private readonly users = new Map<string, User>();

  async create(input: CreateUserInput) {
    const existingUser = await this.findByPhoneNumber(input.phoneNumber);

    if (existingUser) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    const user = new User();
    user.id = randomUUID();
    user.fullName = input.fullName;
    user.phoneNumber = input.phoneNumber;
    user.roles = [...new Set(input.roles)];
    user.ghanaCardId = null;
    user.moolreWalletRef = null;
    user.rating = null;
    user.status = UserStatus.Active;
    user.createdAt = new Date();

    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findByPhoneNumber(phoneNumber: string) {
    return (
      [...this.users.values()].find(
        (user) => user.phoneNumber === phoneNumber,
      ) ?? null
    );
  }
}
