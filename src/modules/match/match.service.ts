import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { TeamService } from '../team/team.service';
import { EventDateService } from '../event-date/event-date.service';
import { MatchUtils } from 'src/helper/match.utils';
import { EventDate } from '../event-date/entities/event-date.entity';
import { Team } from '../team/entities/team.entity';
import { GenerationDto } from '../generate/dto/GenerationDto';
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
import { ChronoUnit, LocalDate, LocalDateTime, LocalTime } from '@js-joda/core';
import { MATCHES } from 'class-validator';
import { Tournament } from '../tournament/entities/tournament.entity';
@Injectable()
export class MatchService {
  constructor(
    private readonly matchRepository: MatchRepository,

    private readonly tournamentRepository: TournamentRepository,
    private readonly teamRepository: TeamRepository,
    @Inject(forwardRef(() => TeamService))
    private readonly teamService: TeamService,
    @Inject(forwardRef(() => EventDateService))
    private readonly eventDateService: EventDateService,
    private readonly matchUtils: MatchUtils,
  ) {}

  async matchList(tournamentId: number): Promise<Team[][]> {
    const teams = await this.teamService.getAllTeamByTournamentId(tournamentId);
    if (teams.length === 0) {
      throw new BadRequestException('Tournament currently has no teams.');
    }

    const numberTeams = teams.length;
    const isOdd = numberTeams % 2 !== 0;
    const adjustedTeams = [...teams];

    if (isOdd) {
      adjustedTeams.push(new Team()); // Add dummy team
    }

    const totalRounds = adjustedTeams.length - 1;
    const matches: Team[][] = [];

    for (let round = 0; round < totalRounds; round++) {
      for (let i = 0; i < adjustedTeams.length / 2; i++) {
        const home = adjustedTeams[i];
        const away = adjustedTeams[adjustedTeams.length - 1 - i];
        if (home.teamId && away.teamId) {
          matches.push([home, away]);
        }
      }
      const fixed = adjustedTeams[0];
      const rest = adjustedTeams.slice(1);
      rest.unshift(rest.pop()!);
      adjustedTeams.splice(0, adjustedTeams.length, fixed, ...rest);
    }

    for (let i = matches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matches[i], matches[j]] = [matches[j], matches[i]];
    }
    return matches;
  }

  timeSheetMatches(
    duration: number,
    betweenTime: number,
    numMatch: number,
    eventDates: EventDate[],
  ): Map<EventDate, LocalTime[][]> {
    if (numMatch < eventDates.length) {
      eventDates = eventDates
        .sort((a, b) =>
          LocalDate.parse(a.date.toString()).compareTo(
            LocalDate.parse(b.date.toString()),
          ),
        )
        .slice(0, numMatch);
    }

    let remainingMatches = numMatch;
    let remainingEvents = eventDates.length;
    let matchesPerDay = Math.floor(remainingMatches / remainingEvents);

    const availableTimeSlots = this.matchUtils.timeSheet(
      duration,
      betweenTime,
      eventDates,
    );
    const totalTimeSlots = Array.from(availableTimeSlots.values()).reduce(
      (a, b) => a + b,
      0,
    );

    if (totalTimeSlots < numMatch) {
      throw new BadRequestException(
        'The tournament schedule does not accommodate the current number of matches.',
      );
    }

    const allEqualSlots = new Set(availableTimeSlots.values()).size === 1;
    eventDates.sort((a, b) => {
      if (allEqualSlots) {
        return LocalDate.parse(a.date.toString()).compareTo(
          LocalDate.parse(b.date.toString()),
        );
      }
      return (
        (availableTimeSlots.get(a) ?? 0) - (availableTimeSlots.get(b) ?? 0)
      );
    });

    const schedule = new Map<EventDate, LocalTime[][]>();

    for (let i = 0; i < eventDates.length; i++) {
      const currentEvent = eventDates[i];
      const parsedDate = LocalDate.parse(currentEvent.date.toString());
      const latestPossibleTime = LocalTime.of(23, 59, 59);
      const latestPossibleDateTime = LocalDateTime.of(
        parsedDate,
        latestPossibleTime,
      );

      let startTime = currentEvent.startTime;
      let endTime = startTime.plusMinutes(duration);
      const matchSlots: LocalTime[][] = schedule.get(currentEvent) ?? [];

      if (numMatch < eventDates.length && schedule.has(currentEvent)) {
        const lastMatch = matchSlots[matchSlots.length - 1];
        startTime = lastMatch[1].plusMinutes(betweenTime);
        endTime = startTime.plusMinutes(duration);
      }

      let addedMatches = 0;
      let currentDateTime = LocalDateTime.of(parsedDate, startTime);

      while (
        endTime.isBefore(currentEvent.endTime) &&
        addedMatches < matchesPerDay &&
        remainingMatches > 0 &&
        currentDateTime.isBefore(latestPossibleDateTime)
      ) {
        matchSlots.push([startTime, endTime]);
        startTime = endTime.plusMinutes(betweenTime);
        endTime = startTime.plusMinutes(duration);
        currentDateTime = currentDateTime.plusMinutes(duration + betweenTime);
        remainingMatches--;
        addedMatches++;
      }

      remainingEvents--;
      if (matchSlots.length < matchesPerDay && remainingEvents > 0) {
        matchesPerDay = Math.floor(remainingMatches / remainingEvents);
      }

      schedule.set(currentEvent, matchSlots);

      // Nếu số trận ít hơn số ngày nhưng chưa chia đủ → chạy lại
      if (
        numMatch < eventDates.length &&
        remainingEvents === 0 &&
        remainingMatches > 0
      ) {
        i = -1;
        matchesPerDay = 1;
        remainingEvents = eventDates.length;
      }

      if (remainingMatches === 0) break;
    }

    return new Map(
      [...schedule.entries()].sort((a, b) =>
        LocalDate.parse(a[0].date.toString()).compareTo(
          LocalDate.parse(b[0].date.toString()),
        ),
      ),
    );
  }

  async mappingMatchAndTime(
    matches: Team[][],
    schedule: Map<EventDate, LocalTime[][]>,
    duration: number,
  ): Promise<MatchDto[]> {
    const matchList: Match[] = [];
    let j = 0;

    // Ghép cặp các trận đấu với thời gian tương ứng
    for (const [eventDate, timeSlots] of schedule.entries()) {
      for (let i = 0; i < timeSlots.length; i++, j++) {
        const times = timeSlots[i];
        const match = new Match();
        match.eventDate = { id: eventDate.id } as EventDate;
        match.teamOne = { teamId: matches[j][0].teamId } as Team;
        match.teamTwo = { teamId: matches[j][1].teamId } as Team;
        match.startTime = times[0];
        match.endTime = times[1];
        match.matchDuration = duration;
        match.type = TypeMatch.MATCH;
        matchList.push(match);
      }
    }

    await this.matchRepository.saveAll(matchList);
    const matchDTOs: MatchDto[] = [];
    for (const eventDate of schedule.keys()) {
      const lastMatches = await this.matchRepository.getAllByEventDateId(
        eventDate.id,
      );
      const dtos = await Promise.all(
        lastMatches.map((match) =>
          this.matchUtils.convertMatchToMatchDTO(match),
        ),
      );
      matchDTOs.push(...dtos);
    }

    return matchDTOs;
  }

  async dragAndDropMatch(
    matchId: number,
    newEventDateId: number,
    newIndexOfMatch: number,
  ): Promise<GenerationDto[]> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['eventDate'],
    });
    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }

    const oldEventDate = await this.eventDateService.findById(
      match.eventDate.id,
    );
    const newEventDate = await this.eventDateService.findById(newEventDateId);

    if (
      LocalTime.parse(match.startTime.toString()).isBefore(LocalTime.now()) &&
      LocalDate.parse(oldEventDate.date.toString()).isBefore(LocalDate.now())
    ) {
      throw new BadRequestException('Cannot change match in the past');
    }

    let result: GenerationDto[];
    if (oldEventDate.date === newEventDate.date) {
      result = await this.dragAndDropMatchInDate(
        match,
        oldEventDate,
        newIndexOfMatch,
      );
    } else {
      if (
        LocalDate.parse(newEventDate.date.toString()).isBefore(LocalDate.now())
      ) {
        throw new BadRequestException('Cannot change match to the past');
      }
      result = await this.dragAndDropMatchBetweenDate(
        match,
        oldEventDate,
        newEventDate,
        newIndexOfMatch,
      );
    }

    return result;
  }

  async dragAndDropMatchInDate(
    match: Match,
    eventDate: EventDate,
    newIndexOfMatch: number,
  ): Promise<GenerationDto[]> {
    // Lấy danh sách các trận đấu theo EventDate ID
    let matches = await this.matchRepository.getAllByEventDateId(
      match.eventDate.id,
    );

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

    await this.matchRepository.saveAll(matches);

    matches = matches.sort((a, b) => a.startTime.compareTo(b.startTime));

    const result: GenerationDto[] = [
      {
        eventDateId: eventDate.id,
        date: eventDate.date,
        startTime: eventDate.startTime,
        endTime: eventDate.endTime,
        matches: (await this.matchUtils.convertMatchToMatchDto(
          matches,
        )) as unknown as MatchDto[],
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
    // Xử lý xóa match khỏi oldEventDate
    let oldEventDateMatches = await this.matchRepository.getAllByEventDateId(
      oldEventDate.id,
    );
    oldEventDateMatches = await this.changeTimeMatchInDate(
      match,
      oldEventDateMatches,
      newIndexOfMatch,
      oldEventDate.id,
      false, // isAddNewMatchInDate
      true, // isRemoveMatchInDate
    );
    await this.matchRepository.saveAll(oldEventDateMatches);

    // Xử lý thêm match vào newEventDate
    let newEventDateMatches = await this.matchRepository.getAllByEventDateId(
      newEventDate.id,
    );
    newEventDateMatches = await this.changeTimeMatchInDate(
      match,
      newEventDateMatches,
      newIndexOfMatch,
      newEventDate.id,
      true, // isAddNewMatchInDate
      false, // isRemoveMatchInDate
    );
    await this.matchRepository.saveAll(newEventDateMatches);

    // Trả về danh sách GenerationDto
    const result: GenerationDto[] = [
      {
        eventDateId: oldEventDate.id,
        date: oldEventDate.date,
        startTime: oldEventDate.startTime,
        endTime: oldEventDate.endTime,
        matches: this.matchUtils.convertMatchToMatchDto(
          oldEventDateMatches,
        ) as unknown as MatchDto[],
      },
      {
        eventDateId: newEventDate.id,
        date: newEventDate.date,
        startTime: newEventDate.startTime,
        endTime: newEventDate.endTime,
        matches: this.matchUtils.convertMatchToMatchDto(
          newEventDateMatches,
        ) as unknown as MatchDto[],
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
    // Sort matches by start time
    matchesInDate = matchesInDate.sort((a, b) =>
      a.startTime.compareTo(b.startTime),
    );

    let oldIndex: number | null = null;
    if (!isAddNewMatchInDate) {
      oldIndex = matchesInDate.findIndex((m) => m.id === match.id);
    }

    const duration = match.matchDuration;

    if (!isAddNewMatchInDate && !isRemoveMatchInDate) {
      newEventDateId = match.eventDate.id;
    }

    const newEventDate =
      await this.eventDateService.findByEventDateId(newEventDateId);
    if (!newEventDate) {
      throw new NotFoundException(
        `Not found Event Date with Id: ${newEventDateId}`,
      );
    }

    const tournament = await this.tournamentRepository.findActiveTournamentById(
      newEventDate.tournament.id,
    );
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const betweenTime = tournament.timeBetween;
    const timeChange = duration + betweenTime;
    let newStartTime: LocalTime;
    let newEndTime: LocalTime;
    const timeDifference = 0;

    // Case: Move match within the same date
    if (!isAddNewMatchInDate && !isRemoveMatchInDate) {
      // Remove match khỏi danh sách cũ
      matchesInDate.splice(oldIndex!, 1);
      // Chèn vào vị trí mới
      matchesInDate.splice(newIndexOfMatch, 0, match);

      // Cập nhật lại toàn bộ thời gian trận đấu sau khi reorder
      let currentStartTime = newEventDate.startTime;

      for (let i = 0; i < matchesInDate.length; i++) {
        const eachMatch = matchesInDate[i];
        eachMatch.startTime = currentStartTime;
        eachMatch.endTime = currentStartTime.plusMinutes(
          eachMatch.matchDuration,
        );
        // Update currentStartTime cho trận tiếp theo
        currentStartTime = eachMatch.endTime.plusMinutes(betweenTime);
      }
    }

    // Case: Remove match from the date
    if (isRemoveMatchInDate) {
      for (let i = oldIndex! + 1; i < matchesInDate.length; i++) {
        const eachMatch = matchesInDate[i];
        eachMatch.startTime = eachMatch.startTime.minusMinutes(timeChange);
        eachMatch.endTime = eachMatch.endTime.minusMinutes(timeChange);
      }
      matchesInDate.splice(oldIndex!, 1);
    }

    // Case: Add new match to date
    if (isAddNewMatchInDate) {
      // Insert match vào vị trí mới
      matchesInDate.splice(newIndexOfMatch, 0, match);

      // Cập nhật lại thời gian toàn bộ trận đấu theo thứ tự mới
      let currentStartTime = newEventDate.startTime;
      for (let i = 0; i < matchesInDate.length; i++) {
        const eachMatch = matchesInDate[i];
        eachMatch.startTime = currentStartTime;
        eachMatch.endTime = currentStartTime.plusMinutes(
          eachMatch.matchDuration,
        );
        currentStartTime = eachMatch.endTime.plusMinutes(betweenTime);
      }

      match.eventDate.id = newEventDateId;

      // Check if match is scheduled in the past
      const now = new Date();
      const matchDateTime = new Date(
        `${newEventDate.date}T${match.startTime.toString()}`,
      );
      if (matchDateTime < now) {
        throw new BadRequestException('Cannot move Match or Event to the past');
      }
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
    await this.checkMatchInTournament(tournamentId, matchId);
    await this.isFinishedTournament(tournamentId);

    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const eventDate = await this.eventDateService.findByEventDateId(
      match.eventDate.id,
    );
    if (!eventDate) {
      throw new NotFoundException('Event date not found');
    }

    const now = LocalTime.now();
    const nowDate = LocalDate.now();

    if (
      eventDate.date.isBefore(nowDate) ||
      (eventDate.date.equals(nowDate) && match.startTime.isBefore(now))
    ) {
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

      if (
        match.endTime.plusMinutes(timeChange).isBefore(match.endTime) &&
        timeChange > 0
      ) {
        throw new BadRequestException('Match time is out of range');
      }

      match.endTime = match.startTime.plusMinutes(matchDuration);
      match.matchDuration = matchDuration;

      const matches =
        await this.matchRepository.getAllByEventDateIdOrOrderByStartTime(
          match.eventDate.id,
          match.startTime,
        );

      if (timeChange > 0) {
        let previousMatch = match;
        for (const m of matches) {
          if (previousMatch.endTime.isAfter(m.startTime)) {
            const delayTime = previousMatch.endTime.until(
              m.startTime,
              ChronoUnit.MINUTES,
            );

            if (m.endTime.plusMinutes(delayTime).isAfter(eventDate.endTime)) {
              warningMessage =
                'Match time is out of event date range, please change event date time or match duration.';
            }

            if (
              (m.endTime.plusMinutes(delayTime).isBefore(m.endTime) ||
                m.startTime.plusMinutes(delayTime).isBefore(m.startTime)) &&
              delayTime > 0
            ) {
              throw new BadRequestException('Match time is out of range');
            }

            // Delay subsequent matches
            m.startTime = m.startTime.plusMinutes(delayTime);
            m.endTime = m.endTime.plusMinutes(delayTime);
          }
          previousMatch = m;
        }
      } else {
        for (const m of matches) {
          m.startTime = m.startTime.plusMinutes(timeChange);
          m.endTime = m.endTime.plusMinutes(timeChange);
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
    const duplicateMatches = await this.matchRepository.findDuplicateMatch(
      tournamentId,
      teamOneId,
      teamTwoId,
    );
    if (duplicateMatches.length > 1) {
      responseObject.duplicateMatches = duplicateMatches;
    }

    return responseObject;
  }
  async isHaveMatchInDate(eventDateId: number): Promise<boolean> {
    return this.matchRepository.isHaveMatchInDate(eventDateId);
  }

  private async checkMatchInTournament(
    tournamentId: number,
    matchId: number,
  ): Promise<void> {
    const isInTournament = await this.matchRepository.isMatchInTournament(
      tournamentId,
      matchId,
    );
    if (!isInTournament) {
      throw new NotFoundException('This match is not in this tournament');
    }
  }

  private async processArrayData(arrayData: any[]): Promise<ResultDto[]> {
    const resultMap: Map<string, ResultDto> = new Map();

    for (const data of arrayData) {
      const date = new Date(data?.date).toISOString().split('T')[0];
      let resultDto = resultMap.get(date);

      if (!resultDto) {
        resultDto = {
          date: date,
          matches: [],
        };
        resultMap.set(date, resultDto);
      }

      const match: MatchResultDto = {
        id: +data?.match_id,
        teamOneId: +data?.team_one_id,
        teamTwoId: +data?.team_two_id,
        teamOneName: await this.teamRepository.getTeamNameByTeamId(
          +data?.team_one_id,
        ),
        teamTwoName: await this.teamRepository.getTeamNameByTeamId(
          +data?.team_two_id,
        ),
        teamOneResult: data?.team_one_result ? +data?.team_one_result : null,
        teamTwoResult: data?.team_two_result ? +data?.team_two_result : null,
        startTime: data?.start_time,
        endTime: data?.end_time,
        eventDateId: +data?.eventDateId,
        title: '',
        type: TypeMatch.MATCH,
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

    const tournament =
      await this.tournamentRepository.findTournamentByIdAndIsDeletedFalse(
        tournamentId,
      );
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

    const teamOne = await this.teamRepository.getTeamByTeamId(
      match.teamOne.teamId,
    );
    const teamTwo = await this.teamRepository.getTeamByTeamId(
      match.teamTwo.teamId,
    );

    if (teamOneResult === null || teamTwoResult === null) {
      throw new BadRequestException('Team result must not be null');
    }

    if (teamOneResult < 0 || teamTwoResult < 0) {
      throw new BadRequestException(
        'Result must be equal to 0 or greater than 0',
      );
    }

    this.updateScores(match, teamOne, teamTwo, teamOneResult, teamTwoResult);

    match.teamOneResult = teamOneResult;
    match.teamTwoResult = teamTwoResult;

    return this.matchRepository.save(match);
  }

  private async updateScores(
    match: Match,
    teamOne: Team,
    teamTwo: Team,
    teamOneResult: number,
    teamTwoResult: number,
  ): Promise<void> {
    // Khởi tạo điểm số nếu chưa có
    if (!teamOne.score) teamOne.score = 0;
    if (!teamTwo.score) teamTwo.score = 0;

    // Nếu là kết quả mới (chưa có kết quả trước đó)
    if (match.teamOneResult === null || match.teamTwoResult === null) {
      if (teamOneResult > teamTwoResult) {
        teamOne.score += 3; // Thắng
        teamTwo.score += 0; // Thua
      } else if (teamOneResult < teamTwoResult) {
        teamOne.score += 0; // Thua
        teamTwo.score += 3; // Thắng
      } else {
        teamOne.score += 1; // Hòa
        teamTwo.score += 1; // Hòa
      }
    } 
    // Nếu đang cập nhật kết quả mới
    else {
      // Nếu kết quả cũ là hòa
      if (match.teamOneResult === match.teamTwoResult) {
        if (teamOneResult > teamTwoResult) {
          teamOne.score += 2; // Thắng
          teamTwo.score -= 1; // Thua
        } else if (teamOneResult < teamTwoResult) {
          teamOne.score -= 1; // Thua
          teamTwo.score += 2; // Thắng
        }
        // Nếu vẫn hòa thì không thay đổi điểm
      }
      // Nếu teamOne thắng trước đó
      else if (match.teamOneResult > match.teamTwoResult) {
        if (teamOneResult < teamTwoResult) {
          teamOne.score -= 3; // Thua
          teamTwo.score += 3; // Thắng
        } else if (teamOneResult === teamTwoResult) {
          teamOne.score -= 2; // Hòa
          teamTwo.score += 1; // Hòa
        }
        // Nếu vẫn thắng thì không thay đổi điểm
      }
      // Nếu teamTwo thắng trước đó
      else {
        if (teamOneResult > teamTwoResult) {
          teamOne.score += 3; // Thắng
          teamTwo.score -= 3; // Thua
        } else if (teamOneResult === teamTwoResult) {
          teamOne.score += 1; // Hòa
          teamTwo.score -= 2; // Hòa
        }
        // Nếu vẫn thắng thì không thay đổi điểm
      }
    }

    teamOne.updatedAt = new Date();
    teamTwo.updatedAt = new Date();
    await this.teamRepository.save(teamOne);
    await this.teamRepository.save(teamTwo);
  }
  async getLeaderBoardByTournamentId(
    tournamentId: number,
  ): Promise<LeaderBoardDto[]> {
    return this.matchRepository.getLeaderBoard(tournamentId);
  }

  /**
   * Get matches of leaderboard for a tournament by its ID
   */
  async getMatchOfLeaderBoardByTournamentId(
    tournamentId: number,
  ): Promise<MatchOfLeaderBoardDto[]> {
    return this.matchRepository.getMatchOfLeaderBoard(tournamentId);
  }

  /**
   * Delete all matches by tournament ID
   */

  /**
   * Validate if a tournament is finished or discarded
   */
  async isFinishedTournament(tournamentId: number): Promise<void> {
    const tournament =
      await this.tournamentRepository.findTournamentByIdAndIsDeletedFalse(
        tournamentId,
      );
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

  async getMatchById(matchId: number): Promise<Match> {
    return this.matchRepository.findById(matchId);
  }
  async getMatchByEventDateId(eventDateId: number): Promise<Match[]> {
    return this.matchRepository.getAllByEventDateId(eventDateId);
  }

  async saveAll(matches: Match[]): Promise<void> {
    await this.matchRepository.saveAll(matches);
  }
  async findAllDuplicateMatchByTournamentId(
    tournamentId: number,
  ): Promise<Match[]> {
    return this.matchRepository.findAllDuplicateMatchByTournamentId(
      tournamentId,
    );
  }
  async deleteAllMatchByTournamentId(tournamentId: number): Promise<void> {
    await this.matchRepository.deleteMatchByTournamentId(tournamentId);
  }
}
