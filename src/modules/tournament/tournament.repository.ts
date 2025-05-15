import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
import { TournamentPlanDto } from 'src/modules/tournament/dto/tournament-plan.dto';
import { Not, In } from 'typeorm';
import { TournamentGeneralDto } from './dto/TournamentGeneral.dto';

@Injectable()
export class TournamentRepository extends Repository<Tournament> {
  constructor(
    @InjectRepository(Tournament)
    private readonly repository: Repository<Tournament>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async findTournamentByIdAndNotDeleted(
    id: number,
  ): Promise<Tournament | null> {
    return this.repository.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });
  }

  async findActiveTournamentById(
    tournamentId: number,
  ): Promise<Tournament | null> {
    return this.repository.findOne({
      where: {
        id: tournamentId,
        isDeleted: false,
        status: Not(
          In([TournamentStatus.DISCARDED, TournamentStatus.FINISHED]),
        ),
      },
    });
  }

  async getPlanByTournamentId(
    tournamentId: number,
  ): Promise<TournamentPlanDto | null> {
    const result = await this.repository
      .createQueryBuilder('tournament')
      .select([
        'tournament.startTimeDefault',
        'tournament.endTimeDefault',
        'tournament.timeBetween',
        'tournament.matchDuration',
      ])
      .where('tournament.id = :tournamentId', { tournamentId })
      .andWhere('tournament.isDeleted = :isDeleted', { isDeleted: false })
      .getOne();

    return result ? new TournamentPlanDto(result) : null;
  }

  async findTournamentReadyNeedToChangeToInProgress(): Promise<Tournament[]> {
    return this.repository
      .createQueryBuilder('tournament')
      .innerJoin('tournament.eventDates', 'eventDate')
      .where('eventDate.date <= NOW()')
      .andWhere('tournament.status = :status', {
        status: TournamentStatus.READY,
      })
      .groupBy('tournament.id')
      .getMany();
  }

  async findTournamentInProgressNeedToChangeToFinished(): Promise<any[]> {
    return this.repository
      .createQueryBuilder('tournaments')
      .select('tournaments.tournament_id')
      .addSelect('tournaments.status')
      .addSelect('GREATEST(MAX(m.end_time), temp.end_time)', 'max_end_time')
      .addSelect('temp.date')
      .innerJoin(
        (qb) => {
          return qb
            .select('ranked.tournament_id', 'tournament_id')
            .addSelect('ranked.EventDateId', 'EventDateId')
            .addSelect('ranked.date', 'date')
            .addSelect('ranked.end_time', 'end_time')
            .from((subQb) => {
              return subQb
                .select('t.tournament_id', 'tournament_id')
                .addSelect('ed.id', 'EventDateId')
                .addSelect('ed.date', 'date')
                .addSelect('ed.end_time', 'end_time')
                .addSelect(
                  'ROW_NUMBER() OVER (PARTITION BY t.tournament_id ORDER BY ed.date DESC)',
                  'row_num',
                )
                .from('tournaments', 't')
                .innerJoin(
                  'event_dates',
                  'ed',
                  't.tournament_id = ed.tournamentId',
                )
                .where('t.status = :status', {
                  status: TournamentStatus.IN_PROGRESS,
                });
            }, 'ranked')
            .where('ranked.row_num = 1');
        },
        'temp',
        'temp.tournament_id = tournaments.tournament_id',
      )
      .leftJoin('matches', 'm', 'm.event_date_id = temp.EventDateId')
      .where('temp.date <= NOW()')
      .groupBy('tournaments.tournament_id, temp.end_time, temp.date')
      .getRawMany();
  }

  async findTournamentNeedInformationNeedToChangeToFinished(): Promise<any[]> {
    const subQuery = this.repository
      .createQueryBuilder('t')
      .select('t.tournament_id', 'tournament_id')
      .addSelect('ed.id', 'EventDateId')
      .addSelect('ed.date', 'date')
      .addSelect('ed.start_time', 'start_time')
      .addSelect(
        'ROW_NUMBER() OVER (PARTITION BY t.tournament_id ORDER BY ed.date ASC)',
        'row_num',
      )
      .innerJoin('event_dates', 'ed', 't.tournament_id = ed.tournamentId')
      .where('t.status = :status', {
        status: TournamentStatus.NEED_INFORMATION,
      });

    const innerTempQuery = this.repository
      .createQueryBuilder()
      .select('sub.tournament_id', 'tournament_id')
      .addSelect('sub.EventDateId', 'EventDateId')
      .addSelect('sub.date', 'date')
      .addSelect('sub.start_time', 'start_time')
      .from(`(${subQuery.getQuery()})`, 'sub')
      .where('sub.row_num = 1');

    return this.repository
      .createQueryBuilder()
      .select('temp.tournament_id', 'tournament_id')
      .addSelect('MIN(temp.date)', 'date')
      .addSelect('temp.EventDateId', 'firstEventDateId')
      .addSelect('temp.start_time', 'start_time')
      .from(`(${innerTempQuery.getQuery()})`, 'temp')
      .leftJoin('matches', 'm', 'm.event_date_id = temp.EventDateId')
      .groupBy('temp.tournament_id, temp.EventDateId, temp.start_time')
      .having(
        'COUNT(m.id) = 0 AND (MIN(temp.date) <= NOW() OR (MIN(temp.date) = NOW() AND temp.start_time < LOCALTIME))',
      )
      .setParameters({ status: TournamentStatus.NEED_INFORMATION })
      .getRawMany();
  }

  async findTournamentByCategoryId(categoryId: number): Promise<Tournament[]> {
    return this.repository.find({
      where: {
        category: { categoryId: categoryId },
      },
    });
  }

  async findTournamentByIdAndIsDeletedFalse(
    id: number,
  ): Promise<Tournament | null> {
    return this.repository.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });
  }
  async findAllByUserId(
    userId: number,
    page: number,
    pageSize: number,
    sortType: 'ASC' | 'DESC',
    field: string,
    status: TournamentStatus,
    search: string,
    categoryId: number,
  ): Promise<any> {
    const queryBuilder = this.repository
      .createQueryBuilder('tournament')
      .select([
        'tournament.id',
        'tournament.title',
        'category.categoryId',
        'category.categoryName',
        'tournament.createdAt',
        'tournament.status',
        'tournament.matchDuration',
        'tournament.format',
      ])
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(DISTINCT ot.tournament_id)', 'total_records')
            .from('organizer_tournaments', 'ot')
            .where('tournament.isDeleted != true'),
        'totalRecords',
      )
      .innerJoin('tournament.category', 'category')
      .innerJoin('tournament.organizers', 'organizer')
      .where('tournament.isDeleted = :isDeleted', { isDeleted: false });

    if (userId) {
      queryBuilder.andWhere('organizer.id = :userId', { userId });
    }

    if (status) {
      queryBuilder.andWhere('tournament.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere('LOWER(tournament.title) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    if (categoryId) {
      queryBuilder.andWhere('category.categoryId = :categoryId', {
        categoryId,
      });
    }
    const fieldMapping: Record<string, string> = {
      category: 'category.categoryName',
      title: 'tournament.title',
      createdAt: 'tournament.createdAt',
      status: 'tournament.status',
      matchDuration: 'tournament.matchDuration',
      format: 'tournament.format',
    };

    const orderByField = fieldMapping[field] || 'tournament.createdAt';

    return await queryBuilder
      .orderBy(orderByField, sortType)
      .skip(page * pageSize)
      .take(pageSize)
      .getManyAndCount();
  }

  async findTournamentToShowGeneral(tournamentId: number): Promise<any> {
    const tournament = await this.repository.findOne({
      where: { id: tournamentId, isDeleted: false },
      relations: ['category'],
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    const tournamentGeneralDto = new TournamentGeneralDto({
      id: tournament.id,
      title: tournament.title,
      description: tournament.description,
      category: {
        id: tournament.category.categoryId,
        categoryName: tournament.category.categoryName,
      },
      status: tournament.status,
      organizers: null,
      eventDates: null,
      format: tournament.format,
      numberOfPlayers: tournament.numberOfPlayers,
      numberOfGroups: tournament.numberOfGroups,
      teamsPerGroup: tournament.teamsPerGroup,
      advancePerGroup: tournament.advancePerGroup,
      place: tournament.place,
    });

    return {
      data: tournamentGeneralDto,
      success: true,
      total: 1,
    };
  }
}
