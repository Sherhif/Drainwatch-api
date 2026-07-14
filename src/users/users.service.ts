import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';
import { MoolreChannel } from '../moolre/moolre-channel.enum';

type CreateUserInput = {
  fullName: string;
  phoneNumber: string;
  roles: UserRole[];
  moolreChannel?: MoolreChannel | null;
  status?: UserStatus;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(input: CreateUserInput) {
    const existingUser = await this.findByPhoneNumber(input.phoneNumber);

    if (existingUser) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    const user = this.usersRepository.create({
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      roles: [...new Set(input.roles)],
      moolreWalletRef: null,
      moolreChannel: input.moolreChannel ?? null,
      rating: null,
      status: input.status ?? UserStatus.Active,
    });

    return this.usersRepository.save(user);
  }

  async updatePendingRegistration(
    user: User,
    input: Pick<CreateUserInput, 'fullName' | 'roles' | 'moolreChannel'>,
  ) {
    user.fullName = input.fullName;
    user.roles = [...new Set(input.roles)];

    if (input.moolreChannel !== undefined) {
      user.moolreChannel = input.moolreChannel;
    }

    return this.usersRepository.save(user);
  }

  async updateMoolreChannel(user: User, moolreChannel: MoolreChannel) {
    user.moolreChannel = moolreChannel;
    return this.usersRepository.save(user);
  }

  async activate(user: User) {
    if (user.status === UserStatus.Active) {
      return user;
    }

    user.status = UserStatus.Active;
    return this.usersRepository.save(user);
  }

  async findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByPhoneNumber(phoneNumber: string) {
    return this.usersRepository.findOne({ where: { phoneNumber } });
  }

  async findAll() {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findByRole(role: UserRole) {
    const users = await this.findAll();

    return users.filter((user) => user.roles.includes(role));
  }
}
