import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      rating: null,
      status: UserStatus.Active,
    });

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
