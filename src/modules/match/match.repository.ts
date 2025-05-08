import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Match } from './entities/match.entity';
import { LeaderBoardDto } from './dto/LeaderBoardDto';
import { MatchOfLeaderBoardDto } from './dto/MatchOfLeaderBoardDto';
import { LocalTime } from '@js-joda/core';

@Injectable()
export class MatchRepository extends Repository<Match> {
  constructor(private dataSource: DataSource) {
    super(Match, dataSource.createEntityManager());
  }

  async saveAll(matches: Match[]): Promise<void> {
    await this.save(matches);
  }

  async findById(id: number): Promise<Match> {
    return this.createQueryBuilder('match')
      .leftJoinAndSelect('match.teamOne', 'teamOne')
      .leftJoinAndSelect('match.teamTwo', 'teamTwo')
      .leftJoinAndSelect('match.eventDate', 'eventDate')
      .leftJoinAndSelect('match.slot', 'slot')
      .where('match.id = :id', { id })
      .getOne();
  }

  async isHaveMatchInDate(eventDateId: number): Promise<boolean> {
    const result = await this.createQueryBuilder('match')
      .where('match.event_date_id = :eventDateId', { eventDateId })
      .getCount();
    return result > 0;
  }

  async isHaveMatchInTournament(tournamentId: number): Promise<boolean> {
    const result = await this.createQueryBuilder('match')
      .innerJoin('match.eventDate', 'eventDate')
      .where('eventDate.tournamentId = :tournamentId', { tournamentId })
      .getCount();
    return result > 0;
  }

  async deleteMatchByTournamentId(tournamentId: number): Promise<void> {
    await this.createQueryBuilder('match')
      .delete()
      .from(Match)
      .where(
        'matches.event_date_id IN (SELECT ed.id FROM event_dates ed WHERE ed.tournamentId = :tournamentId)',
        {
          tournamentId,
        },
      )
      .execute();
  }

  async getAllByEventDateId(eventDateId: number): Promise<Match[]> {
    return this.createQueryBuilder('match')
      .leftJoinAndSelect('match.teamOne', 'teamOne')
      .leftJoinAndSelect('match.teamTwo', 'teamTwo')
      .leftJoinAndSelect('match.eventDate', 'eventDate')
      .leftJoinAndSelect('match.slot', 'slot')
      .where('match.event_date_id = :eventDateId', { eventDateId })
      .orderBy('match.start_time', 'ASC')
      .getMany();
  }

  async getAllResult(tournamentId: number): Promise<any[]> {
    return this.createQueryBuilder('match')
      .select([
        'eventDate.date as date',
        'match.id',
        'match.team_one_id',
        'match.team_two_id',
        'match.team_one_result',
        'match.team_two_result',
        'match.start_time',
        'match.end_time',
        'match.type',
        'match.round',
        'eventDate.id as eventDateId',
      ])
      .innerJoin('match.eventDate', 'eventDate')
      .innerJoin('eventDate.tournament', 'tournament')
      .where('tournament.id = :tournamentId', { tournamentId })
      .andWhere(
        'match.team_one_id IS NOT NULL AND match.team_two_id IS NOT NULL',
      )
      .orderBy('eventDate.date', 'DESC')
      .getRawMany();
  }

  async isMatchInTournament(
    tournamentId: number,
    matchId: number,
  ): Promise<boolean> {
    const result = await this.createQueryBuilder('match')
      .innerJoin('match.eventDate', 'eventDate')
      .innerJoin('eventDate.tournament', 'tournament')
      .where('tournament.id = :tournamentId', { tournamentId })
      .andWhere('match.id = :matchId', { matchId })
      .getCount();
    return result > 0;
  }

  async findDuplicateMatch(
    tournamentId: number,
    teamOneId: number,
    teamTwoId: number,
  ): Promise<Match[]> {
    return this.createQueryBuilder('match')
      .innerJoin('match.eventDate', 'eventDate')
      .innerJoin('eventDate.tournament', 'tournament')
      .where('tournament.id = :tournamentId', { tournamentId })
      .andWhere(
        '(match.team_one_id = :teamOneId AND match.team_two_id = :teamTwoId) OR (match.team_one_id = :teamTwoId AND match.team_two_id = :teamOneId)',
        { teamOneId, teamTwoId },
      )
      .getMany();
  }

  async getAllByEventDateIdOrOrderByStartTime(
    eventDateId: number,
    startTime: LocalTime,
  ): Promise<Match[]> {
    const startTimeStr = startTime.toString(); // 'HH:mm' hoặc 'HH:mm:ss' tùy JS-Joda
    return this.createQueryBuilder('match')
      .innerJoin('match.eventDate', 'eventDate')
      .where('eventDate.id = :eventDateId', { eventDateId })
      .andWhere('match.start_time > :startTime', { startTime: startTimeStr })
      .orderBy('match.start_time', 'ASC')
      .getMany();
  }
  

  async getLeaderBoard(tournamentId: number): Promise<LeaderBoardDto[]> {
    return this.createQueryBuilder('match')
      .select([
        'team1.id AS teamId',
        'team1.name AS teamName',
        'team1.group AS `group`',
        'team1.score AS score',
        '(SELECT COUNT(*) FROM matches m WHERE (m.team_one_id = team1.id OR m.team_two_id = team1.id)) AS totalMatches',
        'SUM(CASE WHEN (team1.id = match.team_one_id AND match.team_one_result > match.team_two_result) OR (team1.id = match.team_two_id AND match.team_two_result > match.team_one_result) THEN 1 ELSE 0 END) AS wins',
        'SUM(CASE WHEN match.team_one_result = match.team_two_result THEN 1 ELSE 0 END) AS draws',
        'SUM(CASE WHEN (team1.id = match.team_one_id AND match.team_one_result < match.team_two_result) OR (team1.id = match.team_two_id AND match.team_two_result < match.team_one_result) THEN 1 ELSE 0 END) AS losses',
        'COALESCE(SUM(CASE WHEN team1.id = match.team_one_id THEN match.team_one_result ELSE match.team_two_result END), 0) AS goalsFor',
        'COALESCE(SUM(CASE WHEN team1.id = match.team_one_id THEN match.team_two_result ELSE match.team_one_result END), 0) AS goalsAgainst',
        'COALESCE(SUM(CASE WHEN team1.id = match.team_one_id THEN match.team_one_result ELSE match.team_two_result END) - SUM(CASE WHEN team1.id = match.team_one_id THEN match.team_two_result ELSE match.team_one_result END), 0) AS goalDifference',
      ])
      .innerJoin('match.teamOne', 'team1')
      .innerJoin('match.teamTwo', 'team2')
      .innerJoin('match.eventDate', 'eventDate')
      .where('team1.tournament_id = :tournamentId', { tournamentId })
      .groupBy('team1.id')
      .orderBy('team1.score', 'DESC')
      .addOrderBy('goalDifference', 'DESC')
      .addOrderBy('goalsFor', 'DESC')
      .getRawMany();
  }

  async getMatchOfLeaderBoard(
    tournamentId: number,
  ): Promise<MatchOfLeaderBoardDto[]> {
    return this.createQueryBuilder('match')
      .select([
        'match.id',
        'match.team_one_id as teamOneId',
        'team1.name AS teamOneName',
        'match.team_two_id as teamTwoId',
        'team2.name AS teamTwoName',
        'match.team_one_result as teamOneResult',
        'match.team_two_result as teamTwoResult',
        'eventDate.date as date',
        'match.start_time as startTime',
        'match.end_time as endTime',
        'CASE WHEN match.team_one_result > match.team_two_result THEN match.team_one_id WHEN match.team_two_result > match.team_one_result THEN match.team_two_id ELSE 0 END AS teamWinId',
      ])
      .innerJoin('match.teamOne', 'team1')
      .innerJoin('match.teamTwo', 'team2')
      .innerJoin('match.eventDate', 'eventDate')
      .where('team1.tournament_id = :tournamentId', { tournamentId })
      .groupBy('match.id')
      .orderBy('eventDate.date', 'DESC')
      .addOrderBy('match.start_time', 'DESC')
      .getRawMany();
  }

  async findAllDuplicateMatchByTournamentId(
    tournamentId: number,
  ): Promise<Match[]> {
    return this.createQueryBuilder('match1')
      .innerJoin('match1.eventDate', 'eventDate1')
      .innerJoin('eventDate1.tournament', 'tournament1')
      .where('tournament1.id = :tournamentId', { tournamentId })
      .andWhere(
        (qb) =>
          `EXISTS (${qb
            .subQuery()
            .select('1')
            .from(Match, 'match2')
            .innerJoin('match2.eventDate', 'eventDate2')
            .innerJoin('eventDate2.tournament', 'tournament2')
            .where('tournament2.id = :tournamentId')
            .andWhere('match1.id != match2.id')
            .andWhere(
              '(match1.team_one_id = match2.team_one_id AND match1.team_two_id = match2.team_two_id) OR (match1.team_one_id = match2.team_two_id AND match1.team_two_id = match2.team_one_id)',
            )
            .getQuery()})`,
      )
      .getMany();
  }
}
