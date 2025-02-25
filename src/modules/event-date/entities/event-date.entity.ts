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
    date: LocalDate;
  
    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime: LocalTime;
  
    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime: LocalTime;
  
    @OneToMany(() => Match, (match) => match.eventDate, { cascade: true })
    matches: Match[];
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: LocalDateTime;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: LocalDateTime;
  }
  