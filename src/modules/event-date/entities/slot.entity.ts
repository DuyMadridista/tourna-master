import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
  } from 'typeorm';
  import { EventDate } from '../../event-date/entities/event-date.entity';
  import { LocalTime } from '@js-joda/core';
import { Match } from 'src/modules/match/entities/match.entity';
  
  @Entity('slots')
  export class Slot {
    @PrimaryGeneratedColumn({ name: 'id' })
    id: number;
  
    @Column({ type: 'int', nullable: false })
    slotIndex: number;
  
    @ManyToOne(() => EventDate, (eventDate) => eventDate.slots, {
      nullable: false,
      onDelete: 'CASCADE',
    })
    eventDate: EventDate;
  
    @OneToOne(() => Match, (match) => match.slot, { nullable: true, onDelete: 'SET NULL' })
    match: Match;

    @Column({ name: 'start_time', type: 'time', nullable: false })
    private _startTime: string;
  
    get startTime(): LocalTime {
      return LocalTime.parse(this._startTime);
    }
  
    set startTime(value: LocalTime) {
      this._startTime = value.toString();
    }
  
    @Column({ name: 'end_time', type: 'time', nullable: false })
    private _endTime: string;
  
    get endTime(): LocalTime {
      return LocalTime.parse(this._endTime);
    }
  
    set endTime(value: LocalTime) {
      this._endTime = value.toString();
    }
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }
  