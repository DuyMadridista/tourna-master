import { CommonHelper } from './../../helper/common-helper';
import { Injectable, BadRequestException } from '@nestjs/common';
import { MatchService } from '../match/match.service';
import { EventDateService } from '../event-date/event-date.service';
import { TournamentService } from '../tournament/tournament.service';
import { MatchUtils } from 'src/helper/match.utils';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
import { TournamentStatusPermission } from 'src/enums/TournamentStatusPermission';
import { SuccessResponseDto } from 'src/helper/successResponse.dto';
import { GenerationDto } from './dto/GenerationDto';
import { MatchDto } from '../match/dto/MatchDto';
import { LocalDate, LocalTime } from '@js-joda/core';
import { EventDate } from '../event-date/entities/event-date.entity';
import { Match } from '../match/entities/match.entity';
import { SuccessResponse } from 'src/helper/OkResponse';
import { Team } from '../team/entities/team.entity';
import { TypeMatch } from 'src/enums/match-type.enum';
import { MatchRepository } from '../match/match.repository';
import { TeamService } from '../team/team.service';
import { TournamentFormat } from 'src/enums/tournament-format.enum';
import { Slot } from '../event-date/entities/slot.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GoogleCalendarHelper } from 'src/helper/google-calendar';
@Injectable()
export class GenerationService {
  constructor(
    private readonly matchService: MatchService,
    private readonly eventDateService: EventDateService,
    private readonly tournamentService: TournamentService,
    private readonly teamService: TeamService,
    private readonly matchUtils: MatchUtils,
    private readonly matchRepository: MatchRepository,
    @InjectRepository(Slot)
    private readonly slotRepository: Repository<Slot>,
  ) {}

  async generateMatch(
    tournamentId: number,
    duration: number,
    betweenTime: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ): Promise<SuccessResponseDto<GenerationDto[]>> {
    const tournament =
      await this.tournamentService.findTournamentById(tournamentId);
    if (!tournament) throw new BadRequestException('Tournament not found');
    if (!TournamentStatusPermission.allowGenerateStatus.includes(tournament.status)) {
      throw new BadRequestException('Cannot generate schedule for this tournament');
    }
    await GoogleCalendarHelper.init(); 
    if (tournament.format === TournamentFormat.GROUP_STAGE) {
      return this.generateGroupStage(
        tournamentId,
        duration,
        betweenTime,
        startTime,
        endTime,
      );
    } else {
      return this.generate(
        tournamentId,
        duration,
        betweenTime,
        startTime,
        endTime,
      );
    }
  }


  async generateGroupStage(
    tournamentId: number,
    duration: number,
    betweenTime: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ): Promise<SuccessResponseDto<GenerationDto[]>> {
    // STEP 1: Validate & update tournament
    const tournament = await this.validateAndUpdateTournament(
      tournamentId,
      duration,
      betweenTime,
      startTime,
      endTime,
    );

    // STEP 2: Reset & prepare group data
    const { groupedMatchPairs, eventDates, totalTeams } =
      await this.resetAndPrepareGroupData(tournamentId, startTime, endTime);

    // STEP 3: Compute days for stages
    const totalDates = eventDates.length; // e.g., 5 days total
    const teamsAdvancing =
      tournament.numberOfGroups * tournament.advancePerGroup; // e.g. 4
    const padded = this.autoPadToPowerOfTwo(teamsAdvancing); // pad to power of two
    const knockoutRounds = Math.log2(padded); // number of knockout rounds
    const knockoutDays = knockoutRounds; // 2 days: semis + final
    const groupDays = totalDates - knockoutDays; // remaining days for group stage

    const groupDates = eventDates.slice(0, groupDays);
    const knockoutDates = eventDates.slice(groupDays);

    // STEP 4: Generate time slots for all days
    const timeSlots = await this.generateAndSaveTimeSlots(
      eventDates,
      duration,
      betweenTime,
      startTime,
      endTime,
    );

    // STEP 5: Prepare interleaved slots for group stage to balance per day
    // Group slots by day in original order
    const slotsByDay: Slot[][] = groupDates.map((d) =>
      timeSlots
        .filter((s) => s.eventDate.id === d.id)
        .sort((a, b) => a.startTime.compareTo(b.startTime)),
    );

    // Interleave: take one slot per day in round-robin
    const interleaved: Slot[] = [];
    const maxSlots = Math.max(...slotsByDay.map((slots) => slots.length));
    for (let i = 0; i < maxSlots; i++) {
      for (let dayIdx = 0; dayIdx < slotsByDay.length; dayIdx++) {
        const slot = slotsByDay[dayIdx][i];
        if (slot) interleaved.push(slot);
      }
    }

    // Limit to exactly groupMatchCount slots
    const groupMatchCount = groupedMatchPairs.length;
    const groupSlots = interleaved.slice(0, groupMatchCount);

    // STEP 6: Assign group matches to slots (conflict-graph + balancing)
    const conflictGraph = this.buildGroupConflictGraph(groupedMatchPairs);
    const matchToSlot = new Map<number, number>();
    const groupToSlot = this.assignMatchesToSlots(
      groupedMatchPairs,
      groupSlots,
      conflictGraph,
      totalTeams,
      groupDates.length,
      groupDates,
    );
    // Store group assignments
    groupToSlot.forEach((slotId, idx) => matchToSlot.set(idx, slotId));

    // STEP 7: Assign knockout matches by round, one round per day
    let koIdx = groupMatchCount;
    const koRoundInfo: { index: number; round: number; seedIndex: number }[] =
      [];
    for (let round = 1; round <= knockoutRounds; round++) {
      const matchesInRound = padded / 2 ** round;
      const date = knockoutDates[round - 1];
      const dailySlots = timeSlots
        .filter((s) => s.eventDate.id === date.id)
        .sort((a, b) => a.startTime.compareTo(b.startTime))
        .slice(0, matchesInRound);

      for (let j = 0; j < matchesInRound; j++) {
        const matchIndex = koIdx++;
        matchToSlot.set(matchIndex, dailySlots[j].id);
        koRoundInfo.push({ index: matchIndex, round, seedIndex: j });
      }
    }

    // STEP 8: Persist matches
    const knockoutPairs = this.generateKnockoutPairs(
      tournament.numberOfGroups,
      tournament.advancePerGroup,
    );
    const allPairs = [...groupedMatchPairs, ...knockoutPairs];

    const entities = allPairs.map(([t1, t2], idx) => {
      const slot = timeSlots.find((s) => s.id === matchToSlot.get(idx))!;
      const m = new Match();
      m.teamOne = t1 ? ({ teamId: t1.teamId } as Team) : null;
      m.teamTwo = t2 ? ({ teamId: t2.teamId } as Team) : null;
      m.slot = slot;
      m.eventDate = slot.eventDate;
      m.startTime = slot.startTime;
      m.endTime = slot.endTime;
      m.matchDuration = duration;
      const isGroup = t1 && t2;
      m.type = isGroup ? TypeMatch.GROUP : TypeMatch.KNOCKOUT;

      if (!isGroup) {
        const info = koRoundInfo.find((i) => i.index === idx)!;
        m.round = info.round;
        m.seedIndex = info.seedIndex;
      }
      return m;
    });
    for (const match of entities) {
      if(!match.teamOne || !match.teamTwo) continue;
      const teamOne = await this.teamService.findTeamById(tournamentId,match.teamOne.teamId);
      const teamTwo = await this.teamService.findTeamById(tournamentId,match.teamTwo.teamId);
      if(teamOne && teamTwo){
      const event = await GoogleCalendarHelper.createEvent(
        `Match: ${teamOne.teamName} vs ${teamTwo.teamName}`,
        `Scheduled match between Team ${teamOne.teamName} and Team ${teamTwo.teamName}`,
        `${match.eventDate.date}T${match.startTime}:00+07:00`,
        `${match.eventDate.date}T${match.endTime}:00+07:00`,
        [teamOne.leaderEmail, teamTwo.leaderEmail],
      );
      match.calendarEventId = event.id;
      }
    }
    await this.matchService.saveAll(entities);

    // STEP 9: Return DTO
    return this.buildResponseDto(eventDates);
  }

  // Helpers:

  private generateKnockoutPairs(
    numberOfGroups: number,
    advancePerGroup: number,
  ): [Team | null, Team | null][] {
    const total = numberOfGroups * advancePerGroup;
    const padded = this.autoPadToPowerOfTwo(total);
    const rounds = Math.log2(padded);
    const pairs: [Team | null, Team | null][] = [];
    for (let r = 1; r <= rounds; r++) {
      const cnt = padded / Math.pow(2, r);
      for (let i = 0; i < cnt; i++) pairs.push([null, null]);
    }
    return pairs;
  }

  private autoPadToPowerOfTwo(n: number): number {
    let v = 1;
    while (v < n) v <<= 1;
    return v;
  }

  private async resetAndPrepareGroupData(
    tournamentId: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ) {
    await this.matchService.deleteAllMatchByTournamentId(tournamentId);
    const eventDates =
      await this.eventDateService.findAllByTournamentId(tournamentId);
    if (!eventDates.length) {
      throw new BadRequestException('Event date is empty, please add them');
    }

    const allTeams =
      await this.teamService.getAllTeamByTournamentId(tournamentId);
    const groupMap = new Map<string, Team[]>();

    for (const team of allTeams) {
      if (!team?.group) {
        throw new BadRequestException(`Team ${team.teamName} has no group`);
      }
      if (!groupMap.has(team?.group)) {
        groupMap.set(team?.group, []);
      }
      groupMap.get(team?.group)!.push(team);
    }

    const groupedMatchPairs: [Team, Team][] = [];
    const teamSet = new Set<number>();

    for (const groupTeams of groupMap.values()) {
      if (groupTeams.length < 2) {
        throw new BadRequestException(`Group has fewer than 2 teams`);
      }
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const teamA = groupTeams[i];
          const teamB = groupTeams[j];
          if (teamA.teamId === teamB.teamId) {
            throw new BadRequestException('A team cannot play against itself');
          }
          groupedMatchPairs.push([teamA, teamB]);
          teamSet.add(teamA.teamId);
          teamSet.add(teamB.teamId);
        }
      }
    }

    // Normalize eventDates
    eventDates.forEach((d) => {
      d.startTime = startTime;
      d.endTime = endTime;
    });
    await this.eventDateService.saveAll(eventDates);

    const sortedDates = [...eventDates].sort((a, b) =>
      LocalDate.parse(a.date.toString()).compareTo(
        LocalDate.parse(b.date.toString()),
      ),
    );

    return {
      groupedMatchPairs,
      eventDates: sortedDates,
      totalTeams: teamSet.size,
    };
  }

  private buildGroupConflictGraph(matches: [Team, Team][]) {
    const graph = new Map<number, Set<number>>();
    matches.forEach((pair, i) => {
      graph.set(i, new Set());
      matches.forEach((otherPair, j) => {
        if (i !== j) {
          const overlap = [pair[0].teamId, pair[1].teamId].some(
            (t) => t === otherPair[0].teamId || t === otherPair[1].teamId,
          );
          if (overlap) graph.get(i)!.add(j);
        }
      });
    });
    return graph;
  }

  async generate(
    tournamentId: number,
    duration: number,
    betweenTime: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ): Promise<SuccessResponseDto<GenerationDto[]>> {
    // STEP 1: Validate and update tournament configuration
    const tournament = await this.validateAndUpdateTournament(
      tournamentId,
      duration,
      betweenTime,
      startTime,
      endTime,
    );

    // STEP 2: Reset & prepare data
    const { matches, eventDates, totalTeams } = await this.resetAndPrepareData(
      tournamentId,
      startTime,
      endTime,
    );
    const matchPairs = matches as [Team, Team][];

    // STEP 3: Generate time slots and save to DB
    const timeSlots = await this.generateAndSaveTimeSlots(
      eventDates,
      duration,
      betweenTime,
      startTime,
      endTime,
    );
    if(timeSlots.length < matchPairs.length){
      throw new BadRequestException('Not enough time slots, please add more event dates');
    }

    // STEP 4: Build conflict graph
    const conflictGraph = this.buildConflictGraph(matchPairs);

    // STEP 5: Assign matches to slots
    const matchToSlot = this.assignMatchesToSlots(
      matchPairs,
      timeSlots,
      conflictGraph,
      totalTeams,
      eventDates.length,
      eventDates,
    );

    // STEP 6: Persist matches
    const entities = await this.persistMatches(
      matchPairs,
      matchToSlot,
      timeSlots,
      tournament.matchDuration,
    );
    for (const match of entities) {
      const teamOne = await this.teamService.findTeamById(tournamentId,match.teamOne.teamId);
      const teamTwo = await this.teamService.findTeamById(tournamentId,match.teamTwo.teamId);
      
      const event = await GoogleCalendarHelper.createEvent(
        `Match: ${teamOne.teamName} vs ${teamTwo.teamName}`,
        `Scheduled match between Team ${teamOne.teamName} and Team ${teamTwo.teamName}`,
        `${match.eventDate.date}T${match.startTime}:00+07:00`,
        `${match.eventDate.date}T${match.endTime}:00+07:00`,
        [teamOne.leaderEmail, teamTwo.leaderEmail],
      );
      await this.matchRepository.update(match.id, { calendarEventId: event.id });
    }

    // STEP 7: Build and return response DTO
    return this.buildResponseDto(eventDates);
  }

  private async validateAndUpdateTournament(
    tournamentId: number,
    duration: number,
    betweenTime: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ) {
    const t = await this.tournamentService.findTournamentById(tournamentId);
    if (!t) throw new BadRequestException('Tournament not found');
    // if (!TournamentStatusPermission.allowGenerateStatus.includes(t.status)) {
    //   throw new BadRequestException('Cannot generate schedule for this tournament');
    // }

    t.matchDuration = duration;
    t.timeBetween = betweenTime;
    t.startTimeDefault = startTime.toString();
    t.endTimeDefault = endTime.toString();
    if (t.status === TournamentStatus.NEED_INFORMATION) {
      t.status = TournamentStatus.READY;
    }
    await this.tournamentService.save(t);
    return t;
  }

  private async resetAndPrepareData(
    tournamentId: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ) {
    const allMatches = await this.matchService.getAllMatchByTournamentId(tournamentId);
    for (const match of allMatches) {
      if (match.calendarEventId) {
        await GoogleCalendarHelper.deleteEvent(match.calendarEventId);
      }
    }
    await this.matchService.deleteAllMatchByTournamentId(tournamentId);
    const rawMatches = await this.matchService.matchList(tournamentId);
    const eventDates =
      await this.eventDateService.findAllByTournamentId(tournamentId);
    if (!eventDates.length) {
      throw new BadRequestException('Event date is empty, please add them');
    }

    const teamSet = new Set<number>();
    rawMatches.forEach(([a, b]) => {
      if (a.teamId === b.teamId) {
        throw new BadRequestException('A team cannot play against itself');
      }
      teamSet.add(a.teamId);
    
      teamSet.add(b.teamId);
    });

    const totalTeams = teamSet.size;
    const expectedMatches = (totalTeams * (totalTeams - 1)) / 2;
    if (rawMatches.length !== expectedMatches) {
      throw new BadRequestException(
        `Expected ${expectedMatches} matches but got ${rawMatches.length}`,
      );
    }

    // Normalize eventDates
    eventDates.forEach((d) => {
      d.startTime = startTime;
      d.endTime = endTime;
    });
    await this.eventDateService.saveAll(eventDates);

    // Sort chronologically
    const sortedDates = [...eventDates].sort((a, b) =>
      LocalDate.parse(a.date.toString()).compareTo(
        LocalDate.parse(b.date.toString()),
      ),
    );

    return { matches: rawMatches, eventDates: sortedDates, totalTeams };
  }

  private async generateAndSaveTimeSlots(
    dates: EventDate[],
    duration: number,
    breakTime: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ) {
    // Remove old slots
    dates.forEach(async (element) => {
      await this.slotRepository.delete({ eventDate: { id: element.id } });
    });

    let globalIndex = 0;
    const slots: Slot[] = [];
    dates.forEach((date, day) => {
      let current = startTime;
      while (true) {
        const slotEnd = current.plusMinutes(duration);
        if (slotEnd.isAfter(endTime)) break;

        const slot = this.slotRepository.create({
          slotIndex: globalIndex++,
          eventDate: date,
          _startTime: current.toString(),
          _endTime: slotEnd.toString(),
        });

        slots.push(slot);
        current = current.plusMinutes(duration + breakTime);
      }
    });

    return await this.slotRepository.save(slots);
  }

  private buildConflictGraph(matches: [Team, Team][]) {
    const graph = new Map<number, Set<number>>();
    matches.forEach((pair, i) => {
      graph.set(i, new Set());
      matches.forEach((otherPair, j) => {
        if (i !== j) {
          const overlap = [pair[0].teamId, pair[1].teamId].some(
            (t) => t === otherPair[0].teamId || t === otherPair[1].teamId,
          );
          if (overlap) graph.get(i)!.add(j);
        }
      });
    });
    return graph;
  }

  private assignMatchesToSlots(
    matches: [Team, Team][],
    slots: Slot[],
    graph: Map<number, Set<number>>,
    totalTeams: number,
    totalDays: number,
    dates: EventDate[],
  ) {
    const enoughDays = totalDays >= totalTeams;
    const maxPerDay = enoughDays ? 1 : Infinity;
    const teamDay = new Map<number, Set<number>>();
    const matchCount = Array(totalDays).fill(0);
    const map = new Map<number, number>();
    const usedSlots = new Set<number>();

    // Order by most conflicts first
    const order = [...graph.keys()].sort(
      (a, b) => graph.get(b)!.size - graph.get(a)!.size,
    );

    order.forEach((idx) => {
      const [a, b] = matches[idx];
      const days = [...Array(totalDays).keys()].sort(
        (d1, d2) => matchCount[d1] - matchCount[d2],
      );
      let placed = false;

      for (const day of days) {
        if (
          (teamDay.get(a.teamId)?.has(day) ? 1 : 0) < maxPerDay &&
          (teamDay.get(b.teamId)?.has(day) ? 1 : 0) < maxPerDay
        ) {
          for (const slot of slots.filter(
            (s) => s.eventDate.id === dates[day].id && !usedSlots.has(s.id),
          )) {
            const conflict = [...map.entries()].some(
              ([otherIdx, slotId]) =>
                slotId === slot.id && graph.get(idx)!.has(otherIdx),
            );
            if (!conflict && !map.has(idx)) {
              map.set(idx, slot.id);
              usedSlots.add(slot.id);
              matchCount[day]++;
              teamDay.set(
                a.teamId,
                new Set([...(teamDay.get(a.teamId) || []), day]),
              );
              teamDay.set(
                b.teamId,
                new Set([...(teamDay.get(b.teamId) || []), day]),
              );
              placed = true;
              break;
            }
          }
        }
        if (placed) break;
      }

      if (!placed) {
        for (const slot of slots) {
          if (usedSlots.has(slot.id)) continue;
          const conflict = [...map.entries()].some(
            ([otherIdx, slotId]) =>
              slotId === slot.id && graph.get(idx)!.has(otherIdx),
          );
          if (!conflict) {
            map.set(idx, slot.id);
            usedSlots.add(slot.id);
            break;
          }
        }
      }
    });

    return map;
  }

  private async persistMatches(
    matches: [{ teamId: number }, { teamId: number }][],
    map: Map<number, number>,
    slots: Slot[],
    duration: number,
  ) {
    const entities: Match[] = [];
    map.forEach((slotId, idx) => {
      const slot = slots.find((s) => s.id === slotId)!;
      const [a, b] = matches[idx];
      const m = new Match();
      m.teamOne = { teamId: a.teamId } as Team;
      m.teamTwo = { teamId: b.teamId } as Team;
      m.slot = slot;
      m.startTime = slot.startTime;
      m.endTime = slot.endTime;
      m.matchDuration = duration;
      m.eventDate = slot.eventDate;
      m.type = TypeMatch.MATCH;
      entities.push(m);
    });
    await this.matchService.saveAll(entities);
    return entities;
  }

  private async buildResponseDto(eventDates: EventDate[]) {
    const dtos: GenerationDto[] = [];
    for (const day of eventDates) {
      const saved = await this.matchService.getMatchByEventDateId(day.id);
      const matchDtos: MatchDto[] = await Promise.all(
        saved.map((m) => this.matchService.toDto(m)),
      );
      dtos.push({
        date: day.date,
        startTime: day.startTime,
        endTime: day.endTime,
        eventDateId: day.id,
      });
    }
    return SuccessResponse(true, dtos.length, dtos);
  }

  async updateGeneration(
    matchId: number,
    eventDateIdSelected: number,
    newPositionMatchId: number,
  ): Promise<GenerationDto[]> {
    const generations: GenerationDto[] = [];

    const oldMatch = await this.matchService.getMatchById(matchId);
    const matchOfNewTime =
      await this.matchService.getMatchById(newPositionMatchId);
    const clonedMatch = structuredClone(oldMatch);

    const oldEventDate = await this.eventDateService.findByEventDateId(
      oldMatch.eventDate.id,
    );
    const newEventDate =
      await this.eventDateService.findByEventDateId(eventDateIdSelected);

    if (newEventDate.date.isBefore(LocalDate.now())) {
      throw new BadRequestException('Cannot switch to a date in the past.');
    }

    const matchesOfNewEventDate =
      await this.matchService.getMatchByEventDateId(eventDateIdSelected);
    const indexOfNewTime = matchOfNewTime
      ? matchesOfNewEventDate.findIndex((m) => m.id === matchOfNewTime.id)
      : null;

    if (matchOfNewTime) {
      clonedMatch.startTime = matchOfNewTime.startTime;
      clonedMatch.endTime = matchOfNewTime.endTime;
      clonedMatch.eventDate.id = eventDateIdSelected;
    }

    const tournament = await this.tournamentService.findTournamentById(
      newEventDate.tournament.id,
    );
    const betweenTime = tournament.timeBetween;
    const duration = tournament.matchDuration;
    const startTime = newEventDate.startTime;
    let matchesUpdated: Match[][] = [];

    if (oldMatch.eventDate.id === eventDateIdSelected) {
      const updated = await this.updateInDate(
        clonedMatch,
        duration,
        betweenTime,
        matchesOfNewEventDate,
        oldMatch,
        indexOfNewTime,
        matchOfNewTime,
      );
      await this.matchService.saveAll(updated);
    } else {
      matchesUpdated = await this.updateTwoDifferentDays(
        clonedMatch,
        duration,
        betweenTime,
        matchesOfNewEventDate,
        oldMatch,
        indexOfNewTime,
        matchOfNewTime,
        startTime,
        eventDateIdSelected,
      );
      await this.matchService.saveAll(matchesUpdated[1]);
      const oldEventMatchDTOs =
        await this.matchUtils.convertMatchListToMatchDtoList(
          await this.matchService.getMatchByEventDateId(oldEventDate.id),
        );
      const slots = await this.eventDateService.getSlotsByEventDateId(
        oldEventDate.id,
      );

      generations.push(
        await this.matchUtils.createGeneration(oldEventDate, slots),
      );
      await this.matchService.saveAll(matchesUpdated[0]);
    }

    const newEventMatchDTOs =
      await this.matchUtils.convertMatchListToMatchDtoList(
        await this.matchService.getMatchByEventDateId(eventDateIdSelected),
      );
    const slots =
      await this.eventDateService.getSlotsByEventDateId(eventDateIdSelected);
    generations.push(
      await this.matchUtils.createGeneration(newEventDate, slots),
    );

    return generations;
  }

  async getAllGeneration(
    tournamentId: number,
  ): Promise<SuccessResponseDto<GenerationDto[]>> {
    const eventDates =
      await this.eventDateService.findAllByTournamentId(tournamentId);
    const generations: GenerationDto[] = [];
    eventDates.sort((a, b) =>
      LocalDate.parse(a.date.toString()).compareTo(
        LocalDate.parse(b.date.toString()),
      ),
    );
    for (const eventDate of eventDates) {
      const slots = await this.eventDateService.getSlotsByEventDateId(
        eventDate.id,
      );
      generations.push(
        await this.matchUtils.createGeneration(eventDate, slots),
      );
    }

    const SuccessResponseDto = SuccessResponse(
      true,
      generations.length,
      generations,
    );
    const duplicateMatches =
      await this.matchService.findAllDuplicateMatchByTournamentId(tournamentId);
    const additionalData: Record<string, any> = {};

    if (duplicateMatches.length > 1) {
      additionalData['DuplicateMatch'] = duplicateMatches;
    }

    const checkTime = await this.checkEnoughTime(eventDates);
    if (Object.keys(checkTime).length > 0) {
      additionalData['TimeNoEnough'] = checkTime;
    }

    if (Object.keys(additionalData).length > 0) {
      SuccessResponseDto.additionalData = additionalData;
    }

    return SuccessResponseDto;
  }

  updateTime(
    endTime: LocalTime,
    betweenTime: number,
    duration: number,
    matchesSize: number,
    matchList: Match[],
    index: number,
  ): Match[] {
    let start = endTime.plusMinutes(betweenTime);
    let end = start.plusMinutes(duration);

    for (let j = index; j < matchesSize; j++) {
      matchList[j].startTime = start;
      matchList[j].endTime = end;
      start = end.plusMinutes(betweenTime);
      end = start.plusMinutes(duration);
    }

    return matchList;
  }

  async checkEnoughTime(eventDates: EventDate[]): Promise<Record<string, any>> {
    const eventDateId: number[] = [];
    let warningMessage = '';

    for (const eventDate of eventDates) {
      const matches = await this.matchService.getMatchByEventDateId(
        eventDate.id,
      );
      for (const match of matches) {
        if (
          match.startTime.isAfter(eventDate.endTime) ||
          match.endTime.isAfter(eventDate.endTime)
        ) {
          warningMessage = 'Time of event date is not enough for all matches';
          eventDateId.push(eventDate.id);
          break;
        }
      }
    }

    if (!warningMessage) return {};

    return {
      warningMessage,
      eventDateId,
    };
  }
  async updateInDate(
    match: Match,
    duration: number,
    betweenTime: number,
    matchesOfNewEventDate: Match[],
    oldMatch: Match,
    indexOfNewTime: number,
    matchOfNewTime: Match,
  ): Promise<Match[]> {
    let endTime: LocalTime;
    let matchesNew: Match[] = [];

    const indexOfOldMatch = matchesOfNewEventDate.findIndex(
      (m) => m.id === oldMatch.id,
    );
    matchesOfNewEventDate.splice(indexOfOldMatch, 1); // remove oldMatch

    if (indexOfOldMatch < indexOfNewTime) {
      endTime = oldMatch.startTime.minusMinutes(betweenTime);
      matchesNew = this.updateTime(
        endTime,
        betweenTime,
        duration,
        matchesOfNewEventDate.slice(indexOfOldMatch, indexOfNewTime).length +
          indexOfOldMatch,
        matchesOfNewEventDate,
        indexOfOldMatch,
      );
    } else if (indexOfNewTime < indexOfOldMatch) {
      endTime = matchOfNewTime.endTime;
      matchesNew = this.updateTime(
        endTime,
        betweenTime,
        duration,
        matchesOfNewEventDate.slice(indexOfNewTime, indexOfOldMatch).length +
          indexOfNewTime,
        matchesOfNewEventDate,
        indexOfNewTime,
      );
    }

    matchesNew.splice(indexOfNewTime, 0, match);
    return matchesNew;
  }

  async updateTwoDifferentDays(
    match: Match,
    duration: number,
    betweenTime: number,
    matchesOfNewEventDate: Match[],
    oldMatch: Match,
    indexOfNewTime: number,
    matchOfNewTime: Match | null,
    startTime: LocalTime,
    eventDateIdSelected: number,
  ): Promise<Match[][]> {
    const matchesOfOldEventDate = await this.matchService.getMatchByEventDateId(
      oldMatch.eventDate.id,
    );

    const matchesNewEventDateSize = matchesOfNewEventDate.length;
    const matchesOldEventDateSize = matchesOfOldEventDate.length;

    let matchesNew: Match[] = [];
    let matchesOld: Match[];
    const matchesUpdated: Match[][] = [];

    const indexOfOldTime = matchesOfOldEventDate.findIndex(
      (m) => m.id === oldMatch.id,
    );

    // Update matches in new event date
    if (!matchOfNewTime) {
      if (matchesNewEventDateSize === 0) {
        match.startTime = startTime;
        match.endTime = startTime.plusMinutes(duration);
        match.eventDate.id = eventDateIdSelected;
        matchesNew.push(match);
      } else {
        const newStartTime =
          matchesOfNewEventDate[
            matchesNewEventDateSize - 1
          ].endTime.plusMinutes(betweenTime);
        match.startTime = newStartTime;
        match.endTime = newStartTime.plusMinutes(duration);
        match.eventDate.id =
          matchesOfNewEventDate[matchesNewEventDateSize - 1].eventDate.id;
        matchesNew = [...matchesOfNewEventDate, match];
      }
    } else {
      matchesNew = this.updateTime(
        matchOfNewTime.endTime,
        betweenTime,
        duration,
        matchesNewEventDateSize,
        matchesOfNewEventDate,
        indexOfNewTime,
      );
      matchesNew.splice(indexOfNewTime, 0, match);
    }

    matchesOfOldEventDate.splice(indexOfOldTime, 1);
    const endTime = oldMatch.startTime.minusMinutes(betweenTime);
    // eslint-disable-next-line prefer-const
    matchesOld = this.updateTime(
      endTime,
      betweenTime,
      duration,
      matchesOldEventDateSize - 1,
      matchesOfOldEventDate,
      indexOfOldTime,
    );

    matchesUpdated[0] = matchesNew;
    matchesUpdated[1] = matchesOld;

    return matchesUpdated;
  }
}
