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
      .where('match.id = :id', { id })
      .getOne();

  }

  async isHaveMatchInDate(eventDateId: number): Promise<boolean> {
    const result = await this.createQueryBuilder('match')
      .where('match.eventDateId = :eventDateId', { eventDateId })
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
      .where('match.eventDateId IN (SELECT ed.id FROM EventDate ed WHERE ed.tournamentId = :tournamentId)', {
        tournamentId,
      })
      .execute();
  }

  async getAllByEventDateId(eventDateId: number): Promise<Match[]> {
    return this.createQueryBuilder('match')
      .where('match.eventDateId = :eventDateId', { eventDateId })
      .orderBy('match.startTime', 'ASC')
      .getMany();
  }

  async getAllResult(tournamentId: number): Promise<any[]> {
    return this.createQueryBuilder('match')
      .select([
        'eventDate.date as date',
        'match.id',
        'match.teamOneId',
        'match.teamTwoId',
        'match.teamOneResult',
        'match.teamTwoResult',
      ])
      .innerJoin('match.eventDate', 'eventDate')
      .innerJoin('eventDate.tournament', 'tournament')
      .where('tournament.id = :tournamentId', { tournamentId })
      .andWhere('match.teamOneId IS NOT NULL AND match.teamTwoId IS NOT NULL')
      .orderBy('eventDate.date', 'DESC')
      .getRawMany();
  }

  async isMatchInTournament(tournamentId: number, matchId: number): Promise<boolean> {
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
        '(match.teamOneId = :teamOneId AND match.teamTwoId = :teamTwoId) OR (match.teamOneId = :teamTwoId AND match.teamTwoId = :teamOneId)',
        { teamOneId, teamTwoId },
      )
      .getMany();
  }

  async getAllByEventDateIdOrOrderByStartTime(eventDateId: number, startTime: LocalTime): Promise<Match[]> {
    return this.createQueryBuilder('match')
      .innerJoin('match.eventDate', 'eventDate')
      .where('eventDate.id = :eventDateId', { eventDateId })
      .andWhere('match.startTime > :startTime', { startTime })
      .orderBy('match.startTime', 'ASC')
      .getMany();
  }

  async getLeaderBoard(tournamentId: number): Promise<LeaderBoardDto[]> {
    return this.createQueryBuilder('match')
      .select([
        'team.id AS teamId',
        'team.name AS teamName',
        'team.score AS score',
        'SUM(CASE WHEN team.id = match.teamOneId THEN match.teamOneResult ELSE match.teamTwoResult END) - SUM(CASE WHEN team.id = match.teamOneId THEN match.teamTwoResult ELSE match.teamOneResult END) AS theDiff',
        'SUM(CASE WHEN team.id = match.teamOneId THEN match.teamOneResult ELSE match.teamTwoResult END) AS totalResult',
      ])
      .innerJoin('match.teamOne', 'team')
      .innerJoin('match.eventDate', 'eventDate')
      .where('team.tournamentId = :tournamentId', { tournamentId })
      .groupBy('team.id')
      .orderBy('team.score', 'DESC')
      .addOrderBy('theDiff', 'DESC')
      .addOrderBy('totalResult', 'DESC')
      .getRawMany();
  }

  async getMatchOfLeaderBoard(tournamentId: number): Promise<MatchOfLeaderBoardDto[]> {
    return this.createQueryBuilder('match')
      .select([
        'match.id',
        'match.teamOneId',
        'team1.name AS teamOneName',
        'match.teamTwoId',
        'team2.name AS teamTwoName',
        'match.teamOneResult',
        'match.teamTwoResult',
        'eventDate.date',
        'match.startTime',
        'match.endTime',
      ])
      .innerJoin('match.teamOne', 'team1')
      .innerJoin('match.teamTwo', 'team2')
      .innerJoin('match.eventDate', 'eventDate')
      .where('team1.tournamentId = :tournamentId', { tournamentId })
      .groupBy('match.id')
      .orderBy('eventDate.date', 'DESC')
      .addOrderBy('match.startTime', 'DESC')
      .getRawMany();
  }

  async findAllDuplicateMatchByTournamentId(tournamentId: number): Promise<Match[]> {
    return this.createQueryBuilder('match1')
      .innerJoin('match1.eventDate', 'eventDate1')
      .innerJoin('eventDate1.tournament', 'tournament1')
      .where('tournament1.id = :tournamentId', { tournamentId })
      .andWhere(
        qb =>
          `EXISTS (${qb
            .subQuery()
            .select('1')
            .from(Match, 'match2')
            .innerJoin('match2.eventDate', 'eventDate2')
            .innerJoin('eventDate2.tournament', 'tournament2')
            .where('tournament2.id = :tournamentId')
            .andWhere('match1.id != match2.id')
            .andWhere(
              '(match1.teamOneId = match2.teamOneId AND match1.teamTwoId = match2.teamTwoId) OR (match1.teamOneId = match2.teamTwoId AND match1.teamTwoId = match2.teamOneId)',
            )
            .getQuery()})`,
      )
      .getMany();
  }
}
