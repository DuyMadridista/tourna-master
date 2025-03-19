import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Team } from '../../team/entities/team.entity';
import { IsDate, Length, Matches } from 'class-validator';

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn({ name: 'id' })
  playerId: number;

  @Column({ name: 'name', nullable: false })
  @Length(1, 50, { message: 'Player name must be between 1 and 50 characters' })
  playerName: string;

  @ManyToOne(() => Team, (team) => team.players, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'dob', nullable: true })
  @IsDate({ message: 'Date of birth must be a valid date' })
  dateOfBirth: Date;

  @Column({
    name: 'phone',
    type: 'varchar',
    length: 11,
    nullable: true,
  })
  @Matches(/^\d{10,11}$/, {
    message: 'Phone number must be between 10 and 11 digits',
  })
  phone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
