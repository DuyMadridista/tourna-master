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

@Injectable()
export class GenerationService {
  constructor(
    private readonly matchService: MatchService,
    private readonly eventDateService: EventDateService,
    private readonly tournamentService: TournamentService,
    private readonly matchUtils: MatchUtils,
    private readonly matchRepository: MatchRepository,
  ) {}

  async generate(
    tournamentId: number,
    duration: number,
    betweenTime: number,
    startTime: LocalTime,
    endTime: LocalTime,
  ): Promise<SuccessResponseDto<GenerationDto[]>> {
    // // delete all matches of tournament before generate
    await this.matchService.deleteAllMatchByTournamentId(tournamentId);
    const matches = await this.matchService.matchList(tournamentId);
    const eventDates =
      await this.eventDateService.findAllByTournamentId(tournamentId);
    const tournament =
      await this.tournamentService.findTournamentById(tournamentId);

    if (!tournament) throw new BadRequestException('Tournament not found');
    if (
      !TournamentStatusPermission.allowGenerateStatus.includes(
        tournament.status,
      )
    ) {
      throw new BadRequestException(
        'Cannot generate schedule for this tournament',
      );
    }

    if (duration) tournament.matchDuration = duration;
    if (betweenTime) tournament.timeBetween = betweenTime;
    tournament.startTimeDefault = startTime.toString();
    tournament.endTimeDefault = endTime.toString();
    tournament.status =
      tournament.status === TournamentStatus.NEED_INFORMATION
        ? TournamentStatus.READY
        : tournament.status;

    await this.tournamentService.save(tournament);

    if (!eventDates.length)
      throw new BadRequestException('Event date is empty, please add them');

    eventDates.forEach((date) => {
      if (startTime) date.startTime = startTime;
      if (endTime) date.endTime = endTime;
    });
    await this.eventDateService.saveAll(eventDates);

    const timeSheetMatches = await this.matchService.timeSheetMatches(
      duration,
      betweenTime,
      matches,
      eventDates,
    );
    let matchList: MatchDto[] = [];
    let warningMessage = '';

    if (
      !this.matchUtils.compareNumMatchAndNumMatchTime(
        matches.length,
        this.matchUtils.numberMatchTimes(timeSheetMatches),
      )
    ) {
      const extendedEndTime = LocalTime.of(23, 59, 59);
      eventDates.forEach((ed) => (ed.endTime = extendedEndTime));
      const newTimeSheetMatches = await this.matchService.timeSheetMatches(
        duration,
        betweenTime,
        matches,
        eventDates,
      );

      if (
        !this.matchUtils.compareNumMatchAndNumMatchTime(
          matches.length,
          this.matchUtils.numberMatchTimes(newTimeSheetMatches),
        )
      ) {
        throw new BadRequestException(
          'Time of event date is not enough for all matches',
        );
      }
      matchList = await this.matchService.mappingMatchAndTime(
        matches,
        newTimeSheetMatches,
        duration,
      );
      warningMessage =
        'The total duration of matches exceeds the time frame. Recommendation: extend event_date time.';
    } else {
      matchList = await this.matchService.mappingMatchAndTime(
        matches,
        timeSheetMatches,
        duration,
      );
    }

    eventDates.sort((a, b) =>
      LocalDate.parse(a.date.toString()).compareTo(
        LocalDate.parse(b.date.toString()),
      ),
    );
    const generations: GenerationDto[] = await Promise.all(
      eventDates.map((eventDate) =>
        this.matchUtils.createGeneration(eventDate, matchList),
      ),
    );
    const response = SuccessResponse(true, generations.length, generations);
    if (warningMessage) response.additionalData({ warningMessage });
    return response;
  }
//   async generate(
//     tournamentId: number,
//     duration: number,
//     betweenTime: number,
//     startTime: LocalTime,
//     endTime: LocalTime,
//   ): Promise<SuccessResponseDto<GenerationDto[]>> {
//     // STEP 1: Validate tournament and configuration
//     const tournament = await this.tournamentService.findTournamentById(tournamentId);
//     if (!tournament) throw new BadRequestException('Tournament not found');
//     if (!TournamentStatusPermission.allowGenerateStatus.includes(tournament.status)) {
//       throw new BadRequestException('Cannot generate schedule for this tournament');
//     }
  
//     // Update tournament config
//     tournament.matchDuration = duration;
//     tournament.timeBetween = betweenTime;
//     tournament.startTimeDefault = startTime.toString();
//     tournament.endTimeDefault = endTime.toString();
//     if (tournament.status === TournamentStatus.NEED_INFORMATION) tournament.status = TournamentStatus.READY;
//     await this.tournamentService.save(tournament);
  
//     // STEP 2: Clean old data and retrieve fresh data
//     await this.matchService.deleteAllMatchByTournamentId(tournamentId);
//     const matches = await this.matchService.matchList(tournamentId);
//     const eventDates = await this.eventDateService.findAllByTournamentId(tournamentId);
//     if (!eventDates.length) throw new BadRequestException('Event date is empty, please add them');
  
//     // STEP 3: Validate match structure and round robin correctness
//     const teamSet = new Set<number>();
//     matches.forEach(([a, b]) => {
//       if (a.teamId === b.teamId) throw new BadRequestException('A team cannot play against itself');
//       teamSet.add(a.teamId);
//       teamSet.add(b.teamId);
//     });
//     const totalTeams = teamSet.size;
//     const expectedMatches = (totalTeams * (totalTeams - 1)) / 2;
//     if (matches.length !== expectedMatches) {
//       throw new BadRequestException(`Invalid match count for Single Round Robin. Expected ${expectedMatches} matches but got ${matches.length}.`);
//     }
  
//     // STEP 4: Normalize and sort event dates
//     eventDates.forEach(d => {
//       d.startTime = startTime;
//       d.endTime = endTime;
//     });
//     await this.eventDateService.saveAll(eventDates);
//     const sortedEventDates = [...eventDates].sort((a, b) => LocalDate.parse(a.date.toString()).compareTo(LocalDate.parse(b.date.toString())));
  
//     // STEP 5: Generate time slots
//     let globalSlotId = 0;
//     const timeSlots = sortedEventDates.flatMap((date, day) => {
//       const slots = [];
//       let currentTime = startTime;

//       while (true) {
//         const slotEnd = currentTime.plusMinutes(duration);
//         if (slotEnd.isBefore(currentTime) || slotEnd.isAfter(endTime)) break;
  
//         slots.push({
//           id: globalSlotId++,
//           eventDate: date,
//           startTime: currentTime,
//           endTime: slotEnd,
//           day,
//         });
  
//         currentTime = currentTime.plusMinutes(duration + betweenTime);
//       }
  
//       return slots;
//     });
  
//     // STEP 6: Build conflict graph
//     const conflictGraph = new Map<number, Set<number>>();
//     matches.forEach(([a1, b1], i) => {
//       conflictGraph.set(i, new Set());
//       matches.forEach(([a2, b2], j) => {
//         if (i !== j && [a1.teamId, b1.teamId].some(id => id === a2.teamId || id === b2.teamId)) {
//           conflictGraph.get(i)!.add(j);
//         }
//       });
//     });
  
// // STEP 7: Assign slots using greedy coloring with hard constraints, allow soft constraint fallback
// const matchToSlot = new Map<number, number>();
// const teamDayMap = new Map<number, Set<number>>(); // Track which days teams are scheduled to play
// const usedSlots = new Set<number>();
// const avgPerDay = Math.ceil(matches.length / sortedEventDates.length);

// // Create an array to track the number of matches scheduled for each day
// const matchCountPerDay = Array(sortedEventDates.length).fill(0);

// // Create a sorted list of available days, from the one with the least number of matches scheduled
// const availableDays = sortedEventDates.map((_, dayIndex) => dayIndex).sort((a, b) => matchCountPerDay[a] - matchCountPerDay[b]);

// // STEP: Create matchOrder for scheduling
// // matchOrder is the sorted array of match indices, sorted by the number of conflicts for each match
// const matchOrder = [...Array(matches.length).keys()].sort((a, b) => {
//   const conflictsA = conflictGraph.get(a)?.size || 0;
//   const conflictsB = conflictGraph.get(b)?.size || 0;
//   return conflictsB - conflictsA;  // Sort descending by conflict count (more conflicts means higher priority)
// });

// // Function to check if we can assign a match to a day based on the number of matches already scheduled
// const canAssignToDay = (day: number, maxMatchesPerDay: number): boolean => {
//   return matchCountPerDay[day] < maxMatchesPerDay;
// };

// // Try to assign matches to days, considering the number of matches already scheduled per day
// for (const matchIdx of matchOrder) {
//   const [a, b] = matches[matchIdx];
//   let assigned = false;

//   // Try to assign match to a day with the least number of matches
//   for (const day of availableDays) {
//     if (!assigned && canAssignToDay(day, avgPerDay)) {
//       for (const slot of timeSlots.filter(s => s.day === day)) {
//         const sameTimeConflict = [...matchToSlot.entries()].some(([idx, sId]) =>
//           sId === slot.id && conflictGraph.get(matchIdx)?.has(idx)
//         );
//         const teamPlayedToday =
//           (teamDayMap.get(a.teamId)?.has(slot.day) || false) ||
//           (teamDayMap.get(b.teamId)?.has(slot.day) || false);

//         if (!usedSlots.has(slot.id) && !sameTimeConflict && !teamPlayedToday) {
//           matchToSlot.set(matchIdx, slot.id);
//           usedSlots.add(slot.id);
//           teamDayMap.set(a.teamId, new Set([...(teamDayMap.get(a.teamId) || []), slot.day]));
//           teamDayMap.set(b.teamId, new Set([...(teamDayMap.get(b.teamId) || []), slot.day]));
//           matchCountPerDay[day]++;  // Increment the match count for the assigned day
//           assigned = true;
//           break;
//         }
//       }
//     }

//     if (assigned) break;
//   }

//   // If not assigned with soft constraint, fallback to assignment without checking max matches per day
//   if (!assigned) {
//     for (const slot of timeSlots) {
//       const sameTimeConflict = [...matchToSlot.entries()].some(([idx, sId]) =>
//         sId === slot.id && conflictGraph.get(matchIdx)?.has(idx)
//       );
//       const teamPlayedToday =
//         (teamDayMap.get(a.teamId)?.has(slot.day) || false) ||
//         (teamDayMap.get(b.teamId)?.has(slot.day) || false);

//       if (!usedSlots.has(slot.id) && !sameTimeConflict && !teamPlayedToday) {
//         matchToSlot.set(matchIdx, slot.id);
//         usedSlots.add(slot.id);
//         teamDayMap.set(a.teamId, new Set([...(teamDayMap.get(a.teamId) || []), slot.day]));
//         teamDayMap.set(b.teamId, new Set([...(teamDayMap.get(b.teamId) || []), slot.day]));
//         matchCountPerDay[slot.day]++;  // Increment the match count for the assigned day
//         assigned = true;
//         break;
//       }
//     }
//   }

//   // Ensure a match is assigned even if the constraints are violated (teams can play twice a day if needed)
//   if (!assigned) {
//     const lastAssignedSlotId = [...matchToSlot.values()].pop();
//     const lastAssignedSlot = timeSlots.find(slot => slot.id === lastAssignedSlotId);

//     if (lastAssignedSlot) {
//       const nextAvailableSlot = timeSlots.find(slot => 
//         !usedSlots.has(slot.id) && slot.startTime.isAfter(lastAssignedSlot.startTime)
//       );

//       if (nextAvailableSlot) {
//         matchToSlot.set(matchIdx, nextAvailableSlot.id);
//         usedSlots.add(nextAvailableSlot.id);
//         teamDayMap.set(a.teamId, new Set([...(teamDayMap.get(a.teamId) || []), nextAvailableSlot.day]));
//         teamDayMap.set(b.teamId, new Set([...(teamDayMap.get(b.teamId) || []), nextAvailableSlot.day]));
//         matchCountPerDay[nextAvailableSlot.day]++;  // Increment the match count for the assigned day
//       }
//     }
//   }
// }


  
//     // STEP 8: Save matches
//     const matchEntities = Array.from(matchToSlot.entries()).map(([idx, slotId]) => {
//       const slot = timeSlots[slotId];
//       const [a, b] = matches[idx];
//       const match = new Match();
//       match.teamOne = { teamId: a.teamId } as Team;
//       match.teamTwo = { teamId: b.teamId } as Team;
//       match.eventDate = { id: slot.eventDate.id } as EventDate;
//       match.startTime = slot.startTime;
//       match.endTime = slot.endTime;
//       match.matchDuration = duration;
//       match.type = TypeMatch.MATCH;
//       return match;
//     });
//     await this.matchRepository.saveAll(matchEntities);
  
//     // STEP 9: Return response DTOs
//     const matchDtos: MatchDto[] = [];
//     for (const date of sortedEventDates) {
//       const dateMatches = await this.matchRepository.getAllByEventDateId(date.id);
//       const dtos = await Promise.all(dateMatches.map(m => this.matchUtils.convertMatchToMatchDTO(m)));
//       matchDtos.push(...dtos);
//     }
//     const generations = await Promise.all(
//       sortedEventDates.map(date => this.matchUtils.createGeneration(date, matchDtos))
//     );
  
//     return SuccessResponse(true, generations.length, generations);
//   }
  
  
  
  
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
      generations.push(
        await this.matchUtils.createGeneration(oldEventDate, oldEventMatchDTOs),
      );
      await this.matchService.saveAll(matchesUpdated[0]);
    }

    const newEventMatchDTOs =
      await this.matchUtils.convertMatchListToMatchDtoList(
        await this.matchService.getMatchByEventDateId(eventDateIdSelected),
      );
    generations.push(
      await this.matchUtils.createGeneration(newEventDate, newEventMatchDTOs),
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
      generations.push(
        await this.matchUtils.createGeneration(eventDate, matches),
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
