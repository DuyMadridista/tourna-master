import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tournament } from '../../tournament/entities/tournament.entity';
import { Match } from '../../match/entities/match.entity';
import { LocalDate, LocalDateTime, LocalTime } from '@js-joda/core';
import { Transform } from 'class-transformer';

@Entity('event_dates')
export class EventDate {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.eventDates, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  tournament: Tournament;

  @Column({ name: 'date', type: 'date', nullable: false })
  @Transform(({ value }) => LocalDate.parse(value))
  date: LocalDate;

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

  @OneToMany(() => Match, (match) => match.eventDate, { cascade: true })
  matches: Match[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: LocalDateTime;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: LocalDateTime;
}
