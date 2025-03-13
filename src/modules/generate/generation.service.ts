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

@Injectable()
export class GenerationService {
  constructor(
    private readonly matchService: MatchService,
    private readonly eventDateService: EventDateService,
    private readonly tournamentService: TournamentService,
    private readonly matchUtils: MatchUtils,
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
    const eventDates = await this.eventDateService.findAllByTournamentId(tournamentId);
    const tournament = await this.tournamentService.findTournamentById(tournamentId);

    if (!tournament) throw new BadRequestException('Tournament not found');
    if (!TournamentStatusPermission.allowGenerateStatus.includes(tournament.status)) {
      throw new BadRequestException('Cannot generate schedule for this tournament');
    }

    if (duration) tournament.matchDuration = duration;
    if (betweenTime) tournament.timeBetween = betweenTime;
    tournament.startTimeDefault = startTime.toString();
    tournament.endTimeDefault = endTime.toString();
    tournament.status = tournament.status === TournamentStatus.NEED_INFORMATION ? TournamentStatus.READY : tournament.status;

    await this.tournamentService.save(tournament);

    if (!eventDates.length) throw new BadRequestException('Event date is empty, please add them');

    eventDates.forEach(date => {
      if (startTime) date.startTime = startTime;
      if (endTime) date.endTime = endTime;
    });
    await this.eventDateService.saveAll(eventDates);

    const timeSheetMatches = await this.matchService.timeSheetMatches(duration, betweenTime, matches.length, eventDates);
    let matchList: MatchDto[] = [];
    let warningMessage = '';

    if (!this.matchUtils.compareNumMatchAndNumMatchTime(matches.length, this.matchUtils.numberMatchTimes(timeSheetMatches))) {
      const extendedEndTime = LocalTime.of(23, 59, 59);
      eventDates.forEach(ed => ed.endTime = extendedEndTime);
      const newTimeSheetMatches = await this.matchService.timeSheetMatches(duration, betweenTime, matches.length, eventDates);


      if (!this.matchUtils.compareNumMatchAndNumMatchTime(matches.length, this.matchUtils.numberMatchTimes(newTimeSheetMatches))) {
        throw new BadRequestException('Time of event date is not enough for all matches');
      }
      matchList = await this.matchService.mappingMatchAndTime(matches, newTimeSheetMatches, duration);
      warningMessage = 'The total duration of matches exceeds the time frame. Recommendation: extend event_date time.';
    } else {
      matchList = await this.matchService.mappingMatchAndTime(matches, timeSheetMatches, duration);
    }

    eventDates.sort((a, b) =>
      LocalDate.parse(a.date.toString()).compareTo(LocalDate.parse(b.date.toString()))
    );
    const generations: GenerationDto[] = await Promise.all(
        eventDates.map(eventDate =>
          this.matchUtils.createGeneration(eventDate, matchList)
        )
      );
    const response =  SuccessResponse(true, generations.length, generations);
    if (warningMessage) response.additionalData({ warningMessage });
    return response;
  }

  async updateGeneration(
    matchId: number,
    eventDateIdSelected: number,
    newPositionMatchId: number,
  ): Promise<GenerationDto[]> {
    const generations: GenerationDto[] = [];

    const oldMatch = await this.matchService.getMatchById(matchId);
    const matchOfNewTime = await this.matchService.getMatchById(newPositionMatchId);
    const clonedMatch =structuredClone(oldMatch);

    const oldEventDate = await this.eventDateService.findByEventDateId(oldMatch.eventDate.id);
    const newEventDate = await this.eventDateService.findByEventDateId(eventDateIdSelected);

    if (newEventDate.date.isBefore(LocalDate.now())) {
      throw new BadRequestException('Cannot switch to a date in the past.');
    }

    const matchesOfNewEventDate = await this.matchService.getMatchByEventDateId(eventDateIdSelected);
    const indexOfNewTime = matchOfNewTime ? matchesOfNewEventDate.findIndex(m => m.id === matchOfNewTime.id) : null;

    if (matchOfNewTime) {
      clonedMatch.startTime = matchOfNewTime.startTime;
      clonedMatch.endTime = matchOfNewTime.endTime;
      clonedMatch.eventDate.id = eventDateIdSelected;
    }

    const tournament = await this.tournamentService.findTournamentById(newEventDate.tournament.id);
    const betweenTime = tournament.timeBetween;
    const duration = tournament.matchDuration;
    const startTime = newEventDate.startTime;
    let matchesUpdated: Match[][] = [];

    if (oldMatch.eventDate.id === eventDateIdSelected) {
      const updated = await this.updateInDate(clonedMatch, duration, betweenTime, matchesOfNewEventDate, oldMatch, indexOfNewTime, matchOfNewTime);
      await this.matchService.saveAll(updated);
    } else {
      matchesUpdated = await this.updateTwoDifferentDays(clonedMatch, duration, betweenTime, matchesOfNewEventDate, oldMatch, indexOfNewTime, matchOfNewTime, startTime, eventDateIdSelected);
      await this.matchService.saveAll(matchesUpdated[1]);
      const oldEventMatchDTOs = await this.matchUtils.convertMatchListToMatchDtoList(await this.matchService.getMatchByEventDateId(oldEventDate.id));
      generations.push( await this.matchUtils.createGeneration(oldEventDate, oldEventMatchDTOs));
      await this.matchService.saveAll(matchesUpdated[0]);
    }

    const newEventMatchDTOs = await this.matchUtils.convertMatchListToMatchDtoList(await this.matchService.getMatchByEventDateId(eventDateIdSelected));
    generations.push( await this.matchUtils.createGeneration(newEventDate, newEventMatchDTOs));

    return generations;
  }

  async getAllGeneration(tournamentId: number): Promise<SuccessResponseDto<GenerationDto[]>> {
    const eventDates = await this.eventDateService.findAllByTournamentId(tournamentId);
    const generations: GenerationDto[] = [];
    eventDates.sort((a, b) =>
      LocalDate.parse(a.date.toString()).compareTo(LocalDate.parse(b.date.toString()))
    );
    for (const eventDate of eventDates) {
      const matches =await this.matchUtils.convertMatchListToMatchDtoList(await this.matchService.getMatchByEventDateId(eventDate.id));
      generations.push(await this.matchUtils.createGeneration(eventDate, matches));
    }

    const SuccessResponseDto = SuccessResponse(true, generations.length, generations);
    const duplicateMatches = await this.matchService.findAllDuplicateMatchByTournamentId(tournamentId);
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
      const matches = await this.matchService.getMatchByEventDateId(eventDate.id);
      for (const match of matches) {
        if (match.startTime.isAfter( eventDate.endTime) || match.endTime .isAfter( eventDate.endTime)) {
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
    matchOfNewTime: Match
  ): Promise<Match[]> {
    let endTime: LocalTime;
    let matchesNew: Match[] = [];
  
    const indexOfOldMatch = matchesOfNewEventDate.findIndex(m => m.id === oldMatch.id);
    matchesOfNewEventDate.splice(indexOfOldMatch, 1); // remove oldMatch
  
    if (indexOfOldMatch < indexOfNewTime) {
      endTime = oldMatch.startTime.minusMinutes(betweenTime);
      matchesNew = this.updateTime(
        endTime,
        betweenTime,
        duration,
        matchesOfNewEventDate.slice(indexOfOldMatch, indexOfNewTime).length + indexOfOldMatch,
        matchesOfNewEventDate,
        indexOfOldMatch
      );
    } else if (indexOfNewTime < indexOfOldMatch) {
      endTime = matchOfNewTime.endTime;
      matchesNew = this.updateTime(
        endTime,
        betweenTime,
        duration,
        matchesOfNewEventDate.slice(indexOfNewTime, indexOfOldMatch).length + indexOfNewTime,
        matchesOfNewEventDate,
        indexOfNewTime
      );
    }
  
    matchesNew.splice(indexOfNewTime, 0, match);
    return matchesNew;
  }
  
  async  updateTwoDifferentDays(
    match: Match,
    duration: number,
    betweenTime: number,
    matchesOfNewEventDate: Match[],
    oldMatch: Match,
    indexOfNewTime: number,
    matchOfNewTime: Match | null,
    startTime: LocalTime,
    eventDateIdSelected: number
  ): Promise<Match[][]> {
    const matchesOfOldEventDate = await this.matchService.getMatchByEventDateId(oldMatch.eventDate.id);
  
    const matchesNewEventDateSize = matchesOfNewEventDate.length;
    const matchesOldEventDateSize = matchesOfOldEventDate.length;
  
    let matchesNew: Match[] = [];
    let matchesOld: Match[];
    const matchesUpdated: Match[][] = [];
  
    const indexOfOldTime = matchesOfOldEventDate.findIndex(m => m.id === oldMatch.id);
  
    // Update matches in new event date
    if (!matchOfNewTime) {
      if (matchesNewEventDateSize === 0) {
        match.startTime = startTime;
        match.endTime = startTime.plusMinutes(duration);
        match.eventDate.id = eventDateIdSelected;
        matchesNew.push(match);
      } else {
        const newStartTime = matchesOfNewEventDate[matchesNewEventDateSize - 1].endTime.plusMinutes(betweenTime);
        match.startTime = newStartTime;
        match.endTime = newStartTime.plusMinutes(duration);
        match.eventDate.id = matchesOfNewEventDate[matchesNewEventDateSize - 1].eventDate.id;
        matchesNew = [...matchesOfNewEventDate, match];
      }
    } else {
      matchesNew = this.updateTime(
        matchOfNewTime.endTime,
        betweenTime,
        duration,
        matchesNewEventDateSize,
        matchesOfNewEventDate,
        indexOfNewTime
      );
      matchesNew.splice(indexOfNewTime, 0, match);
    }
  
    matchesOfOldEventDate.splice(indexOfOldTime, 1);
    const endTime = oldMatch.startTime.minusMinutes(betweenTime);
    matchesOld = this.updateTime(
      endTime,
      betweenTime,
      duration,
      matchesOldEventDateSize - 1,
      matchesOfOldEventDate,
      indexOfOldTime
    );
  
    matchesUpdated[0] = matchesNew;
    matchesUpdated[1] = matchesOld;
  
    return matchesUpdated;
  }
  
}
