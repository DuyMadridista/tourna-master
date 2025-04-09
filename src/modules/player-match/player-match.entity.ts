import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Player } from '../player/entities/player.entity';
  import { Match } from '../match/entities/match.entity';
  
  @Entity('player_match')
  export class PlayerMatch {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    playerId: number;
  
    @Column()
    matchId: number;
  
    @ManyToOne(() => Player, (player) => player.playerMatches, { eager: true })
    @JoinColumn({ name: 'playerId' })
    player: Player;
  
    @ManyToOne(() => Match, (match) => match.playerMatches, { eager: true })
    @JoinColumn({ name: 'matchId' })
    match: Match;
  
    @Column({ default: 0 })
    goals: number;
  
    @Column({ type: 'simple-json', nullable: true })
    goalMinutes: number[];
  
    @Column({ default: 0 })
    yellowCards: number;
  
    @Column({ type: 'simple-json', nullable: true })
    yellowCardMinutes: number[];
  
    @Column({ default: false })
    redCard: boolean;
  
    @Column({ type: 'int', nullable: true })
    redCardMinute: number | null;
  
    @Column({ default: true })
    isStarter: boolean;
  
    @Column({ type: 'int', nullable: true })
    minutesIn: number | null;
  
    @Column({ type: 'int', nullable: true })
    minutesOut: number | null;
  }
  