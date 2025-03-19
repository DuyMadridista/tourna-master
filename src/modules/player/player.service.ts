import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Player } from '../player/entities/player.entity';
import { PlayerRepository } from './player.repository';
import { TeamRepository } from '../team/team.repository';
import { DateValidatorUtils } from 'src/helper/date-validator.utils';
import { Team } from '../team/entities/team.entity';

@Injectable()
export class PlayerService {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  private async checkTeamId(teamId: number): Promise<void> {
    const teamIds = await this.teamRepository.getAllTeamID();
    if (!teamIds.includes(Number(teamId))) {
      throw new NotFoundException('Team not found');
    }
  }

  private async checkTeamHasPlayer(
    teamId: number,
    playerId: number,
  ): Promise<void> {
    const player = await this.playerRepository.findByPlayerIdAndTeamId(
      playerId,
      teamId,
    );
    if (!player) {
      throw new NotFoundException('Player may be not in this team');
    }
  }

  async getAllPlayersByTeamId(teamId: number): Promise<Player[]> {
    await this.checkTeamId(teamId);
    const players = await this.playerRepository.getAllPlayersByTeamId(teamId);
    if (players.length === 0) {
      throw new NotFoundException('Player not found');
    }
    return players;
  }

  async getTotalPlayers(teamId: number): Promise<number> {
    await this.checkTeamId(teamId);
    return this.playerRepository.getTotalPlayersByTeamId(teamId);
  }

  async createPlayer(
    teamId: number,
    playerName: string,
    dob: string,
    phoneNumber: string,
  ): Promise<Player> {
    await this.checkTeamId(teamId);

    if (dob && !DateValidatorUtils.isBeforeToday(new Date(dob.trim()))) {
      throw new BadRequestException('Date of birth must be before today');
    }

    const newPlayer = this.playerRepository.create({
      team: { teamId } as Team,
      playerName: playerName.trim(),
      dateOfBirth: dob,
      phone: phoneNumber,
      createdAt: new Date(),
    });

    return this.playerRepository.save(newPlayer);
  }

  async updatePlayer(
    teamId: number,
    playerId: number,
    playerName: string,
    dob: string,
    phoneNumber: string,
  ): Promise<Player> {
    await this.checkTeamId(teamId);

    const existingPlayer = await this.playerRepository.findOne({
      where: { playerId },
    });

    if (!existingPlayer) {
      throw new NotFoundException('Player not found');
    }

    await this.checkTeamHasPlayer(teamId, playerId);

    if (dob && !DateValidatorUtils.isBeforeToday(new Date(dob.trim()))) {
      throw new BadRequestException('Date of birth must be before today');
    }

    Object.assign(existingPlayer, {
      playerName: playerName.trim(),
      dateOfBirth: dob,
      phone: phoneNumber,
      updatedAt: new Date(),
    });

    return this.playerRepository.save(existingPlayer);
  }

  async deletePlayer(teamId: number, playerId: number): Promise<Player> {
    await this.checkTeamId(teamId);

    const existingPlayer = await this.playerRepository.findOne({
      where: { playerId },
    });

    if (!existingPlayer) {
      throw new NotFoundException('Player not found');
    }

    await this.checkTeamHasPlayer(teamId, playerId);
    await this.playerRepository.remove(existingPlayer);

    return existingPlayer;
  }

  async getPlayerByPlayerId(teamId: number, playerId: number): Promise<Player> {
    await this.checkTeamId(teamId);
    const player = await this.playerRepository.findByPlayerIdAndTeamId(
      playerId,
      teamId,
    );
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }

  async deleteAllPlayerByTournamentId(tournamentId: number): Promise<void> {
    await this.playerRepository.deleteAllPlayerByTournamentId(tournamentId);
  }
  async importPlayers(data: any[], teamId: number): Promise<Player[]> {
    const players: Player[] = [];

    for (const item of data) {
      const playerName = item['Player Name']?.trim();
      const dob = item['Date of Birth'];
      const date = Math.round((dob - 25569) * 86400 * 1000);
      const dateOfBirth = new Date(date);
      const phone = String(item['Phone'] || '').trim();

      const newPlayer = await this.createPlayer(
        teamId,
        playerName,
        dateOfBirth.toString(),
        phone,
      );
      players.push(newPlayer);
    }

    return players;
  }
}
