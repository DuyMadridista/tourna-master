import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Team } from '../../team/entities/team.entity';
  import { EventDate } from '../../event-date/entities/event-date.entity';
  import { TypeMatch } from '../../../enums/match-type.enum';
  
  @Entity('matches')
  export class Match {
    @PrimaryGeneratedColumn({ name: 'id' })
    id: number;
  
    @ManyToOne(() => Team, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'team_one_id' })
    teamOne: Team;
  
    @ManyToOne(() => Team, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'team_two_id' })
    teamTwo: Team;
  
    @Column({ name: 'team_one_result', type: 'int', nullable: true })
    teamOneResult: number;
  
    @Column({ name: 'team_two_result', type: 'int', nullable: true })
    teamTwoResult: number;
  
    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime: string;
  
    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime: string;
  
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
  }
  