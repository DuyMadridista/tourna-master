import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    JoinTable,
    BeforeInsert,
    BeforeUpdate,
    OneToMany,
    JoinColumn,
    ManyToOne,
  } from 'typeorm';
  import { User } from '../../user/entities/user.entity';
  import { TournamentStatus } from '../../../enums/tournament-status.enum';
  import { TournamentFormat } from '../../../enums/tournament-format.enum';
import { Team } from 'src/modules/team/entities/team.entity';
import { EventDate } from 'src/modules/event-date/entities/event-date.entity';
import { LocalTime, LocalDate, LocalDateTime } from '@js-joda/core';
import { Category } from 'src/modules/category/entities/category.entity';
  
  @Entity('tournaments')
  export class Tournament {
    @PrimaryGeneratedColumn({ name: 'tournament_id' })
    id: number;
  
    @Column({ length: 255 })
    title: string;
  
    @ManyToOne(() => Category, (category) => category.tournaments)
    @JoinColumn({ name: 'categoryId' })
    category: Category;
  
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: LocalDateTime;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: LocalDateTime;
  
    @Column({
      type: 'enum',
      enum: TournamentStatus,
      default: TournamentStatus.NEED_INFORMATION,
    })
    status: TournamentStatus;
  
    @Column({ name: 'match_duration', nullable: true })
    matchDuration: number;
  
    @Column({ name: 'time_between', nullable: true })
    timeBetween: number;
  
    @Column({
      name: 'start_time_default',
      type: 'time',
      nullable: true,
      default: () => "'00:00:00'",
    })
    startTimeDefault: string;
    
    @Column({
      name: 'end_time_default',
      type: 'time',
      nullable: true,
      default: () => "'23:59:59'",
    })
    endTimeDefault: string;
    
  
    @Column({
      type: 'enum',
      enum: TournamentFormat,
      default: TournamentFormat.ROUND_ROBIN,
    })
    format: TournamentFormat;
  
    @Column({ name: 'is_deleted', default: false })
    isDeleted: boolean;
  
    @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;
  
    @Column({ name: 'description', type: 'text', nullable: true })
    description: string;
  
    @ManyToMany(() => User, (user) => user.tournaments, { cascade: true })
    @JoinTable({
      name: 'organizer_tournaments', 
      joinColumn: { name: 'tournament_id', referencedColumnName: 'id' },
      inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
    })
    organizers: User[];
    @OneToMany(() => Team, (team) => team.tournament)
    teams: Team[];

    @OneToMany(() => EventDate, (eventDate) => eventDate.tournament)
  eventDates: EventDate[];


  
    constructor(init?: Partial<Tournament>) {
      Object.assign(this, init);
    }
  }
  