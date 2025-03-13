import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { TeamPlayerDto } from './dto/team-player.dto';
import { TournamentRepository } from '../tournament/tournament.repository';
// import { MatchRepository } from '../match/match.repository';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
import { TournamentStatusPermission } from 'src/enums/TournamentStatusPermission';
import { MatchRepository } from '../match/match.repository';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @Inject(forwardRef(() => TournamentRepository))
    private readonly tournamentRepository: TournamentRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  async getAllTeamAndPlayerCount(
    tournamentId: number,
    page: number,
    size: number,
  ): Promise<TeamPlayerDto[]> {
    const skip = page * size;
    const teams = await this.teamRepository
    .createQueryBuilder('team')
    .leftJoin('team.players', 'player')
    .select('team.id', 'teamId')
    .addSelect('team.name', 'teamName')
    .addSelect('COUNT(player.playerId)', 'playerCount')
    .where('team.tournament_id = :tournamentId', { tournamentId })
    .groupBy('team.id')
    .addGroupBy('team.teamName')
    .orderBy('team.createdAt', 'DESC')
    .limit(size)
    .offset(skip)
    .getRawMany();
  
  return teams.map(
    (team) =>
      new TeamPlayerDto(team.teamId, team.teamName, Number(team.playerCount)),
  );
  
  }

  async hasExistTeamName(tournamentId: number, teamName: string): Promise<boolean> {
    const teams = await this.teamRepository.find({
      where: { tournament: { id: tournamentId }, teamName: teamName.trim() },
    });
    return teams.length > 0;
  }

  async createTeam(teamName: string, tournamentId: number): Promise<Team> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });
    
    if (!tournament) {
      throw new BadRequestException('Tournament has been deleted, discarded, or finished.');
    }

    const exists = await this.hasExistTeamName(tournamentId, teamName);
    if (exists) {
      throw new BadRequestException('Team name already exists.');
    }

    const team = this.teamRepository.create({
      teamName: teamName.trim(),
      tournament,
      createdAt: new Date(),
    });
    await this.teamRepository.save(team);
    return team;
  }

  async updateTeam(
    tournamentId: number,
    teamId: number,
    teamName: string,
  ): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { tournament: { id: tournamentId }, teamId } });
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    if (team.teamName !== teamName.trim()) {
      const exists = await this.hasExistTeamName(tournamentId, teamName);
      if (exists) {
        throw new BadRequestException('Team name already exists.');
      }
    }

    team.teamName = teamName.trim();
    team.updatedAt = new Date();
    return this.teamRepository.save(team);
  }

  async deleteTeam(tournamentId: number, teamId: number): Promise<Team> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });
    
    if (!tournament) {
      throw new NotFoundException('Tournament not found.');
    }

    if (!(TournamentStatusPermission.allowGenerateStatus.includes(tournament.status))) {
      throw new BadRequestException(
        'Cannot delete a team from a tournament that is in progress, finished, or discarded.',
      );
    }

    await this.matchRepository.deleteMatchByTournamentId(tournamentId);
    tournament.status =TournamentStatus.NEED_INFORMATION;
    await this.tournamentRepository.save(tournament);

    const team = await this.teamRepository.findOne({ where: { tournament: { id: tournamentId }, teamId } });
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    await this.teamRepository.remove(team);
    return team;
  }

  async getTotalRecordsForTournament(tournamentId: number): Promise<number> {
    return this.teamRepository.count({ where: { tournament: { id: tournamentId } } });
  }

  async deleteTeamByTournamentId(tournamentId: number): Promise<void> {
    const teams = await this.teamRepository.find({ where: {tournament: { id: tournamentId }  } });
    await this.teamRepository.remove(teams);
  }

  async findTeamById(tournamentId: number, teamId: number): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { tournament: { id: tournamentId }, teamId } });
    if (!team) {
      throw new NotFoundException('Team not found.');
    }
    return team;
  }

  async getAllTeamByTournamentId(tournamentId: number): Promise<Team[]> {
    return this.teamRepository.find({ where: { tournament: { id: tournamentId} } });
  }

  async getTeamById(teamId: number): Promise<Team> {
    return this.teamRepository.findOne({ where: { teamId } });
  }

  async checkTeamExist(tournamentId: number, teamId: number): Promise<boolean> {
    const team = await this.teamRepository.findOne({ where: { tournament: { id: tournamentId }, teamId } });
    return !!team;
  }
}
