import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Team } from '../../team/entities/team.entity';
import { EventDate } from '../../event-date/entities/event-date.entity';
import { TypeMatch } from '../../../enums/match-type.enum';
import { LocalTime } from '@js-joda/core';
import { PlayerMatch } from 'src/modules/player-match/player-match.entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_one_id' })
  teamOne: Team;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_two_id' })
  teamTwo: Team;

  @Column({ name: 'team_one_result', type: 'int', nullable: true })
  teamOneResult: number;

  @Column({ name: 'team_two_result', type: 'int', nullable: true })
  teamTwoResult: number;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  private _startTime: string;

  get startTime(): LocalTime | null {
    return this._startTime ? LocalTime.parse(this._startTime) : null;
  }

  set startTime(value: LocalTime | null) {
    this._startTime = value ? value.toString() : null;
  }

  @Column({ name: 'end_time', type: 'time', nullable: true })
  private _endTime: string;

  get endTime(): LocalTime | null {
    return this._endTime ? LocalTime.parse(this._endTime) : null;
  }

  set endTime(value: LocalTime | null) {
    this._endTime = value ? value.toString() : null;
  }
  @Column({ name: 'duration', type: 'int', nullable: true })
  matchDuration: number;

  @ManyToOne(() => EventDate, (eventDate) => eventDate.matches, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'event_date_id' })
  eventDate: EventDate;

  @Column({ name: 'title', type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: TypeMatch,
    nullable: false,
  })
  type: TypeMatch;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  
  @OneToMany(() => PlayerMatch, (playerMatch) => playerMatch.match)
  playerMatches: PlayerMatch[];
}
