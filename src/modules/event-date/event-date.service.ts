import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventDate } from './entities/event-date.entity';
import { EventDateRepository } from './event-date.repository';
import { MatchRepository } from '../match/match.repository';
import { SuccessResponseDto } from 'src/helper/successResponse.dto';
import * as moment from 'moment';
import { TournamentRepository } from '../tournament/tournament.repository';
import { Duration, LocalDate, LocalDateTime, LocalTime } from '@js-joda/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Match } from '../match/entities/match.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { Slot } from './entities/slot.entity';
import e from 'express';
import { SlotDTO } from './dto/slot.dto';
import { MatchUtils } from 'src/helper/match.utils';

@Injectable()
export class EventDateService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventDateRepository: EventDateRepository,

    private readonly tournamentRepository: TournamentRepository,
    @InjectRepository(Slot)
    private readonly slotRepository: Repository<Slot>,
    private readonly matchRepository: MatchRepository,
    private readonly matchUtils: MatchUtils,
    
  ) {}

  async findAllByTournamentId(tournamentId: number): Promise<EventDate[]> {
    return this.eventDateRepository.findAllByTournamentId(tournamentId);
  }
  
  async saveAll(eventDates: EventDate[]): Promise<void> {
    await this.eventDateRepository.saveAll(eventDates);
  }

  async deleteAllByTournamentId(tournamentId: number): Promise<void> {
    await this.eventDateRepository.deleteAllByTournamentId(tournamentId);
  }

  async deleteByEventDateId(eventDateId: number): Promise<void> {
    await this.eventDateRepository.deleteByEventDateId(eventDateId);
  }

  async findByEventDateId(eventDateId: number): Promise<EventDate> {
    const eventDate = await this.eventDateRepository.findOne({
      where: { id: eventDateId },
      relations: ['tournament'],
    });
    if (!eventDate) {
      throw new NotFoundException(
        `EventDate with id ${eventDateId} does not exist`,
      );
    }
    return eventDate;
  }

  async updateStartTimeAndEndTime(
    tournamentId: number,
    eventDateId: number,
    startTime: string,
    endTime: string,
  ): Promise<SuccessResponseDto<EventDate>> {
    let warningMessage = '';

    const eventDate = await this.eventDateRepository.findById(eventDateId);
    if (!eventDate) {
      throw new NotFoundException(
        `EventDate with id ${eventDateId} does not exist`,
      );
    }

    const tournament =
      await this.tournamentRepository.findTournamentByIdAndIsDeletedFalse(
        tournamentId,
      );
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (['FINISHED', 'DISCARDED'].includes(tournament.status)) {
      throw new BadRequestException('This tournament is finished or discarded');
    }

    const startTimeValid = LocalTime.parse(startTime);
    const endTimeValid = LocalTime.parse(endTime);

    if (tournamentId !== eventDate.tournament.id) {
      throw new NotFoundException(
        `EventDate with id ${eventDateId} does not belong to this tournament`,
      );
    }

    if (startTimeValid.isAfter(endTimeValid)) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (startTimeValid.equals(endTimeValid)) {
      throw new BadRequestException('Start time and end time are the same');
    }

    if (
      eventDate.date === LocalDate.now() &&
      startTimeValid.isBefore(LocalTime.now()) &&
      !startTimeValid.equals(eventDate.startTime)
    ) {
      throw new BadRequestException('Start time must be after current time');
    }

    const matches =
      await this.matchRepository.getAllByEventDateIdOrOrderByStartTime(
        eventDateId,
        startTimeValid,
      );
    const startTimeChange = Duration.between(
      eventDate.startTime,
      startTimeValid,
    ).toMinutes();

    eventDate.startTime = startTimeValid;
    eventDate.endTime = endTimeValid;
    eventDate.updatedAt = LocalDateTime.now();

    for (const match of matches) {
      const matchStartTime = match.startTime;
      const matchEndTime = match.endTime;

      const newMatchStartTime = matchStartTime.plusMinutes(startTimeChange);
      const newMatchEndTime = matchEndTime.plusMinutes(startTimeChange);

      if (
        (newMatchEndTime.isBefore(matchEndTime) ||
          newMatchStartTime.isBefore(matchStartTime)) &&
        startTimeChange > 0
      ) {
        throw new BadRequestException('Match time is out of range');
      }

      match.startTime = newMatchStartTime;
      match.endTime = newMatchEndTime;

      if (
        newMatchStartTime.isAfter(eventDate.endTime) ||
        newMatchEndTime.isAfter(eventDate.endTime)
      ) {
        warningMessage =
          'Time of event date is not enough for all matches, please change time of event date or change match duration of some matches';
      }
    }

    await this.eventDateRepository.save(eventDate);

    const responseObject = new SuccessResponseDto(
      200,
      true,
      1,
      eventDate,
      'Event date updated successfully',
    );
    if (warningMessage) {
      responseObject.additionalData = { warningMessage };
    }

    return responseObject;
  }
  async findAllEventDatesAndCountMatch(tournamentId: number) {
    return this.eventDateRepository.findAllEventDatesAndCountMatch(
      tournamentId,
    );
  }

  private parseStringToTime(
    timeString: string,
    errorMessage: string,
  ): moment.Moment {
    const time = moment(timeString, 'HH:mm', true);
    if (!time.isValid()) {
      throw new BadRequestException(errorMessage);
    }
    return time;
  }
  async findById(id: number): Promise<EventDate> {
    return this.eventDateRepository.findById(id);
  }

  async getSlotsByEventDateId(eventDateId: number): Promise<SlotDTO[]> {
    const slots = await this.slotRepository.find({
      where: { eventDate: { id: eventDateId } },
      relations: ['eventDate', 'match', 'match.teamOne', 'match.teamTwo'],
    });
  
    const slotDTOs = await Promise.all(
      slots.map(async slot => new SlotDTO({
        id: slot.id,
        slotIndex: slot.slotIndex,
        startTime: slot.startTime,
        endTime: slot.endTime,
        eventDateId: slot.eventDate.id,
        matches: slot.match ? await this.matchUtils.convertMatchToMatchDTO(slot.match, slot) : null,
      }))
    );
    return slotDTOs;
  }
}
