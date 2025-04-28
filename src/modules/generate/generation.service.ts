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

  // async generate(
  //   tournamentId: number,
  //   duration: number,
  //   betweenTime: number,
  //   startTime: LocalTime,
  //   endTime: LocalTime,
  // ): Promise<SuccessResponseDto<GenerationDto[]>> {
  //   // // delete all matches of tournament before generate
  //   await this.matchService.deleteAllMatchByTournamentId(tournamentId);
  //   const matches = await this.matchService.matchList(tournamentId);
  //   const eventDates =
  //     await this.eventDateService.findAllByTournamentId(tournamentId);
  //   const tournament =
  //     await this.tournamentService.findTournamentById(tournamentId);

  //   if (!tournament) throw new BadRequestException('Tournament not found');
  //   if (
  //     !TournamentStatusPermission.allowGenerateStatus.includes(
  //       tournament.status,
  //     )
  //   ) {
  //     throw new BadRequestException(
  //       'Cannot generate schedule for this tournament',
  //     );
  //   }

  //   if (duration) tournament.matchDuration = duration;
  //   if (betweenTime) tournament.timeBetween = betweenTime;
  //   tournament.startTimeDefault = startTime.toString();
  //   tournament.endTimeDefault = endTime.toString();
  //   tournament.status =
  //     tournament.status === TournamentStatus.NEED_INFORMATION
  //       ? TournamentStatus.READY
  //       : tournament.status;

  //   await this.tournamentService.save(tournament);

  //   if (!eventDates.length)
  //     throw new BadRequestException('Event date is empty, please add them');

  //   eventDates.forEach((date) => {
  //     if (startTime) date.startTime = startTime;
  //     if (endTime) date.endTime = endTime;
  //   });
  //   await this.eventDateService.saveAll(eventDates);

  //   const timeSheetMatches = await this.matchService.timeSheetMatches(
  //     duration,
  //     betweenTime,
  //     matches,
  //     eventDates,
  //   );
  //   let matchList: MatchDto[] = [];
  //   let warningMessage = '';

  //   if (
  //     !this.matchUtils.compareNumMatchAndNumMatchTime(
  //       matches.length,
  //       this.matchUtils.numberMatchTimes(timeSheetMatches),
  //     )
  //   ) {
  //     const extendedEndTime = LocalTime.of(23, 59, 59);
  //     eventDates.forEach((ed) => (ed.endTime = extendedEndTime));
  //     const newTimeSheetMatches = await this.matchService.timeSheetMatches(
  //       duration,
  //       betweenTime,
  //       matches,
  //       eventDates,
  //     );

  //     if (
  //       !this.matchUtils.compareNumMatchAndNumMatchTime(
  //         matches.length,
  //         this.matchUtils.numberMatchTimes(newTimeSheetMatches),
  //       )
  //     ) {
  //       throw new BadRequestException(
  //         'Time of event date is not enough for all matches',
  //       );
  //     }
  //     matchList = await this.matchService.mappingMatchAndTime(
  //       matches,
  //       newTimeSheetMatches,
  //       duration,
  //     );
  //     warningMessage =
  //       'The total duration of matches exceeds the time frame. Recommendation: extend event_date time.';
  //   } else {
  //     matchList = await this.matchService.mappingMatchAndTime(
  //       matches,
  //       timeSheetMatches,
  //       duration,
  //     );
  //   }

  //   eventDates.sort((a, b) =>
  //     LocalDate.parse(a.date.toString()).compareTo(
  //       LocalDate.parse(b.date.toString()),
  //     ),
  //   );
  //   const generations: GenerationDto[] = await Promise.all(
  //     eventDates.map((eventDate) =>
  //       this.matchUtils.createGeneration(eventDate, matchList),
  //     ),
  //   );
  //   const response = SuccessResponse(true, generations.length, generations);
  //   if (warningMessage) response.additionalData({ warningMessage });
  //   return response;
  // }

  async generateMatch(
    tournamentId: number,
    duration: number,
    betweenTime: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ): Promise<SuccessResponseDto<GenerationDto[]>> {
    const tournament = await this.tournamentService.findTournamentById(tournamentId);
    if (!tournament) throw new BadRequestException('Tournament not found');
    if (!TournamentStatusPermission.allowGenerateStatus.includes(tournament.status)) {
      throw new BadRequestException('Cannot generate schedule for this tournament');
    }
    if(tournament.format===TournamentFormat.GROUP_STAGE){
      return this.generateGroupStage(tournamentId, duration, betweenTime, startTime, endTime);
    }
    else{
      return this.generate(tournamentId, duration, betweenTime, startTime, endTime);
    }
  }
  async generateGroupStage(
    tournamentId: number,
    duration: number,
    betweenTime: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ): Promise<SuccessResponseDto<GenerationDto[]>> {
    // STEP 1: Validate tournament
    const tournament = await this.tournamentService.findTournamentById(tournamentId);
    if (!tournament) throw new BadRequestException('Tournament not found');
    if (!TournamentStatusPermission.allowGenerateStatus.includes(tournament.status)) {
      throw new BadRequestException('Cannot generate schedule for this tournament');
    }
  
    tournament.timeBetween = betweenTime;
    tournament.startTimeDefault = startTime.toString();
    tournament.endTimeDefault = endTime.toString();
    if (tournament.status === TournamentStatus.NEED_INFORMATION) {
      tournament.status = TournamentStatus.READY;
    }
    await this.tournamentService.save(tournament);
  
    // STEP 2: Clean up & prepare
    await this.matchService.deleteAllMatchByTournamentId(tournamentId);
  
    const eventDates = await this.eventDateService.findAllByTournamentId(tournamentId);
    if (!eventDates.length) throw new BadRequestException('Event date is empty, please add them');
  
    const allTeams = await this.teamService.getAllTeamByTournamentId(tournamentId);
    const groupedTeams = new Map<string, Team[]>();
    for (const team of allTeams) {
      if (!groupedTeams.has(team.group)) {
        groupedTeams.set(team.group, []);
      }
      groupedTeams.get(team.group)!.push(team);
    }
  
    eventDates.forEach(date => {
      date.startTime = startTime;
      date.endTime = endTime;
    });
    await this.eventDateService.saveAll(eventDates);
  
    const sortedEventDates = [...eventDates].sort((a, b) =>
      LocalDate.parse(a.date.toString()).compareTo(LocalDate.parse(b.date.toString()))
    );
  
    // STEP 3: Generate time slots
    let globalSlotId = 0;
    const timeSlots = sortedEventDates.flatMap((date, day) => {
      const slots = [];
      let currentTime = startTime;
  
      while (true) {
        const slotEnd = currentTime.plusMinutes(duration);
        if (slotEnd.isAfter(endTime)) break;
  
        slots.push({ id: globalSlotId++, eventDate: date, startTime: currentTime, endTime: slotEnd, day });
        currentTime = currentTime.plusMinutes(duration + betweenTime);
      }
  
      return slots;
    });
  
    // STEP 4: Generate group stage matches
    const matchEntities: Match[] = [];
    let slotIndex = 0;
  
    for (const [groupName, groupTeams] of groupedTeams.entries()) {
      const groupMatches: [Team, Team][] = [];
  
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          groupMatches.push([groupTeams[i], groupTeams[j]]);
        }
      }
  
      const totalTeams = groupTeams.length;
      const enoughDays = sortedEventDates.length >= totalTeams;
      const maxMatchesPerTeamPerDay = enoughDays ? 1 : Infinity;
      const matchCountPerDay = Array(sortedEventDates.length).fill(0);
      const teamDayMap = new Map<number, Set<number>>();
  
      for (const [teamA, teamB] of groupMatches) {
        let assigned = false;
  
        const dayPreference = [...Array(sortedEventDates.length).keys()].sort(
          (d1, d2) => matchCountPerDay[d1] - matchCountPerDay[d2]
        );
  
        for (const day of dayPreference) {
          const teamAPlayed = teamDayMap.get(teamA.teamId)?.has(day) ?? false;
          const teamBPlayed = teamDayMap.get(teamB.teamId)?.has(day) ?? false;
  
          if (
            (teamAPlayed ? 1 : 0) < maxMatchesPerTeamPerDay &&
            (teamBPlayed ? 1 : 0) < maxMatchesPerTeamPerDay
          ) {
            const availableSlot = timeSlots.find(s => s.day === day && !matchEntities.some(m =>
              m.eventDate.id === s.eventDate.id && m.startTime.equals(s.startTime)
            ));
  
            if (availableSlot) {
              const match = new Match();
              match.teamOne = { teamId: teamA.teamId } as Team;
              match.teamTwo = { teamId: teamB.teamId } as Team;
              match.eventDate = { id: availableSlot.eventDate.id } as EventDate;
              match.startTime = availableSlot.startTime;
              match.endTime = availableSlot.endTime;
              match.matchDuration = duration;
              match.type = TypeMatch.GROUP;
              matchEntities.push(match);
  
              teamDayMap.set(teamA.teamId, new Set([...(teamDayMap.get(teamA.teamId) || []), day]));
              teamDayMap.set(teamB.teamId, new Set([...(teamDayMap.get(teamB.teamId) || []), day]));
              matchCountPerDay[day]++;
              assigned = true;
              break;
            }
          }
        }
  
        if (!assigned && slotIndex < timeSlots.length) {
          const slot = timeSlots[slotIndex++];
          const match = new Match();
          match.teamOne = { teamId: teamA.teamId } as Team;
          match.teamTwo = { teamId: teamB.teamId } as Team;
          match.eventDate = { id: slot.eventDate.id } as EventDate;
          match.startTime = slot.startTime;
          match.endTime = slot.endTime;
          match.matchDuration = duration;
          match.type = TypeMatch.GROUP;
          matchEntities.push(match);
        }
      }
    }
  
    await this.matchRepository.saveAll(matchEntities);
  
    // STEP 4.5: Generate knockout matches (without team)
    const totalKnockoutTeams = tournament.numberOfGroups * tournament.advancePerGroup;
    const totalKnockoutMatches = totalKnockoutTeams - 1;
  
    const knockoutMatches: Match[] = [];
    let currentRoundTeamCount = totalKnockoutTeams;
    let round = 1;
    let matchOrder = 0;
  
    while (currentRoundTeamCount >= 2) {
      const matchesInRound = Math.floor(currentRoundTeamCount / 2);
  
      for (let i = 0; i < matchesInRound; i++) {
        if (slotIndex >= timeSlots.length) {
          throw new BadRequestException('Not enough time slots for knockout matches');
        }
  
        const slot = timeSlots[slotIndex++];
        const match = new Match();
        match.teamOne = null;
        match.teamTwo = null;
        match.eventDate = { id: slot.eventDate.id } as EventDate;
        match.startTime = slot.startTime;
        match.endTime = slot.endTime;
        match.matchDuration = duration;
        match.type = TypeMatch.KNOCKOUT;
        // match.round = round;
        // match.matchOrder = matchOrder++;
  
        knockoutMatches.push(match);
      }
  
      currentRoundTeamCount = matchesInRound;
      round++;
    }
  
    await this.matchRepository.saveAll(knockoutMatches);
    matchEntities.push(...knockoutMatches);
  
    // STEP 5: Convert to DTOs & build response
    const matchDtos: MatchDto[] = [];
    for (const date of sortedEventDates) {
      const dateMatches = await this.matchRepository.getAllByEventDateId(date.id);
      const dtos = await Promise.all(dateMatches.map(m => this.matchUtils.convertMatchToMatchDTO(m)));
      matchDtos.push(...dtos);
    }
  
    const generations = await Promise.all(
      sortedEventDates.map(async date => {
        const slots = await this.eventDateService.getSlotsByEventDateId(date.id);
        return this.matchUtils.createGeneration(date, matchDtos, slots);
      }),
    );
  
    return SuccessResponse(true, generations.length, generations);
  }
  
  

  // async generate(
  //   tournamentId: number,
  //   duration: number,
  //   betweenTime: number,
  //   startTime: LocalTime,
  //   endTime: LocalTime,
  // ): Promise<SuccessResponseDto<GenerationDto[]>> {
  //   // STEP 1: Validate and update tournament configuration
  //   const tournament = await this.tournamentService.findTournamentById(tournamentId);
  //   if (!tournament) throw new BadRequestException('Tournament not found');
  //   if (!TournamentStatusPermission.allowGenerateStatus.includes(tournament.status)) {
  //     throw new BadRequestException('Cannot generate schedule for this tournament');
  //   }
  
  //   tournament.matchDuration = duration;
  //   tournament.timeBetween = betweenTime;
  //   tournament.startTimeDefault = startTime.toString();
  //   tournament.endTimeDefault = endTime.toString();
  //   if (tournament.status === TournamentStatus.NEED_INFORMATION) tournament.status = TournamentStatus.READY;
  //   await this.tournamentService.save(tournament);
  
  //   // STEP 2: Reset & prepare data
  //   await this.matchService.deleteAllMatchByTournamentId(tournamentId);
  //   const matches = await this.matchService.matchList(tournamentId);
  //   const eventDates = await this.eventDateService.findAllByTournamentId(tournamentId);
  //   if (!eventDates.length) throw new BadRequestException('Event date is empty, please add them');
  
  //   const teamSet = new Set<number>();
  //   matches.forEach(([a, b]) => {
  //     if (a.teamId === b.teamId) throw new BadRequestException('A team cannot play against itself');
  //     teamSet.add(a.teamId);
  //     teamSet.add(b.teamId);
  //   });
  
  //   const totalTeams = teamSet.size;
  //   const expectedMatches = (totalTeams * (totalTeams - 1)) / 2;
  //   if (matches.length !== expectedMatches) {
  //     throw new BadRequestException(`Expected ${expectedMatches} matches but got ${matches.length}`);
  //   }
  
  //   eventDates.forEach(d => {
  //     d.startTime = startTime;
  //     d.endTime = endTime;
  //   });
  //   await this.eventDateService.saveAll(eventDates);
  
  //   const sortedEventDates = [...eventDates].sort((a, b) =>
  //     LocalDate.parse(a.date.toString()).compareTo(LocalDate.parse(b.date.toString()))
  //   );
  
  //   // STEP 3: Generate time slots
  //   let globalSlotId = 0;
  //   const timeSlots = sortedEventDates.flatMap((date, day) => {
  //     const slots = [];
  //     let currentTime = startTime;
  
  //     while (true) {
  //       const slotEnd = currentTime.plusMinutes(duration);
  //       if (slotEnd.isAfter(endTime)) break;
  
  //       slots.push({ id: globalSlotId++, eventDate: date, startTime: currentTime, endTime: slotEnd, day });
  //       currentTime = currentTime.plusMinutes(duration + betweenTime);
  //     }
  
  //     return slots;
  //   });
  
  //   // STEP 4: Build conflict graph
  //   const conflictGraph = new Map<number, Set<number>>();
  //   matches.forEach(([a1, b1], i) => {
  //     conflictGraph.set(i, new Set());
  //     matches.forEach(([a2, b2], j) => {
  //       if (i !== j && [a1.teamId, b1.teamId].some(t => t === a2.teamId || t === b2.teamId)) {
  //         conflictGraph.get(i)!.add(j);
  //       }
  //     });
  //   });
  
  //   // STEP 5: Assign matches to slots
  //   const matchToSlot = new Map<number, number>();
  //   const teamDayMap = new Map<number, Set<number>>();
  //   const usedSlots = new Set<number>();
  //   const matchCountPerDay = Array(sortedEventDates.length).fill(0);
  //   const enoughDays = sortedEventDates.length >= totalTeams;
  //   const maxMatchesPerTeamPerDay = enoughDays ? 1 : Infinity;
  
  //   const matchOrder = [...Array(matches.length).keys()].sort((a, b) =>
  //     (conflictGraph.get(b)?.size ?? 0) - (conflictGraph.get(a)?.size ?? 0)
  //   );
  
  //   for (const matchIdx of matchOrder) {
  //     const [a, b] = matches[matchIdx];
  //     let assigned = false;
  
  //     const dayPreference = [...Array(sortedEventDates.length).keys()].sort(
  //       (d1, d2) => matchCountPerDay[d1] - matchCountPerDay[d2]
  //     );
  
  //     for (const day of dayPreference) {
  //       const teamAPlayed = teamDayMap.get(a.teamId)?.has(day) ?? false;
  //       const teamBPlayed = teamDayMap.get(b.teamId)?.has(day) ?? false;
  
  //       if (
  //         (teamAPlayed ? 1 : 0) < maxMatchesPerTeamPerDay &&
  //         (teamBPlayed ? 1 : 0) < maxMatchesPerTeamPerDay
  //       ) {
  //         for (const slot of timeSlots.filter(s => s.day === day)) {
  //           const hasConflict = [...matchToSlot.entries()].some(([otherIdx, slotId]) =>
  //             slotId === slot.id && conflictGraph.get(matchIdx)?.has(otherIdx)
  //           );
  
  //           if (!usedSlots.has(slot.id) && !hasConflict) {
  //             matchToSlot.set(matchIdx, slot.id);
  //             usedSlots.add(slot.id);
  //             teamDayMap.set(a.teamId, new Set([...(teamDayMap.get(a.teamId) || []), day]));
  //             teamDayMap.set(b.teamId, new Set([...(teamDayMap.get(b.teamId) || []), day]));
  //             matchCountPerDay[day]++;
  //             assigned = true;
  //             break;
  //           }
  //         }
  //       }
  
  //       if (assigned) break;
  //     }
  
  //     // Relaxed constraint if no valid slot found
  //     if (!assigned) {
  //       for (const slot of timeSlots) {
  //         const hasConflict = [...matchToSlot.entries()].some(([otherIdx, slotId]) =>
  //           slotId === slot.id && conflictGraph.get(matchIdx)?.has(otherIdx)
  //         );
  
  //         if (!usedSlots.has(slot.id) && !hasConflict) {
  //           matchToSlot.set(matchIdx, slot.id);
  //           usedSlots.add(slot.id);
  //           teamDayMap.set(a.teamId, new Set([...(teamDayMap.get(a.teamId) || []), slot.day]));
  //           teamDayMap.set(b.teamId, new Set([...(teamDayMap.get(b.teamId) || []), slot.day]));
  //           matchCountPerDay[slot.day]++;
  //           break;
  //         }
  //       }
  //     }
  //   }
  
  //   // STEP 6: Persist matches
  //   const matchEntities = Array.from(matchToSlot.entries()).map(([idx, slotId]) => {
  //     const slot = timeSlots[slotId];
  //     const [a, b] = matches[idx];
  //     const match = new Match();
  //     match.teamOne = { teamId: a.teamId } as Team;
  //     match.teamTwo = { teamId: b.teamId } as Team;
  //     match.eventDate = { id: slot.eventDate.id } as EventDate;
  //     match.startTime = slot.startTime;
  //     match.endTime = slot.endTime;
  //     match.matchDuration = duration;
  //     match.type = TypeMatch.MATCH;
  //     return match;
  //   });
  
  //   await this.matchRepository.saveAll(matchEntities);
  
  //   // STEP 7: Build response DTO
  //   const matchDtos: MatchDto[] = [];
  //   for (const date of sortedEventDates) {
  //     const dateMatches = await this.matchRepository.getAllByEventDateId(date.id);
  //     const dtos = await Promise.all(dateMatches.map(m => this.matchUtils.convertMatchToMatchDTO(m)));
  //     matchDtos.push(...dtos);
  //   }
  
  //   const generations = await Promise.all(
  //     sortedEventDates.map(date => this.matchUtils.createGeneration(date, matchDtos))
  //   );
  
  //   return SuccessResponse(true, generations.length, generations);
  // }
  
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
    const { matches, eventDates, totalTeams } = await this.resetAndPrepareData(tournamentId, startTime, endTime);
    const matchPairs = matches as [Team, Team][];

    // STEP 3: Generate time slots and save to DB
    const timeSlots = await this.generateAndSaveTimeSlots(eventDates, duration, betweenTime, startTime, endTime);

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
    await this.persistMatches(matchPairs, matchToSlot, timeSlots, tournament.matchDuration);

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
    if (!TournamentStatusPermission.allowGenerateStatus.includes(t.status)) {
      throw new BadRequestException('Cannot generate schedule for this tournament');
    }

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
    await this.matchService.deleteAllMatchByTournamentId(tournamentId);
    const rawMatches = await this.matchService.matchList(tournamentId);
    const eventDates = await this.eventDateService.findAllByTournamentId(tournamentId);
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
    dates.forEach(async element => {
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

  private buildConflictGraph(
    matches:  [Team, Team][],
  ) {
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
    matches: [ { teamId: number } , { teamId: number } ][],
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
        //matches: matchDtos,
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
      const slots = await this.eventDateService.getSlotsByEventDateId(oldEventDate.id);

      generations.push(
        await this.matchUtils.createGeneration(oldEventDate, oldEventMatchDTOs, slots),
      );
      await this.matchService.saveAll(matchesUpdated[0]);
    }

    const newEventMatchDTOs =
      await this.matchUtils.convertMatchListToMatchDtoList(
        await this.matchService.getMatchByEventDateId(eventDateIdSelected),
      );
      const slots = await this.eventDateService.getSlotsByEventDateId(eventDateIdSelected);
    generations.push(
      await this.matchUtils.createGeneration(newEventDate, newEventMatchDTOs, slots),
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
      const matches = await this.matchUtils.convertMatchListToMatchDtoList(
        await this.matchService.getMatchByEventDateId(eventDate.id),
      );
      const slots = await this.eventDateService.getSlotsByEventDateId(eventDate.id);
      generations.push(
        await this.matchUtils.createGeneration(eventDate, matches, slots),
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
