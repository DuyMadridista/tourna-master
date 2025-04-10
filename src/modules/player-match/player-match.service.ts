import { Injectable } from '@nestjs/common';
import { PlayerMatch } from './player-match.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Player } from '../player/entities/player.entity';

@Injectable()
export class PlayerMatchService {
    @InjectRepository(PlayerMatch)
    private readonly playerMatchRepository: Repository<PlayerMatch>;

    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>;
  
    async savePlayerMatch(
        matchId: number,
        teamOneId: number,
        teamTwoId: number,
        teamOnePlayers: any[],
        teamTwoPlayers: any[],
      ) {
        const allPlayerMatches: PlayerMatch[] = [];
      
        const [teamOneMatches, teamTwoMatches] = await Promise.all([
          this.buildPlayerMatches(teamOneId, matchId, teamOnePlayers),
          this.buildPlayerMatches(teamTwoId, matchId, teamTwoPlayers),
        ]);
      
        allPlayerMatches.push(...teamOneMatches, ...teamTwoMatches);
    
        return await this.playerMatchRepository.save(allPlayerMatches);
      }
    async buildPlayerMatches(teamId: number, matchId: number, players: any[]): Promise<PlayerMatch[]> {
        const res: PlayerMatch[] = [];
        for (const player of players) {
          const playerEntity = await this.playerRepository.findOne({
            where: { team: { teamId }, number: player.number },
          });
    
          if (!playerEntity) {
            console.warn(`Không tìm thấy player number ${player.number} trong team ${teamId}`);
            continue;
          }
    
          let playerMatch = await this.playerMatchRepository.findOne({
            where: {
              playerId: playerEntity.playerId,
              matchId: matchId,
            },
          });
    
          if (!playerMatch) {
            playerMatch = new PlayerMatch();
            playerMatch.playerId = playerEntity.playerId;
            playerMatch.matchId = matchId;
          }
    
          playerMatch.goals = player.goals ?? 0;
          playerMatch.goalMinutes = player.goalsAt ?? null;
          playerMatch.yellowCards = player.yellowCards ?? 0;
          playerMatch.yellowCardMinutes = player.yellowCardsAt ?? null;
          playerMatch.redCard = player.redCard ?? false;
          playerMatch.redCardMinute = player.redCardMinute ?? null;
          playerMatch.isStarter = player.starter ?? true;
          playerMatch.minutesIn = player.substituteIn ?? null;
          playerMatch.minutesOut = player.substituteOut ?? null;
    
          res.push(playerMatch);
        }
    
        return res;
      };       
  }
