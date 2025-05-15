import { Length } from 'class-validator';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Raw, Repository } from 'typeorm';
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
import { PlayerMatch } from '../player-match/player-match.entity';
import { Slot } from '../event-date/entities/slot.entity';
import { TournamentFormat } from 'src/enums/tournament-format.enum';
import { Tournament } from '../tournament/entities/tournament.entity';
import { GoogleCalendarHelper } from 'src/helper/google-calendar';
@Injectable()
export class MatchService {
  constructor(
    private readonly matchRepository: MatchRepository,

    private readonly tournamentRepository: TournamentRepository,
    @InjectRepository(PlayerMatch)
    private readonly playerMatchRepository: Repository<PlayerMatch>,
    private readonly teamRepository: TeamRepository,
    @Inject(forwardRef(() => TeamService))
    private readonly teamService: TeamService,
    @Inject(forwardRef(() => EventDateService))
    private readonly eventDateService: EventDateService,
    private readonly matchUtils: MatchUtils,
    @InjectRepository(Slot)
    private readonly slotRepository: Repository<Slot>,
  ) {}


  async getUpcomingMatch(tournamentId: number): Promise<Match[]> {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    return await this.matchRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.eventDate', 'eventDate')
      .leftJoinAndSelect('match.teamOne', 'teamOne')
      .leftJoinAndSelect('match.teamTwo', 'teamTwo')
      .where('eventDate.tournamentId = :tournamentId', { tournamentId })
      .andWhere(
        `(eventDate.date > :today OR (eventDate.date = :today AND eventDate._startTime > :currentTime))`,
        {
          today,
          currentTime,
        },
      )
      .andWhere('match.teamOneResult IS NULL')
      .andWhere('match.teamTwoResult IS NULL')
      .orderBy('eventDate.date', 'ASC')
      .addOrderBy('eventDate._startTime', 'ASC')
      .getMany();
  }

  async getTotalMatch(tournamentId: number): Promise<number> {
    return await this.matchRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.eventDate', 'eventDate')
      .leftJoinAndSelect('match.teamOne', 'teamOne')
      .leftJoinAndSelect('match.teamTwo', 'teamTwo')
      .where('eventDate.tournamentId = :tournamentId', { tournamentId })
      .orderBy('eventDate.date', 'ASC')
      .addOrderBy('eventDate._startTime', 'ASC')
      .getCount();
  }
  

  async matchList(tournamentId: number): Promise<Team[][]> {
    const teams = await this.teamService.getAllTeamByTournamentId(tournamentId);
    if (teams.length === 0) {
      return [];
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
    matches: Team[][],
    eventDates: EventDate[],
  ): Map<EventDate, LocalTime[][]> {
    const numMatch = matches.length;
    if (eventDates.length > numMatch) {
      eventDates = eventDates
        .sort((a, b) =>
          LocalDate.parse(a.date.toString()).compareTo(
            LocalDate.parse(b.date.toString()),
          ),
        )
        .slice(0, numMatch);
    }

    const totalDays = eventDates.length;
    const availableSlots = this.matchUtils.timeSheet(
      duration,
      betweenTime,
      eventDates,
    );

    const totalSlots = Array.from(availableSlots.values()).reduce(
      (sum, val) => sum + val,
      0,
    );

    if (totalSlots < numMatch) {
      throw new BadRequestException(
        'The tournament schedule does not accommodate the current number of matches.',
      );
    }

    const sortedDates = [...eventDates].sort((a, b) => {
      const slotA = availableSlots.get(a) ?? 0;
      const slotB = availableSlots.get(b) ?? 0;
      return slotB - slotA;
    });

    const basePerDay = Math.floor(numMatch / totalDays);
    let extra = numMatch % totalDays;

    const matchesPerDay = new Map<EventDate, number>();
    for (const day of sortedDates) {
      const assign = basePerDay + (extra > 0 ? 1 : 0);
      const available = availableSlots.get(day)!;

      const finalAssign = Math.min(assign, available);
      matchesPerDay.set(day, finalAssign);
      if (extra > 0) extra--;
    }

    const schedule = new Map<EventDate, LocalTime[][]>();
    for (const day of sortedDates) {
      const parsedDate = LocalDate.parse(day.date.toString());
      let startTime = day.startTime;
      let endTime = startTime.plusMinutes(duration);
      const timeSlots: LocalTime[][] = [];

      const matchCount = matchesPerDay.get(day)!;

      for (let i = 0; i < matchCount; i++) {
        if (endTime.isAfter(day.endTime)) break;

        timeSlots.push([startTime, endTime]);

        startTime = endTime.plusMinutes(betweenTime);
        endTime = startTime.plusMinutes(duration);
      }

      schedule.set(day, timeSlots);
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
    const remainingMatches = [...matches]; // Clone để xử lý
    const usedTeamsByDate = new Map<number, Set<number>>();
    const eventDates = Array.from(schedule.entries()).sort(([a], [b]) =>
      LocalDate.parse(a.date.toString()).compareTo(LocalDate.parse(b.date.toString()))
    );
  
    // Initialize usedTeams map
    for (const [eventDate] of eventDates) {
      usedTeamsByDate.set(eventDate.id, new Set<number>());
    }
  
    // Loop theo ngày -> slot -> tìm trận phù hợp
    for (const [eventDate, timeSlots] of eventDates) {
      const teamSet = usedTeamsByDate.get(eventDate.id)!;
  
      for (const [startTime, endTime] of timeSlots) {
        // Ưu tiên chọn trận không trùng đội trong ngày
        let matchIndex = remainingMatches.findIndex(
          ([teamA, teamB]) =>
            !teamSet.has(teamA.teamId) && !teamSet.has(teamB.teamId),
        );
  
        // Nếu không tìm thấy trận hợp lệ, chấp nhận trận bị trùng
        if (matchIndex === -1) {
          matchIndex = 0;
        }
  
        const [teamA, teamB] = remainingMatches.splice(matchIndex, 1)[0];
  
        // Đánh dấu đội đã đá ngày này
        teamSet.add(teamA.teamId);
        teamSet.add(teamB.teamId);
  
        const match = new Match();
        match.eventDate = { id: eventDate.id } as EventDate;
        match.teamOne = { teamId: teamA.teamId } as Team;
        match.teamTwo = { teamId: teamB.teamId } as Team;
        match.startTime = startTime;
        match.endTime = endTime;
        match.matchDuration = duration;
        match.type = TypeMatch.MATCH;
  
        matchList.push(match);
  
        // Nếu hết trận thì dừng luôn
        if (remainingMatches.length === 0) break;
      }
  
      if (remainingMatches.length === 0) break;
    }
  
    // Nếu vẫn còn trận chưa được xếp -> báo lỗi
    if (remainingMatches.length > 0) {
      const teamA = remainingMatches[0][0];
      const teamB = remainingMatches[0][1];
      throw new BadRequestException(
        `Không thể xếp đủ tất cả các trận. Ví dụ: ${teamA.teamName} vs ${teamB.teamName} chưa được xếp.`,
      );
    }
  
    await this.matchRepository.saveAll(matchList);
  
    const matchDTOs: MatchDto[] = [];
    for (const [eventDate] of eventDates) {
      const matches = await this.matchRepository.getAllByEventDateId(eventDate.id);
      const dtos = await Promise.all(
        matches.map((match) => this.matchUtils.convertMatchToMatchDTO(match)),
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

  async dragAndDropMatch2(matchId: number, newSlotId: number) {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with id ${matchId} not found`);
    }
    const newSlot = await this.slotRepository.findOne({ where: { id: newSlotId }, relations: ['match', 'eventDate'] });
    if (!newSlot) {
      throw new NotFoundException(`Slot with id ${newSlotId} not found`);
    }

    if (newSlot.match) {
      throw new BadRequestException('Slot already has a match');
    }
    if (match.slot) {
      const oldSlot = await this.slotRepository.findOne({ where: { id: match.slot.id }, relations: ['match'] });
      if (oldSlot) {
        oldSlot.match = null;
        await this.slotRepository.save(oldSlot);
      }
      match.slot = null;
    }
    match.slot = newSlot;
    newSlot.match = match;
    match.startTime = newSlot.startTime;
    match.endTime = newSlot.endTime;
    match.eventDate = newSlot.eventDate;
    await this.matchRepository.save(match);
    await this.slotRepository.save(newSlot);
    await GoogleCalendarHelper.init();
    GoogleCalendarHelper.updateGoogleCalendarEvent(match.calendarEventId, `${match.eventDate.date}T${match.startTime}:00+07:00`, 
      `${match.eventDate.date}T${match.endTime}:00+07:00`, `Match: ${match.teamOne.teamName} vs ${match.teamTwo.teamName}`,
      `Scheduled match between Team ${match.teamOne.teamName} and Team ${match.teamTwo.teamName}`, [match.teamOne.leaderEmail, match.teamTwo.leaderEmail]);
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
        // matches: (await this.matchUtils.convertMatchToMatchDto(
        //   matches,
        // )) as unknown as MatchDto[],
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
        // matches: this.matchUtils.convertMatchToMatchDto(
        //   oldEventDateMatches,
        // ) as unknown as MatchDto[],
      },
      {
        eventDateId: newEventDate.id,
        date: newEventDate.date,
        startTime: newEventDate.startTime,
        endTime: newEventDate.endTime,
        // matches: this.matchUtils.convertMatchToMatchDto(
        //   newEventDateMatches,
        // ) as unknown as MatchDto[],
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
        type: data?.match_type,
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
  ): Promise<any> {
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
    if(match.type !== TypeMatch.KNOCKOUT){
      this.updateScores(match, teamOne, teamTwo, teamOneResult, teamTwoResult);
    }
    match.teamOneResult = teamOneResult;
    match.teamTwoResult = teamTwoResult;
    await this.matchRepository.save(match);
    if(tournament.format === TournamentFormat.GROUP_STAGE || tournament.format === TournamentFormat.DIRECT_ELIMINATION){
      await this.checkAndAdvanceRound(tournament, match.type, match.round ?? 0);
    }
    return {
      matchId: match.id,
      teamOneId: match.teamOne.teamId,
      teamTwoId: match.teamTwo.teamId,
    };
  }


  private async checkAndAdvanceRound(
    tournament: Tournament,
    matchType: TypeMatch,
    round: number,
  ) {
    // ———————————— Vòng bảng ————————————
    if (matchType === TypeMatch.GROUP ) {
      // Kiểm tra còn trận group nào chưa có kết quả không
      const pending = await this.matchRepository
                      .createQueryBuilder('match')
                      .leftJoin('match.eventDate', 'eventDate')
                      .leftJoin('eventDate.tournament', 'tournament')
                      .where('tournament.id = :tournamentId', { tournamentId: tournament.id })
                      .andWhere('match.type = :type', { type: TypeMatch.GROUP })
                      .andWhere('match.teamOneResult IS NULL')
                      .andWhere('match.teamTwoResult IS NULL')
                      .getCount();
      console.log(pending);
      if (pending === 0) {
        await this.fillNextRoundMatches(tournament, 1);
        await this.tournamentRepository.save(tournament);
      }
      return;
    }

    // ———————————— Vòng knock‑out ————————————
    if (matchType === TypeMatch.KNOCKOUT ) {
      // Đếm những trận KO ở round này còn chưa result
      const undone = await this.matchRepository
              .createQueryBuilder('match')
              .leftJoin('match.eventDate', 'eventDate')
              .leftJoin('eventDate.tournament', 'tournament')
              .where('tournament.id = :tournamentId', { tournamentId: tournament.id })
              .andWhere('match.type = :type', { type: TypeMatch.KNOCKOUT })
              .andWhere('match.round = :round', { round })
              .andWhere('match.teamOneResult IS NULL')
              .andWhere('match.teamTwoResult IS NULL')
              .getCount();
      if (undone === 0) {
        // Xác định tổng số vòng (maxRound)
        try {
          const maxRoundRow = await this.matchRepository
            .createQueryBuilder('m')
            .leftJoin('m.eventDate', 'ed')
            .leftJoin('ed.tournament', 't')
            .select('MAX(m.round)', 'max')
            .where('t.id = :tid', { tid: tournament.id })
            .andWhere('m.type = :t', { t: TypeMatch.KNOCKOUT })
            .getRawOne<{ max: number }>();

          const maxRound = parseInt(maxRoundRow.max.toString(), 10);

        if (round < maxRound) {
          // Fill vòng tiếp theo
          await this.fillNextRoundMatches(tournament, round + 1);
        } else {
          tournament.status = TournamentStatus.FINISHED;
          await this.tournamentRepository.save(tournament);
        }
        } catch (error) {
          throw error;
        }
      }
    }
  }


  async fillNextRoundMatches(tournament: Tournament, targetRound: number): Promise<void> {
    await GoogleCalendarHelper.init();
    // 1. Lấy kết quả vòng trước
    if (targetRound === 1) {
      const topTeamsMap = await this.getTopTeamsPerGroupMap(tournament.id, tournament.advancePerGroup);
    
      // convert map to array of [groupName, team[]]
      const groupedArray = Array.from(topTeamsMap.entries()).sort(([a], [b]) => a.localeCompare(b)); // A, B, C...
    
      // Cặp bảng theo từng 2 nhóm: [A,B], [C,D], ...
      const pairings: [string, string][] = [];
      for (let i = 0; i < groupedArray.length; i += 2) {
        if (i + 1 < groupedArray.length) {
          pairings.push([groupedArray[i][0], groupedArray[i + 1][0]]);
        }
      }
      const orderedTeams: Team[] = [];
    
      for (const [groupA, groupB] of pairings) {
        const teamsA = topTeamsMap.get(groupA)!;
        const teamsB = topTeamsMap.get(groupB)!;
        const n = tournament.advancePerGroup;
    
        for (let i = 0; i < n; i++) {
          orderedTeams.push(teamsA[i]);        
          orderedTeams.push(teamsB[n - 1 - i]); 
        }
      }
    
      // Lấy trận và gán đội
      const nextMatches = await this.matchRepository.find({
        where: {
          eventDate: { tournament: { id: tournament.id } },
          type: TypeMatch.KNOCKOUT,
          round: targetRound,
        },
        relations: ['eventDate'],
        order: { seedIndex: 'ASC' },
      });
    
      for (let i = 0; i < nextMatches.length; i++) {
        nextMatches[i].teamOne = orderedTeams[2 * i] ?? null;
        nextMatches[i].teamTwo = orderedTeams[2 * i + 1] ?? null;
        if (nextMatches[i].teamOne && nextMatches[i].teamTwo) {
          const event = await GoogleCalendarHelper.createEvent(
          `Match: ${nextMatches[i].teamOne.teamName} vs ${nextMatches[i].teamTwo.teamName}`,
          `Scheduled match between Team ${nextMatches[i].teamOne.teamName} and Team ${nextMatches[i].teamTwo.teamName}`,
          `${nextMatches[i].eventDate.date}T${nextMatches[i].startTime}:00+07:00`,
          `${nextMatches[i].eventDate.date}T${nextMatches[i].endTime}:00+07:00`,
          [nextMatches[i].teamOne.leaderEmail, nextMatches[i].teamTwo.leaderEmail],
        );
        nextMatches[i].calendarEventId = event.id;  
      }
    }
    
      await this.matchRepository.save(nextMatches);
      return;
    }    
    const prevRound = targetRound - 1;
    const prevMatches = await this.matchRepository.find({
      where: { eventDate: { tournament: { id: tournament.id } }, type: TypeMatch.KNOCKOUT, round: prevRound },
      order: { seedIndex: 'ASC' },
      relations: ['teamOne', 'teamTwo'],
    });
    const winners = prevMatches.map(m =>
      m.teamOneResult > m.teamTwoResult ? m.teamOne : m.teamTwo
    );

    // 2. Lấy các trận trống của vòng này
    const nextMatches = await this.matchRepository.find({
      where: { eventDate: { tournament: { id: tournament.id } }, type: TypeMatch.KNOCKOUT, round: targetRound },
      order: { seedIndex: 'ASC' },
      relations: ['eventDate'],
    });

    // 3. Gán đội thắng vào
    for (let i = 0; i < nextMatches.length; i++) {
      nextMatches[i].teamOne = winners[2 * i] || null;
      nextMatches[i].teamTwo = winners[2 * i + 1] || null;
      if (nextMatches[i].teamOne && nextMatches[i].teamTwo) {
        const event = await GoogleCalendarHelper.createEvent(
        `Match: ${nextMatches[i].teamOne.teamName} vs ${nextMatches[i].teamTwo.teamName}`,
        `Scheduled match between Team ${nextMatches[i].teamOne.teamName} and Team ${nextMatches[i].teamTwo.teamName}`,
        `${nextMatches[i].eventDate.date}T${nextMatches[i].startTime}:00+07:00`,
        `${nextMatches[i].eventDate.date}T${nextMatches[i].endTime}:00+07:00`,
        [nextMatches[i].teamOne.leaderEmail, nextMatches[i].teamTwo.leaderEmail],
      );
      nextMatches[i].calendarEventId = event.id;  
    }
    }

    // 4. Lưu lại
    await this.matchRepository.save(nextMatches);
  }
  

  async getTopTeamsPerGroupMap(tournamentId: number, topN: number): Promise<Map<string, Team[]>> {
    const matches = await this.matchRepository.find({
      where: {
        eventDate: { tournament: { id: tournamentId } },
        type: TypeMatch.GROUP,
      },
      relations: ['teamOne', 'teamTwo'],
    });
  
    type Stat = {
      team: Team;
      group: string;
      score: number;
      goalFor: number;
      goalAgainst: number;
    };
    const teamStatsMap = new Map<number, Stat>();
  
    for (const match of matches) {
      const entries = [
        { team: match.teamOne, ownScore: match.teamOneResult, oppScore: match.teamTwoResult },
        { team: match.teamTwo, ownScore: match.teamTwoResult, oppScore: match.teamOneResult },
      ];
  
      for (const entry of entries) {
        if (!entry.team) continue;
  
        if (!teamStatsMap.has(entry.team.teamId)) {
          teamStatsMap.set(entry.team.teamId, {
            team: entry.team,
            group: entry.team.group,
            score: 0,
            goalFor: 0,
            goalAgainst: 0,
          });
        }
  
        const stat = teamStatsMap.get(entry.team.teamId)!;
        if (entry.ownScore != null && entry.oppScore != null) {
          stat.goalFor += entry.ownScore;
          stat.goalAgainst += entry.oppScore;
  
          if (entry.ownScore > entry.oppScore) stat.score += 3;
          else if (entry.ownScore === entry.oppScore) stat.score += 1;
        }
      }
    }
  
    // Group và sort theo thứ hạng trong bảng
    const grouped = new Map<string, Team[]>();
    const statGrouped = new Map<string, Stat[]>();
    for (const stat of teamStatsMap.values()) {
      if (!statGrouped.has(stat.group)) statGrouped.set(stat.group, []);
      statGrouped.get(stat.group)!.push(stat);
    }
  
    for (const [group, stats] of statGrouped.entries()) {
      const sorted = stats.sort((a, b) =>
        b.score - a.score ||
        (b.goalFor - b.goalAgainst) - (a.goalFor - a.goalAgainst) ||
        b.goalFor - a.goalFor
      );
      grouped.set(group, sorted.slice(0, topN).map(s => s.team));
    }
  
    return grouped;
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
    const leaderBoard = await this.matchRepository.getLeaderBoard(tournamentId);
    return leaderBoard.map((team, index) => ({
      ...team,
      rank: index + 1,
    }));
  }

  async getGroupStageLeaderBoard(tournamentId: number): Promise<{ leaderBoard: LeaderBoardDto[]; topTeams: LeaderBoardDto[] }> {
    const leaderBoard = await this.matchRepository.getGroupStageLeaderBoard(tournamentId);
    const topTeams = await this.matchRepository.getTop4KnockOut(tournamentId);
    const leaderBoardWithRank = leaderBoard.map((team, index) => ({
      ...team,
      rank: index + 1,
    }));
    return {
      leaderBoard: leaderBoardWithRank,
      topTeams,
    };
  }
  /**
   * Get matches of leaderboard for a tournament by its ID
   */
  async getMatchOfLeaderBoardByTournamentId(
    tournamentId: number,
  ): Promise<MatchOfLeaderBoardDto[]> {
    return this.matchRepository.getMatchOfLeaderBoard(tournamentId);
  }

  async getMatchOfGroupStageLeaderBoardByTournamentId(
    tournamentId: number,
  ): Promise<MatchOfLeaderBoardDto[]> {
    return this.matchRepository.getMatchOfGroupStageLeaderBoard(tournamentId);
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
  async getAllMatchByTournamentId(tournamentId: number): Promise<Match[]> {
    return this.matchRepository.getAllMatchByTournamentId(tournamentId);
  }

  async getMatchResult(tournamentId: number, matchId: number): Promise<any> {
    //await this.checkMatchInTournament(tournamentId, matchId);

    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const listPlayerMatch = await this.playerMatchRepository.find({
      where: { matchId },
      relations: ['player', 'player.team'],
    });

    const result: any[] = listPlayerMatch.map((pm) => ({
      id: pm.playerId,
      name: pm.player.playerName,
      number: pm.player.number,
      goals: pm.goals,
      goalMinutes: pm.goalMinutes ?? [],
      yellowCards: pm.yellowCards,
      yellowCardMinutes: pm.yellowCardMinutes ?? [],
      redCard: pm.redCard,
      redCardMinute: pm.redCardMinute,
      type: pm.isStarter ? 'starter' : 'substitute',
      minutesIn: pm.minutesIn,
      minutesOut: pm.minutesOut,
      teamId: pm.player.team.teamId,
    }));

    return {
      match,
      listPlayerMatch: result,
    };
  }

  toDto(match: Match): MatchDto {
    return new MatchDto({
      id: match.id,
      eventDateId: match.eventDate?.id,
      teamOne: match.teamOne,
      teamTwo: match.teamTwo,
      teamOneResult: match.teamOneResult,
      teamTwoResult: match.teamTwoResult,
      startTime: match.startTime,
      endTime: match.endTime,
      title: match.title,
      type: match.type,
      timeDuration: match.matchDuration,
      group: match.teamOne?.group || null,
    });
  }
}

