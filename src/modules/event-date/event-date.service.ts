import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventDate } from './entities/event-date.entity';
import { EventDateRepository } from './event-date.repository';
import { MatchRepository } from '../match/match.repository';
import { SuccessResponseDto } from 'src/helper/successResponse.dto';
import * as moment from 'moment';
import { TournamentRepository } from '../tournament/tournament.repository';

@Injectable()
export class EventDateService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventDateRepository: EventDateRepository,
    private readonly matchRepository: MatchRepository,
    private readonly tournamentRepository: TournamentRepository,
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
    const eventDate = await this.eventDateRepository.findById(eventDateId);
    if (!eventDate) {
      throw new NotFoundException(`EventDate with id ${eventDateId} does not exist`);
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
      throw new NotFoundException(`EventDate with id ${eventDateId} does not exist`);
    }

    const tournament = await this.tournamentRepository.findTournamentByIdAndIsDeletedFalse(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (['FINISHED', 'DISCARDED'].includes(tournament.status)) {
      throw new BadRequestException('This tournament is finished or discarded');
    }

    const startTimeValid = this.parseStringToTime(startTime, 'Start time must be valid');
    const endTimeValid = this.parseStringToTime(endTime, 'End time must be valid');

    if (startTimeValid.isAfter(endTimeValid)) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (startTimeValid.isSame(endTimeValid)) {
      throw new BadRequestException('Start time and end time are the same');
    }

    if (
      eventDate.date.toLocaleTimeString() === moment().format('YYYY-MM-DD') &&
      startTimeValid.isBefore(moment()) &&
      !startTimeValid.isSame(eventDate.startTime)
    ) {
      throw new BadRequestException('Start time must be after current time');
    }

    const matches = await this.matchRepository.getAllByEventDateIdOrOrderByStartTime(eventDateId, startTime);

    const startTimeChange = moment.duration(startTimeValid.diff(moment(eventDate.startTime, 'HH:mm'))).asMinutes();
    eventDate.startTime = startTimeValid.format('HH:mm');;
    eventDate.endTime = endTimeValid.format('HH:mm');;
    eventDate.updatedAt = new Date();

    for (const match of matches) {
      if (
        (moment(match.endTime).add(startTimeChange, 'minutes').isBefore(match.endTime) ||
          moment(match.startTime).add(startTimeChange, 'minutes').isBefore(match.startTime)) &&
        startTimeChange > 0
      ) {
        throw new BadRequestException('Match time is out of range');
      }

      match.startTime = moment(match.startTime).add(startTimeChange, 'minutes').toString();
      match.endTime = moment(match.endTime).add(startTimeChange, 'minutes').toString();

      if (match.startTime > eventDate.endTime || match.endTime > eventDate.endTime) {
        warningMessage = 'Time of event date is not enough for all matches, please change time of event date or change match duration of some matches';
      }
    }

    await this.eventDateRepository.save(eventDate);

    const responseObject = new SuccessResponseDto(200, true, 0, eventDate, 'Event date updated successfully');
    if (warningMessage) {
      responseObject.additionalData = { warningMessage };
    }

    return responseObject;
  }

  async findAllEventDatesAndCountMatch(tournamentId: number) {
    return this.eventDateRepository.findAllEventDatesAndCountMatch(tournamentId);
  }

  private parseStringToTime(timeString: string, errorMessage: string): moment.Moment {
    const time = moment(timeString, 'HH:mm', true);
    if (!time.isValid()) {
      throw new BadRequestException(errorMessage);
    }
    return time;
  }
  async findById(id: number): Promise<EventDate> {
    return this.eventDateRepository.findById(id);
  }
}
