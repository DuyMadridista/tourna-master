import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { TeamService } from '../team/team.service';
import { EventDateService } from '../event-date/event-date.service';
import { MatchUtils } from 'src/helper/match.utils';
import { EventDate } from '../event-date/entities/event-date.entity';
import { Team } from '../team/entities/team.entity';
import {  GenerationDto } from './dto/';
import { MatchDto } from './dto/MatchDto';
import { TypeMatch } from 'src/enums/match-type.enum';
import { DateTime } from 'luxon';
import { now } from 'moment';
import { MatchRepository } from './match.repository';
import { ResultDto } from './dto/ResultDto';
import { MatchResultDto } from './dto/MatchResultDto';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
import { MatchOfLeaderBoardDto } from './dto/MatchOfLeaderBoardDto';
import { LeaderBoardDto } from './dto/LeaderBoardDto';
import { TournamentRepository } from '../tournament/tournament.repository';
import { TeamRepository } from '../team/team.repository';
@Injectable()
export class MatchService {

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: MatchRepository,
    private readonly tournamentRepository: TournamentRepository,
    private readonly teamRepository: TeamRepository,


    private readonly teamService: TeamService,
    private readonly eventDateService: EventDateService,
    private readonly matchUtils: MatchUtils
  ) {}

  async matchList(tournamentId: number): Promise<Team[][]> {
    const teams = await this.teamService.getAllTeamByTournamentId(tournamentId);
    if (teams.length === 0) {
      throw new BadRequestException('Tournament currently has no teams.');
    }

    const numberTeams = teams.length;
    if (numberTeams % 2 !== 0) {
      teams.push(new Team()); // Add dummy team
    }

    const matches: Team[][] = [];
    // Match scheduling logic
    for (let i = 0; i < numberTeams - 1; i++) {
      for (let j = 0; j < numberTeams / 2; j++) {
        if (teams[j] && teams[numberTeams - 1 - j]) {
          matches.push([teams[j], teams[numberTeams - 1 - j]]);
        }
      }
      // Rotate teams
      const lastTeam = teams.pop();
      teams.splice(1, 0, lastTeam);
    }
    teams.pop(); // Remove dummy team
    return matches;
  }

  timeSheetMatches(
    duration: number,
    betweenTime: number,
    numMatch: number,
    eventDates: EventDate[],
  ): Map<EventDate, Array<Array<DateTime>>> {
    if (numMatch < eventDates.length) {
      eventDates = eventDates
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, numMatch);    
    }
  
    let numEvent = eventDates.length;
  
    // Tính toán số trận trung bình cho mỗi ngày sự kiện.
    let timeSheetEachEventDate = Math.floor(numMatch / numEvent);
  
    // Tính toán số lượng slot thời gian cho mỗi ngày sự kiện.
    const numberOfTimeSheet = this.calculateTimeSlots(duration, betweenTime, eventDates);
  
    const countTimeSheet = Object.values(numberOfTimeSheet).reduce((sum, value) => sum + value, 0);
  
    if (countTimeSheet < numMatch) {
      throw new BadRequestException('The tournament schedule does not accommodate the current number of matches.');
    }
  
    const allEqual =
      new Set(Object.values(numberOfTimeSheet)).size === 1;
  
    if (allEqual) {
      eventDates
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    } else {
      eventDates.sort((a, b) => numberOfTimeSheet[a.id] - numberOfTimeSheet[b.id]);
    }
  
    const schedule: Map<EventDate, Array<Array<DateTime>>> = new Map();
  
    // Phân bổ lịch thi đấu cho mỗi ngày sự kiện.
    for (let i = 0; i < eventDates.length; i++) {
      // Chuyển startTime sang DateTime (sử dụng ngày mặc định là 1970-01-01)
      let startMatch = DateTime.fromISO(eventDates[i].startTime, { zone: 'local' });
      let endMatch = startMatch.plus({ minutes: duration });
      
      // Tạo ngày kết thúc mặc định (23:59:59)
      const endDate = DateTime.fromISO('1970-01-01T23:59:59', { zone: 'local' });
  
      const times: Array<Array<DateTime>> = [];
  
      if (numMatch < eventDates.length && schedule.has(eventDates[i])) {
        const lastScheduledMatch = schedule.get(eventDates[i]).at(-1);
        startMatch = lastScheduledMatch[1].plus({ minutes: betweenTime });
        endMatch = startMatch.plus({ minutes: duration });
        times.push(...schedule.get(eventDates[i]));
      }
  
      let j = 0;
      const thisEventDate = DateTime.fromISO(eventDates[i].date + 'T23:59:59', { zone: 'local' });
      let checkDateTime = DateTime.fromISO(eventDates[i].date + 'T' + eventDates[i].startTime, { zone: 'local' });
  
      // Đảm bảo thời gian nằm trong khung thời gian cho phép.
      while (
        startMatch <DateTime.fromISO( eventDates[i].endTime )&&
        endMatch <DateTime.fromISO( eventDates[i].endTime) &&
        j < timeSheetEachEventDate &&
        numMatch > 0 &&
        checkDateTime < thisEventDate
      ) {
        const matchTime: Array<DateTime> = [startMatch, endMatch];
        times.push(matchTime);
        startMatch = endMatch.plus({ minutes: betweenTime });
        endMatch = startMatch.plus({ minutes: duration });
        checkDateTime = checkDateTime.plus({ minutes: betweenTime + duration });
        numMatch--;
        j++;
      }
      numEvent--;
  
      // Nếu số slot ít hơn số trận trung bình thì tính lại.
      if (times.length < timeSheetEachEventDate && numEvent > 0) {
        timeSheetEachEventDate = Math.floor(numMatch / numEvent);
      }
  
      schedule.set(eventDates[i], times);
  
      if (numMatch < eventDates.length && numEvent === 0) {
        i = -1;
        timeSheetEachEventDate = 1;
        numEvent = eventDates.length;
      }
  
      if (numMatch === 0) {
        break;
      }
    }
  
    // Sắp xếp kết quả theo ngày.
    return new Map(
      [...schedule.entries()].sort((a, b) => a[0].date.getTime() - b[0].date.getTime())
    );
  }

  private calculateTimeSlots(
    duration: number,
    betweenTime: number,
    eventDates: EventDate[],
  ): Record<string, number> {
    const timeSlots: Record<string, number> = {};
    eventDates.forEach((eventDate) => {
      const start = DateTime.fromISO(eventDate.startTime, { zone: 'local' });
const end = DateTime.fromISO(eventDate.endTime, { zone: 'local' });
      const availableMinutes =
      end.diff(start, 'minutes');
      const slotCount = Math.floor(
        availableMinutes.as('minutes') / (duration + betweenTime),
      );
      timeSlots[eventDate.id] = slotCount;
    });
    return timeSlots;
  }

  async mappingMatchAndTime(matches: Team[][], schedule: Map<EventDate, DateTime[][]>, duration: number): Promise<MatchDto[]> {
    const matchList: Match[] = [];
    let j = 0;
    for (const [eventDate, times] of schedule) {
      for (const time of times) {
        const match = new Match();
        match.eventDate.id = eventDate.id;
        match.startTime = time[0].toString();
        match.endTime = time[1].toString();
        match.teamOne.teamId = matches[j][0].teamId;
        match.teamTwo.teamId = matches[j][1].teamId;
        match.matchDuration = duration;
        match.type = TypeMatch.MATCH; // Assuming you have a type for match
        matchList.push(match);
        j++;
      }
    }
    await this.matchRepository.save(matchList);
    return matchList.map(match => this.matchUtils.convertMatchToMatchDto(match));
  }

  async dragAndDropMatch(matchId: number, newEventDateId: number, newIndexOfMatch: number): Promise<GenerationDto[]> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    const oldEventDate = await this.eventDateService.findById(match.eventDate.id);
    const newEventDate = await this.eventDateService.findById(newEventDateId);

    if (new Date(match.startTime).getTime() <  Date.now() && oldEventDate.date <= new Date()) {
      throw new BadRequestException('Cannot change match in the past');
    }

    let result: GenerationDto[];
    if (oldEventDate.date === newEventDate.date) {
      result = await this.dragAndDropMatchInDate(match, oldEventDate, newIndexOfMatch);
    } else {
      if (newEventDate.date < new Date()) {
        throw new BadRequestException('Cannot change match to the past');
      }
      result = await this.dragAndDropMatchBetweenDate(match, oldEventDate, newEventDate, newIndexOfMatch);
    }

    return result;
  }

  async dragAndDropMatchInDate(
    match: Match,
    eventDate: EventDate,
    newIndexOfMatch: number,
  ): Promise<GenerationDto[]> {
    // Lấy danh sách các trận đấu theo EventDate ID
    let matches = await this.matchRepository.getAllByEventDateId(match.eventDate.id);
  
    const isAddNewMatchInDate = false;
    const isRemoveMatchInDate = false;
    const newEventDateId = null;
  
    // Thay đổi thời gian của trận đấu trong danh sách
    matches = await this.changeTimeMatchInDate(
      match,
      matches,
      newIndexOfMatch,
      newEventDateId,
      isAddNewMatchInDate,
      isRemoveMatchInDate,
    );
  
    // Lưu danh sách trận đấu
    await this.matchRepository.saveAll(matches);
  
    // Sắp xếp danh sách theo thời gian bắt đầu
    matches = matches.sort((a, b) => a.startTime.localeCompare(b.startTime));
  
    // Tạo danh sách GenerationDto
    const result: GenerationDto[] = [
      {
        eventDateId: eventDate.id,
        date: eventDate.date,
        startTime: eventDate.startTime,
        endTime: eventDate.endTime,
        matches: this.matchUtils.convertMatchToMatchDto(matches),
      },
    ];
  
    return result;
  }
  

  async dragAndDropMatchBetweenDate(
    match: Match,
    oldEventDate: EventDate,
    newEventDate: EventDate,
    newIndexOfMatch: number,
  ): Promise<GenerationDto[]> {
    /*
     Thay đổi tất cả trận đấu trong OldEventDate
    */
    let oldEventDateMatches = await this.matchRepository.getAllByEventDateId(oldEventDate.id);
    let isRemoveMatchInDate = true;
    let isAddNewMatchInDate = false;
  
    oldEventDateMatches = await this.changeTimeMatchInDate(
      match,
      oldEventDateMatches,
      newIndexOfMatch,
      newEventDate.id,
      isAddNewMatchInDate,
      isRemoveMatchInDate,
    );
  
    await this.matchRepository.saveAll(oldEventDateMatches);
  
    /*
     Thay đổi tất cả trận đấu trong NewEventDate
    */
    let newEventDateMatches = await this.matchRepository.getAllByEventDateId(newEventDate.id);
    isRemoveMatchInDate = false;
    isAddNewMatchInDate = true;
  
    newEventDateMatches = await this.changeTimeMatchInDate(
      match,
      newEventDateMatches,
      newIndexOfMatch,
      newEventDate.id,
      isAddNewMatchInDate,
      isRemoveMatchInDate,
    );
  
    await this.matchRepository.saveAll(newEventDateMatches);
  
    // Sắp xếp danh sách trận đấu theo thời gian bắt đầu
    oldEventDateMatches = oldEventDateMatches.sort((a, b) => a.startTime.localeCompare(b.startTime));
    newEventDateMatches = newEventDateMatches.sort((a, b) => a.startTime.localeCompare(b.startTime));
  
    // Trả về danh sách GenerationDto
    const result: GenerationDto[] = [
      {
        eventDateId: oldEventDate.id,
        date: oldEventDate.date,
        startTime: oldEventDate.startTime,
        endTime: oldEventDate.endTime,
        matches: this.matchUtils.convertMatchToMatchDto(oldEventDateMatches),
      },
      {
        eventDateId: newEventDate.id,
        date: newEventDate.date,
        startTime: newEventDate.startTime,
        endTime: newEventDate.endTime,
        matches: this.matchUtils.convertMatchToMatchDto(newEventDateMatches),
      },
    ];
  
    return result;
  }
  async changeTimeMatchInDate(
    match: Match,
    matchesInDate: Match[],
    newIndexOfMatch: number,
    newEventDateId: number,
    isAddNewMatchInDate: boolean,
    isRemoveMatchInDate: boolean,
  ): Promise<Match[]> {
    matchesInDate = matchesInDate.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    let oldIndex: number | null = null;
    if (!isAddNewMatchInDate) {
      oldIndex = matchesInDate.findIndex((m) => m.id === match.id);
      if (oldIndex === -1) {
        throw new NotFoundException(`Match with ID ${match.id} not found in the list.`);
      }
    }

    const duration = match.matchDuration;
    if (!isAddNewMatchInDate && !isRemoveMatchInDate) {
      newEventDateId = match.eventDate.id;
    }

    const newEventDate = await this.eventDateService.findByEventDateId(newEventDateId);
    if (!newEventDate) {
      throw new NotFoundException(`Event Date with ID ${newEventDateId} not found.`);
    }

    const tournament = await this.tournamentRepository.findActiveTournamentById(newEventDate.tournament.id);
    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${newEventDate.tournament.id} not found.`);
    }

    const betweenTime = tournament.timeBetween;
    const timeChange = duration + betweenTime;

    let newStartTime: string | null = null;
    let newEndTime: string | null = null;

    if (!isAddNewMatchInDate && !isRemoveMatchInDate) {
      if (oldIndex! < newIndexOfMatch) {
        for (let index = oldIndex! + 1; index < newIndexOfMatch; index++) {
          const eachMatch = matchesInDate[index];
          newStartTime = new Date(new Date(eachMatch.startTime).getTime() - timeChange * 60000).toString();
          newEndTime = new Date( new Date( eachMatch.endTime).getTime() - timeChange * 60000).toString();

          eachMatch.startTime = newStartTime;
          eachMatch.endTime = newEndTime;
        }
      } else {
        for (let index = oldIndex! - 1; index >= newIndexOfMatch - 1; index--) {
          const eachMatch = matchesInDate[index];
          newStartTime = new Date(new Date(eachMatch.startTime).getTime() + timeChange * 60000).toString();
          newEndTime = new Date( new Date( eachMatch.endTime).getTime() + timeChange * 60000).toString();

          eachMatch.startTime = newStartTime;
          eachMatch.endTime = newEndTime;
        }
      }
    }

    if (isRemoveMatchInDate) {
      for (let index = oldIndex! + 1; index < matchesInDate.length; index++) {
        const eachMatch = matchesInDate[index];
        newStartTime =  new Date(new Date(eachMatch.startTime).getTime() - timeChange * 60000).toString();
        newEndTime =  new Date(new Date(eachMatch.endTime).getTime() - timeChange * 60000).toString();

        eachMatch.startTime = newStartTime;
        eachMatch.endTime = newEndTime;
      }
      matchesInDate.splice(oldIndex!, 1);
    }

    if (isAddNewMatchInDate) {
      for (let index = matchesInDate.length - 1; index >= newIndexOfMatch - 1; index--) {
        const eachMatch = matchesInDate[index];
        newStartTime = new Date(new Date(eachMatch.startTime).getTime() + timeChange * 60000).toString();
        newEndTime = new Date( new Date(eachMatch.endTime).getTime() + timeChange * 60000).toString();

        if (newEndTime < eachMatch.endTime) {
          throw new BadRequestException('Not enough time to schedule.');
        }

        eachMatch.startTime = newStartTime;
        eachMatch.endTime = newEndTime;
      }

      newStartTime = matchesInDate.length
        ? new Date(new Date(matchesInDate[matchesInDate.length - 1].endTime).getTime() + betweenTime * 60000).toString()
        : new Date(newEventDate.startTime).toString();

      if (new Date(newStartTime).getTime() + duration * 60000 <= new Date(newStartTime).getTime()) {
        throw new BadRequestException('Not enough time to schedule.');
      }

      match.startTime = newStartTime;
      match.endTime = new Date(new Date(newStartTime).getTime() + duration * 60000).toString();
      match.eventDate.id = newEventDateId;

      if (new Date(match.startTime).getTime() < Date.now() && new Date(newEventDate.date).getDate() <= Date.now()) {
        throw new BadRequestException('Cannot move Match or Event to the past.');
      }
      

      matchesInDate.push(match);
    }

    return matchesInDate;
  }
  
  async updateMatchDetails(
    tournamentId: number,
    matchId: number,
    teamOneId: number,
    teamTwoId: number,
    matchDuration: number,
  ): Promise<any> {
    // Validate match exists in tournament
    await this.checkMatchInTournament(tournamentId, matchId);
    await this.isFinishedTournament(tournamentId);

    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const eventDate = await this.eventDateService.findByEventDateId(match.eventDate.id);
    if (!eventDate) {
      throw new NotFoundException('Event date not found');
    }

    const now = new Date();
    const nowDate = new Date(now.toISOString().split('T')[0]);
    const matchStartTime = new Date(now.toISOString().split('T')[0] + 'T' + match.startTime);


    if (eventDate.date < nowDate || (eventDate.date.getTime() === nowDate.getTime() && matchStartTime < now)) 
    {
      throw new BadRequestException('This match is finished');
    }

    if (matchDuration <= 0) {
      throw new BadRequestException('Match duration must be greater than 0');
    }

    if (
      !(await this.teamService.checkTeamExist(tournamentId, teamOneId)) || 
      !(await this.teamService.checkTeamExist(tournamentId, teamTwoId))
    ) {
      throw new NotFoundException('Team not found');
    }

    if (!teamOneId || !teamTwoId) {
      throw new BadRequestException('Team must not be null');
    }

    if (teamOneId === teamTwoId) {
      throw new BadRequestException('Two teams must not be equal');
    }

    if (matchDuration >= 24 * 60) {
      throw new BadRequestException('Match duration is too long');
    }

    let warningMessage = '';
    if (match.matchDuration !== matchDuration) {
      const timeChange = matchDuration - match.matchDuration;

      if (new Date(match.endTime).getTime() + timeChange * 60000 < new Date(match.endTime).getTime() && timeChange > 0) {
        throw new BadRequestException('Match time is out of range');
      }

      match.endTime = new Date(new Date(match.startTime).getTime() + matchDuration * 60000).toString();
      match.matchDuration = matchDuration;

      const matches = await this.matchRepository.getAllByEventDateIdOrOrderByStartTime(
        match.eventDate.id,
        match.startTime,
      );

      if (timeChange > 0) {
        let previousMatch = match;
        for (const m of matches) {
          if (previousMatch.endTime > m.startTime) {
            const delayTime = ( new Date(previousMatch.endTime).getTime() - new Date(m.startTime).getTime()) / 60000;

            if (new Date(m.endTime).getTime() + delayTime * 60000 > new Date(eventDate.endTime).getTime()) {
              warningMessage = 'Match time is out of event date range, please change event date time or match duration.';
            }

            if (
              (new Date(m.endTime).getTime() + delayTime * 60000 < new Date(m.endTime).getTime() ||
                new Date(m.startTime).getTime() + delayTime * 60000 < new Date(m.startTime).getTime()) &&
              delayTime > 0
            ) {
              throw new BadRequestException('Match time is out of range');
            }

            // Delay subsequent matches
            m.startTime = new Date(new Date(m.startTime).getTime() + delayTime * 60000).toString();
            m.endTime = new Date(new Date(m.endTime).getTime() + delayTime * 60000).toString();
          }
          previousMatch = m;
        }
      } else {
        for (const m of matches) {
          m.startTime = new Date( new Date(m.startTime).getTime() + timeChange * 60000).toString(); 
          m.endTime = new Date( new Date(m.endTime).getTime() + timeChange * 60000).toString();
        }
      }
    }

    match.teamOne.teamId = teamOneId;
    match.teamTwo.teamId = teamTwoId;

    const updatedMatch = await this.matchRepository.save(match);

    const responseObject: any = {
      success: true,
      data: updatedMatch,
    };

    if (warningMessage) {
      responseObject.warningMessage = warningMessage;
    }

    // Check for duplicate matches
    const duplicateMatches = await this.matchRepository.findDuplicateMatch(tournamentId, teamOneId, teamTwoId);
    if (duplicateMatches.length > 1) {
      responseObject.duplicateMatches = duplicateMatches;
    }

    return responseObject;
  }
  async isHaveMatchInDate(eventDateId: number): Promise<boolean> {
    return this.matchRepository.isHaveMatchInDate(eventDateId);
  }

  private async checkMatchInTournament(tournamentId: number, matchId: number): Promise<void> {
    const isInTournament = await this.matchRepository.isMatchInTournament(tournamentId, matchId);
    if (!isInTournament) {
      throw new NotFoundException('This match is not in this tournament');
    }
  }

  private async processArrayData(arrayData: any[]): Promise<ResultDto[]> {
    const resultMap: Map<string, ResultDto> = new Map();

    for (const data of arrayData) {
      // get date from data[0]
      const date = new Date(data[0]).toISOString().split('T')[0];
      let resultDto = resultMap.get(date);

      if (!resultDto) {
        resultDto = {
          date: date,
          matches: [],
        };
        resultMap.set(date, resultDto);
      }

      const match: MatchResultDto = {
        id: +data[1],
        teamOneId: +data[2],
        teamTwoId: +data[3],
        teamOneName:await this.teamRepository.getTeamNameByTeamId(+data[2]),
        teamTwoName: await this.teamRepository.getTeamNameByTeamId(+data[3]),
        teamOneResult: data[4] ? +data[4] : null,
        teamTwoResult: data[5] ? +data[5] : null,
        startTime: data[6],
        endTime: data[7] ,
        eventDateId: +data[8],
        title: '',
        type: TypeMatch.MATCH
      };

      resultDto.matches.push(match);
    }

    return Array.from(resultMap.values());
  }

  async getAllResult(tournamentId: number): Promise<ResultDto[]> {
    const matches = await this.matchRepository.getAllResult(tournamentId);
    return this.processArrayData(matches);
  }

  async updateMatchResult(
    tournamentId: number,
    matchId: number,
    teamOneResult: number,
    teamTwoResult: number,
  ): Promise<Match> {
    await this.checkMatchInTournament(tournamentId, matchId);

    const tournament = await this.tournamentRepository.findTournamentByIdAndIsDeletedFalse(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (['NEED_INFORMATION', 'DISCARDED'].includes(tournament.status)) {
      throw new BadRequestException('Match not found');
    }

    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const teamOne = await this.teamRepository.getTeamByTeamId(match.teamOne.teamId);
    const teamTwo = await this.teamRepository.getTeamByTeamId(match.teamTwo.teamId);

    if (teamOneResult === null || teamTwoResult === null) {
      throw new BadRequestException('Team result must not be null');
    }

    if (teamOneResult < 0 || teamTwoResult < 0) {
      throw new BadRequestException('Result must be equal to 0 or greater than 0');
    }

    this.updateScores(match, teamOne, teamTwo, teamOneResult, teamTwoResult);

    match.teamOneResult = teamOneResult;
    match.teamTwoResult = teamTwoResult;

    return this.matchRepository.save(match);
  }

  private updateScores(match: Match, teamOne: Team, teamTwo: Team, teamOneResult: number, teamTwoResult: number): void {
    const resultComparison = Math.sign(teamOneResult - teamTwoResult);

    if (!teamOne.score) teamOne.score = 0;
    if (!teamTwo.score) teamTwo.score = 0;

    if (match.teamOneResult === null || match.teamTwoResult === null) {
      teamOne.score += resultComparison > 0 ? 3 : resultComparison === 0 ? 1 : 0;
      teamTwo.score += resultComparison < 0 ? 3 : resultComparison === 0 ? 1 : 0;
    } else if (match.teamOneResult === match.teamTwoResult) {
      teamOne.score += resultComparison > 0 ? 2 : resultComparison === 0 ? 0 : -1;
      teamTwo.score += resultComparison < 0 ? 2 : resultComparison === 0 ? 0 : -1;
    } else if (match.teamOneResult > match.teamTwoResult) {
      teamOne.score -= resultComparison < 0 ? 3 : resultComparison === 0 ? 2 : 0;
      teamTwo.score += resultComparison < 0 ? 3 : resultComparison === 0 ? 1 : 0;
    } else {
      teamOne.score += resultComparison > 0 ? 3 : resultComparison === 0 ? 1 : 0;
      teamTwo.score -= resultComparison > 0 ? 3 : resultComparison === 0 ? 2 : 0;
    }

    teamOne.updatedAt = new Date();
    teamTwo.updatedAt = new Date();
  }
  async getLeaderBoardByTournamentId(tournamentId: number): Promise<LeaderBoardDto[]> {
    return this.matchRepository.getLeaderBoard(tournamentId);
  }

  /**
   * Get matches of leaderboard for a tournament by its ID
   */
  async getMatchOfLeaderBoardByTournamentId(tournamentId: number): Promise<MatchOfLeaderBoardDto[]> {
    return this.matchRepository.getMatchOfLeaderBoard(tournamentId);
  }

  /**
   * Delete all matches by tournament ID
   */
  async deleteAllByTournamentId(tournamentId: number): Promise<void> {
    await this.matchRepository.deleteMatchByTournamentId(tournamentId);
  }

  /**
   * Validate if a tournament is finished or discarded
   */
  async isFinishedTournament(tournamentId: number): Promise<void> {
    const tournament = await this.tournamentRepository.findTournamentByIdAndIsDeletedFalse(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (
      tournament.status === TournamentStatus.FINISHED ||
      tournament.status === TournamentStatus.DISCARDED
    ) {
      throw new BadRequestException('This tournament is finished or discarded');
    }
  }
}
