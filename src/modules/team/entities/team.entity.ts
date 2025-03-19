import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { Length, Matches } from 'class-validator';
import { Tournament } from '../../tournament/entities/tournament.entity';
import { Player } from 'src/modules/player/entities/player.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn({ name: 'id' })
  teamId: number;

  @Column({ name: 'name', length: 30 })
  @Length(1, 30, { message: 'Team name must be between 1 and 30 characters' })
  @Matches(/^[a-zA-Z0-9\s]+$/, {
    message: 'Team name must be alphanumeric',
  })
  teamName: string;

  @Column({ name: 'score', default: 0 })
  score: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Tournament, (tournament) => tournament.teams, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @OneToMany(() => Player, (player) => player.team)
  players: Player[];

  @BeforeInsert()
  trimTeamName() {
    if (this.teamName) {
      this.teamName = this.teamName.trim();
    }
  }
}
