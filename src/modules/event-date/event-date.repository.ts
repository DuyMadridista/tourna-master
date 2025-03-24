import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventDate } from './entities/event-date.entity';
import { EventDateAdditionalDto } from './dto/event-date-additional.dto';

@Injectable()
export class EventDateRepository extends Repository<EventDate> {
  constructor(private dataSource: DataSource) {
    super(EventDate, dataSource.createEntityManager());
  }

  async findAllByTournamentId(tournamentId: number): Promise<EventDate[]> {
    return this.find({ where: { tournament: { id: tournamentId } } });
  }

  async saveAll(eventDates: EventDate[]): Promise<void> {
    await this.save(eventDates);
    console.log('Event dates saved successfully');
  }

  async findById(id: number): Promise<EventDate> {
    return this.findOne({ where: { id } });
  }
  async findAllDateByTournamentId(tournamentId: number): Promise<Date[]> {
    const eventDates = await this.createQueryBuilder('event_dates')
      .select('event_dates.date', 'date')
      .where('event_dates.tournamentId = :tournamentId', { tournamentId })
      .getRawMany();

    return eventDates.map((e) => e.date);
  }

  async deleteAllByTournamentId(tournamentId: number): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from(EventDate)
      .where('tournamentId = :tournamentId', { tournamentId })
      .execute();
  }

  async deleteByEventDateId(eventDateId: number): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from(EventDate)
      .where('id = :eventDateId', { eventDateId })
      .execute();
  }

  async findAllEventDatesAndCountMatch(
    tournamentId: number,
  ): Promise<EventDateAdditionalDto[]> {
    const results = await this.createQueryBuilder('event_dates')
      .select('event_dates.id', 'id')
      .addSelect('COUNT(match.id)', 'numMatch')
      .leftJoin('event_dates.matches', 'match')
      .where('event_dates.tournamentId = :tournamentId', { tournamentId })
      .groupBy('event_dates.id')
      .getRawMany();

    return results.map(
      (result) =>
        new EventDateAdditionalDto(
          parseInt(result.id, 10),
          parseInt(result.numMatch, 10),
        ),
    );
  }
}
