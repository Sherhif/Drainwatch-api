import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

@Entity({ name: 'users' })
@Index('idx_users_phone_number', ['phoneNumber'], { unique: true })
@Index('idx_users_status', ['status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName: string;

  @Column({ name: 'phone_number', type: 'varchar', unique: true })
  phoneNumber: string;

  @Column({
    type: 'simple-array',
    default: UserRole.Reporter,
  })
  roles: UserRole[];

  @Column({ name: 'moolre_wallet_ref', type: 'varchar', nullable: true })
  moolreWalletRef?: string | null;

  @Column({ type: 'float', nullable: true })
  rating?: number | null;

  @Column({
    type: 'varchar',
    default: UserStatus.Active,
  })
  status: UserStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
