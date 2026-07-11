import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'phone_number', unique: true })
  phoneNumber: string;

  @Column({
    type: 'simple-array',
    default: UserRole.Reporter,
  })
  roles: UserRole[];

  @Column({ name: 'ghana_card_id', nullable: true })
  ghanaCardId?: string | null;

  @Column({ name: 'moolre_wallet_ref', nullable: true })
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
