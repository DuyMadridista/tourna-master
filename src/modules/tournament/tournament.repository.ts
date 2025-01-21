import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
import { TournamentPlanDto } from 'src/modules/tournament/dto/tournament-plan.dto';
import { Not, In } from 'typeorm';
import { TournamentDto } from './dto/tournament.dto';
import { TournamentGeneralDto } from './dto/TournamentGeneral.dto';
import { SuccessResponseDto } from 'src/helper/successResponse.dto';
import { EventDateService } from '../event-date/event-date.service';
import { UserService } from '../user/user.service';

@Injectable()
export class TournamentRepository {
    constructor(
        @InjectRepository(Tournament)
        private eventDateService: EventDateService,
        private userService: UserService,
        private readonly repository: Repository<Tournament>,
    ) {}

    async findTournamentByIdAndNotDeleted(id: number): Promise<Tournament | null> {
        return this.repository.findOne({
            where: {
                id,
                isDeleted: false,
            },
        });
    }

    async findActiveTournamentById(tournamentId: number): Promise<Tournament | null> { 
        return this.repository.findOne({
            where: {
                id: tournamentId,
                isDeleted: false,
                status: Not(In([TournamentStatus.DISCARDED, TournamentStatus.FINISHED])),
            },
        });
    }

    async getPlanByTournamentId(tournamentId: number): Promise<TournamentPlanDto | null> {
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
            .andWhere('tournament.status = :status', { status: TournamentStatus.READY })
            .groupBy('tournament.id')
            .getMany();
    }

    async findTournamentInProgressNeedToChangeToFinished(): Promise<any[]> {
        return this.repository.query(`
            SELECT t.tournament_id, GREATEST(MAX(m.end_time), temp.end_time) AS max_end_time, temp.date
            FROM tournament t
            JOIN (
                SELECT tournament_id, ranked.EventDateId, ranked.date, ranked.end_time
                FROM (
                    SELECT t.tournament_id, ed.id AS EventDateId, ed.date, ed.end_time,
                            ROW_NUMBER() OVER (PARTITION BY t.tournament_id ORDER BY ed.date DESC) AS row_num
                    FROM tournament t
                    JOIN event_date ed ON t.tournament_id = ed.tournament_id
                    WHERE t.status = :status
                ) ranked
                WHERE row_num = 1
            ) AS temp ON temp.tournament_id = t.tournament_id
            LEFT JOIN match m ON m.event_date_id = temp.EventDateId
            WHERE temp.date <= NOW()
            GROUP BY t.tournament_id, temp.end_time, temp.date
        `, [TournamentStatus.IN_PROGRESS]);
    }

    async findTournamentNeedInformationNeedToChangeToFinished(): Promise<any[]> {
        return this.repository.query(`
            select temp.tournament_id, min(temp.date) date, temp.EventDateId firstEventDateId, temp.start_time
            from (
                SELECT tournament_id, ranked.EventDateId, ranked.date, ranked.start_time
                FROM (
                    SELECT t.tournament_id, ed.id AS EventDateId, ed.date, ed.start_time,
                            ROW_NUMBER() OVER (PARTITION BY t.tournament_id ORDER BY ed.date asc) AS row_num
                    FROM tournament t
                    JOIN event_date ed ON t.tournament_id = ed.tournament_id
                    WHERE t.status = :status
                ) ranked
                WHERE row_num = 1) as temp
            left join match m on m.event_date_id = temp.EventDateId
            group by temp.tournament_id, temp.EventDateId, temp.start_time
            having count(m.id) = 0 and (min(temp.date) <= NOW() or (min(temp.date) = NOW() and temp.start_time < LOCALTIME))`
        , [TournamentStatus.NEED_INFORMATION]);
    }

    async findTournamentByCategoryId(categoryId: number): Promise<Tournament[]> {
        return this.repository.find({
            where: {
                categoryId,
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
            'category.id',
            'category.name',
            'tournament.createdAt',
            'tournament.status',
            'tournament.matchDuration',
            'tournament.format',
          ])
          .addSelect(
            (subQuery) =>
              subQuery
                .select('COUNT(DISTINCT ot.tournamentId)', 'total_records')
                .from('organizer_tournament', 'ot')
                .where('tournament.isDeleted != true'),
            'totalRecords',
          )
          .innerJoin('tournament.category', 'category')
          .innerJoin('tournament.organizers', 'organizer')
          .where('tournament.isDeleted = :isDeleted', { isDeleted: false });
    
        if (userId) {
          queryBuilder.andWhere('organizer.userId = :userId', { userId });
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
          queryBuilder.andWhere('category.id = :categoryId', { categoryId });
        }
    
        const [data, total] = await queryBuilder
          .orderBy(`tournament.${field}`, sortType)
          .skip(page * pageSize)
          .take(pageSize)
          .getManyAndCount();
    
        const tournamentDtos = await Promise.all(
          data.map(async (tournament) => {
            const eventDates = await this.eventDateService.findAllByTournamentId(tournament.id);
            const organizers = await this.userService.findUserByTournamentId(tournament.id);
            return new TournamentDto({
              ...tournament,
              eventDates,
              organizers,
            });
          }),
        );
    
        return {
          data: tournamentDtos,
          total,
          success: true,
          additionalData: { totalTournament: total },
        };
      }
    
      async findTournamentToShowGeneral(tournamentId: number): Promise<any> {
        const tournament = await this.repository.findOne({
          where: { id: tournamentId, isDeleted: false },
          relations: ['category'],
        });
    
        if (!tournament) {
          throw new NotFoundException('Tournament not found');
        }
    
        const currentUser = await this.userService.getCurrentUser();
        const isAdmin = currentUser.roles.includes('ADMIN');
        const isOrganizer = await this.userService.isOrganizerOfTournament(currentUser.username, tournamentId);
    
        if (!isAdmin && !isOrganizer) {
          throw new UnauthorizedException("You don't have permission to view this tournament");
        }
    
        const eventDates = await this.eventDateService.findAllByTournamentId(tournamentId);
        const organizers = await this.userService.findOrganizerInGeneral(tournamentId);
    
        const tournamentGeneralDto = new TournamentGeneralDto({
          id: tournament.id,
          title: tournament.title,
          description: tournament.description,
          status: tournament.status,
          organizers,
          eventDates,
        });
    
        return {
          data: tournamentGeneralDto,
          success: true,
          total: 1,
        };
      }
    
    async save(tournament: Tournament): Promise<Tournament> {
        return this.repository.save(tournament);
    }
}