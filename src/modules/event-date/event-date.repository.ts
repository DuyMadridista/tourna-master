import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventDate } from './entities/event-date.entity';
import { EventDateAdditionalDto } from './dto/event-date-additional.dto';

@Injectable()
export class EventDateRepository {
  private repository: Repository<EventDate>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(EventDate);
  }

  async findAllByTournamentId(tournamentId: number): Promise<EventDate[]> {
    return this.repository.find({ where: { tournament: { id: tournamentId} } });
  }
  async save(eventDate: EventDate): Promise<EventDate> {
    return this.repository.save(eventDate);
  }

  async saveAll(eventDates: EventDate[]): Promise<void> {
    await this.repository.save(eventDates);
  }

  async findById(id: number): Promise<EventDate> {
    return this.repository.findOne({ where: { id } });
  }
  async findAllDateByTournamentId(tournamentId: number): Promise<Date[]> {
    const eventDates = await this.repository
      .createQueryBuilder('event_date')
      .select('event_date.date', 'date')
      .where('event_date.tournament_id = :tournamentId', { tournamentId })
      .getRawMany();

    return eventDates.map((e) => e.date);
  }

  async deleteAllByTournamentId(tournamentId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(EventDate)
      .where('tournament_id = :tournamentId', { tournamentId })
      .execute();
  }

  async deleteByEventDateId(eventDateId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(EventDate)
      .where('id = :eventDateId', { eventDateId })
      .execute();
  }

  async findAllEventDatesAndCountMatch(
    tournamentId: number,
  ): Promise<EventDateAdditionalDto[]> {
    const results = await this.repository
      .createQueryBuilder('event_date')
      .select('event_date.id', 'id')
      .addSelect('COUNT(match.id)', 'numMatch')
      .leftJoin('event_date.matches', 'match')
      .where('event_date.tournament_id = :tournamentId', { tournamentId })
      .groupBy('event_date.id')
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
