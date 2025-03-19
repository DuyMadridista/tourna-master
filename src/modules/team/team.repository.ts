import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Team } from './entities/team.entity';

@Injectable()
export class TeamRepository extends Repository<Team> {
  constructor(private readonly dataSource: DataSource) {
    super(Team, dataSource.createEntityManager());
  }

  async getAllTeamAndPlayerCount(
    tournamentId: number,
    page: number,
    size: number,
  ): Promise<{ teamId: number; teamName: string; playerCount: number }[]> {
    return this.createQueryBuilder('team')
      .select('team.teamId', 'teamId')
      .addSelect('team.teamName', 'teamName')
      .addSelect('COUNT(player.playerId)', 'playerCount')
      .leftJoin('player', 'player', 'team.teamId = player.team_id')
      .where('team.tournament_id = :tournamentId', { tournamentId })
      .groupBy('team.teamId, team.teamName')
      .orderBy('team.createdAt', 'DESC')
      .offset(page * size)
      .limit(size)
      .getRawMany();
  }

  async getTotalRecordsForTournament(tournamentId: number): Promise<number> {
    return this.createQueryBuilder('team')
      .where('team.tournament_id = :tournamentId', { tournamentId })
      .getCount();
  }

  async getAllTeamID(): Promise<number[]> {
    return this.createQueryBuilder('team')
      .select('team.teamId', 'teamId')
      .getRawMany()
      .then((result) => result.map((item) => item.teamId));
  }

  async findTeamsByName(
    tournamentId: number,
    keyword: string,
  ): Promise<Team[]> {
    return this.createQueryBuilder('team')
      .where('team.teamName = :keyword', { keyword })
      .andWhere('team.tournament_id = :tournamentId', { tournamentId })
      .getMany();
  }

  async findTeamById(
    tournamentId: number,
    teamId: number,
  ): Promise<Team | null> {
    return this.createQueryBuilder('team')
      .where('team.tournament_id = :tournamentId', { tournamentId })
      .andWhere('team.teamId = :teamId', { teamId })
      .getOne();
  }

  async deleteByTournamentIdAndTeamId(
    tournamentId: number,
    teamId: number,
  ): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from(Team)
      .where('tournamentId = :tournamentId', { tournamentId })
      .andWhere('teamId = :teamId', { teamId })
      .execute();
  }

  async findTeamByTournamentId(tournamentId: number): Promise<Team[]> {
    return this.createQueryBuilder('team')
      .where('team.tournament_id = :tournamentId', { tournamentId })
      .getMany();
  }

  async getTeamByTeamId(teamId: number): Promise<Team | null> {
    return this.findOne({ where: { teamId } });
  }

  async getTeamNameByTeamId(teamId: number): Promise<string | null> {
    const team = await this.createQueryBuilder('team')
      .select('team.teamName', 'teamName')
      .where('team.teamId = :teamId', { teamId })
      .getRawOne();
    return team?.teamName || null;
  }
}
