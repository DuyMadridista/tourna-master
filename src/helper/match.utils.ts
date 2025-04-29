import { Injectable } from '@nestjs/common';
import { Match } from 'src/modules/match/entities/match.entity';
import { MatchDto } from 'src/modules/match/dto/MatchDto';
import { EventDate } from 'src/modules/event-date/entities/event-date.entity';
import { GenerationDto } from 'src/modules/generate/dto/GenerationDto';
import { TypeMatch } from '../enums/match-type.enum';
import { LocalDate, LocalDateTime, LocalTime } from '@js-joda/core';
import { SlotDTO } from '../modules/event-date/dto/slot.dto';
import { Slot } from 'src/modules/event-date/entities/slot.entity';

@Injectable()
export class MatchUtils {
  constructor() {}

  numberMatchTimes(schedule: Map<EventDate, Array<Array<LocalTime>>>): number {
    return Array.from(schedule.values()).reduce(
      (acc, times) => acc + times.length,
      0,
    );
  }

  compareNumMatchAndNumMatchTime(
    numMatch: number,
    numMatchTime: number,
  ): boolean {
    return numMatchTime >= numMatch;
  }

  async convertMatchToMatchDTO(match: Match,slot?: Slot): Promise<MatchDto> {
    try {
      const matchDTO = new MatchDto();
      matchDTO.id = match.id;
      if (match.type === TypeMatch.MATCH || match.type === TypeMatch.GROUP) {
        matchDTO.teamOne = match.teamOne;
        matchDTO.teamTwo = match.teamTwo;
      }
      matchDTO.group = match.teamOne?.group || null;
      matchDTO.timeDuration = match.matchDuration;
      matchDTO.startTime = match.startTime;
      matchDTO.endTime = match.endTime;
      matchDTO.eventDateId = match.eventDate?.id ?? slot.eventDate.id;
      matchDTO.type = match.type;
      matchDTO.title = match.title;
      matchDTO.slotId = match.slot?.id ?? slot.id;
      return matchDTO;
    } catch (error) {
      console.log(match);
      
      console.log(error);
      
    }

  }

  async createGeneration(
    eventDate: EventDate | null,
    SlotDTOs: SlotDTO[],
  ): Promise<GenerationDto> {
    const generationDTO = new GenerationDto();
    if (eventDate) {
      generationDTO.eventDateId = eventDate.id;
      generationDTO.date = eventDate.date;
      generationDTO.startTime = eventDate.startTime;
      generationDTO.endTime = eventDate.endTime;
      generationDTO.slots = SlotDTOs;
    }
    return generationDTO;
  }


  public timeSheet(
    duration: number,
    betweenTime: number,
    eventDates: EventDate[],
  ): Map<EventDate, number> {
    const numberOfTimeEachEvent = new Map<EventDate, number>();
    const endDate = LocalTime.of(23, 59, 59);

    for (const eventDate of eventDates) {
      let startMatch = eventDate.startTime;
      let endMatch = startMatch.plusMinutes(duration);
      const thisEventDate = LocalDateTime.of(
        LocalDate.parse(eventDate.date.toString()),
        endDate,
      );
      let checkDateTime = LocalDateTime.of(
        LocalDate.parse(eventDate.date.toString()),
        startMatch,
      );
      let countTime = 0;

      while (
        startMatch.isBefore(eventDate.endTime) &&
        endMatch.isBefore(eventDate.endTime) &&
        checkDateTime.isBefore(thisEventDate)
      ) {
        countTime++;
        startMatch = endMatch.plusMinutes(betweenTime);
        endMatch = startMatch.plusMinutes(duration);
        checkDateTime = checkDateTime.plusMinutes(betweenTime + duration);
      }

      numberOfTimeEachEvent.set(eventDate, countTime);
    }

    const sortedEntries = [...numberOfTimeEachEvent.entries()].sort((a, b) => {
      const dateA = LocalDate.parse(a[0].date.toString());
      const dateB = LocalDate.parse(b[0].date.toString());
      return dateA.compareTo(dateB);
    });

    return new Map(sortedEntries);
  }

  async convertMatchListToMatchDtoList(matches: Match[]): Promise<MatchDto[]> {
    return Promise.all(
      matches.map((match) => this.convertMatchToMatchDTO(match)),
    );
  }

  async convertMatchToMatchDto(matches: Match[]): Promise<MatchDto[]> {
    const matchDtos = await this.convertMatchListToMatchDtoList(matches);
    return matchDtos.sort((a, b) => a.startTime.compareTo(b.startTime));
  }
}
