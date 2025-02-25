import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { UserService } from '../user/user.service';
import { TeamService } from '../team/team.service';
import { EventDateService } from '../event-date/event-date.service';
// import { CategoryService } from '../category/category.service';
// import { OrganizerTournamentService } from '../organizer-tournament/organizer-tournament.service';
import { MatchService } from '../match/match.service';
import { PlayerService } from '../player/player.service';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
import { TournamentFormat } from 'src/enums/tournament-format.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentGeneralDto } from './dto/TournamentGeneral.dto';
import { LeaderBoardDetailDto } from 'src/modules/match/dto/LeaderBoardDetailDto';
import { SuccessResponseDto } from 'src/helper/successResponse.dto';
import { TournamentRepository } from './tournament.repository';
import e from 'express';
import { EventDate } from '../event-date/entities/event-date.entity';
import { LocalDate, LocalDateTime } from '@js-joda/core';

@Injectable()
export class TournamentService {
  private readonly INSERT_INTO_TOURNAMENT_ORGANIZER_TABLE = 
    'INSERT INTO organizer_tournament(user_id, tournament_id) VALUES (:userId, :tournamentId)';

  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: TournamentRepository,
    private userService: UserService,
    private teamService: TeamService,
    private eventDateService: EventDateService,
    private categoryService: CategoryService,
    private entityManager: EntityManager,
    private organizerTournamentService: OrganizerTournamentService,
    private matchService: MatchService,
    private playerService: PlayerService,
  ) {}

  async getAll(
    page: number,
    pageSize: number,
    field: string,
    sortType: 'ASC' | 'DESC',
    status: TournamentStatus,
    search: string,
    categoryId: number,
  ): Promise<any> {
    search = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
    
    const isAdmin = user.role === UserRole.ADMIN;
    const isOrganizer = user.role === UserRole.ORGANIZER;

    if (isAdmin) {
      return await this.tournamentRepository.findAllByUserId(
        null,
        page,
        pageSize,
        sortType,
        field,
        status, 
        search,
        categoryId
      );
    } else if (isOrganizer) {
      return await this.tournamentRepository.findAllByUserId(
        user.id,
        page,
        pageSize,
        sortType,
        field,
        status,
        search,
        categoryId
      );
    }
    
    return null;
  }

  async deleteTournament(id: number): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findTournamentByIdAndNotDeleted(id);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const organizerTournaments = await this.organizerTournamentService.findAllByTournamentId(id);
    const hasPermission = organizerTournaments.some(ot => ot.userId === user.id) || user.role === UserRole.ADMIN;

    if (!hasPermission) {
      throw new NotFoundException('Tournament not found');
    }

    tournament.isDeleted = true;
    tournament.deletedAt = new Date();
    tournament.status = TournamentStatus.DELETED;

    await Promise.all([
      this.matchService.deleteAllByTournamentId(tournament.id),
      this.playerService.deleteAllPlayerByTournamentId(tournament.id),
      this.teamService.deleteTeamByTournamentId(id),
      this.eventDateService.deleteAllByTournamentId(tournament.id),
      this.organizerTournamentService.deleteAllByTournamentId(tournament.id)
    ]);

    return await this.tournamentRepository.save(tournament);
  }

  async getTournamentToShowGeneral(id: number): Promise<SuccessResponseDto<Tournament>> {
    const response = await this.tournamentRepository.findTournamentToShowGeneral(id);
    response.additionalData = {
      matchOfEventDates: await this.eventDateService.findAllEventDatesAndCountMatch(id),
      tournamentPlan: await this.getPlanByTournamentId(id)
    };
    return response;
  }

  async createTournament(
    title: string,
    categoryId: number,
    eventDates: LocalDate[],  
    desc: string,
  ): Promise<Tournament> {
    if (!eventDates.length) {
      throw new BadRequestException('Event Date must not be null');
    }

    for (const date of eventDates) {
      if (date < LocalDate.now()) {
        throw new BadRequestException('Cannot add a date in the past.');
      }
    }

    const category = await this.categoryService.findCategoryById(categoryId);
    if (!category || category.isDeleted) {
      throw new NotFoundException(`category not found with id: ${categoryId}`);
    }

    const tournament = await this.tournamentRepository.save( new Tournament( {
      title,
      categoryId,
      description: desc,
      format: TournamentFormat.ROUND_ROBIN,
      status: TournamentStatus.NEED_INFORMATION,
      matchDuration: 0,
      timeBetween: null
    }));

    if (eventDates) {
      const events = Array.from(eventDates).map(date => ({
        tournamentId: tournament.id,
        date,
        startTime: null,
        endTime: null
      }));
      await this.eventDateService.saveAll(events);
    }

    await this.entityManager.query(
      this.INSERT_INTO_TOURNAMENT_ORGANIZER_TABLE,
      [user.id, tournament.id]
    );

    return tournament;
  }

  private async editOrganizersInGeneral(
    UpdateTournamentDto: UpdateTournamentDto,
    tournamentId: number
  ): Promise<void> {
    if (UpdateTournamentDto.organizers) {
      await this.organizerTournamentService.deleteAllByTournamentId(tournamentId);
      const organizers = await Promise.all(
        UpdateTournamentDto.organizers.map(async userId => ({
          userId: userId,
          tournamentId
        }))
      );
      await this.organizerTournamentService.saveAll(organizers);
    }
  }

  private async editEventDatesInGeneral(
    UpdateTournamentDto: UpdateTournamentDto,
    tournamentId: number,
    tournament: Tournament
  ): Promise<void> {
    if (!UpdateTournamentDto.eventDates) return;

    const eventDates = await this.eventDateService.findAllByTournamentId(tournamentId);
    const allowedResetAllEventDate = [TournamentStatus.NEED_INFORMATION]; 

    if (allowedResetAllEventDate.includes(tournament.status)) {
      await this.eventDateService.deleteAllByTournamentId(tournamentId);
    } else {
      for (const eventDate of eventDates) {
        const date = eventDate.date;
        if (!UpdateTournamentDto.eventDates.includes(date)) {
          if (date <= LocalDate.now()) {  
            throw new BadRequestException('Cannot delete event date that is today or before');
          }
          if (await this.matchService.isHaveMatchInDate(eventDate.id)) {
            throw new BadRequestException('Cannot delete event date that have match');
          }
          await this.eventDateService.deleteByEventDateId(eventDate.id);
        }
      }
    }

    if (UpdateTournamentDto.eventDates.some(date => date < LocalDate.now())) {
      throw new BadRequestException('Cannot add event date that is before today');
    }

    const newEventDates : EventDate[] = UpdateTournamentDto.eventDates.map(date => ({
      tournamentId,
      date,
      startTime: '00:00:00',
      endTime: '23:59:59'
    }));

    await this.eventDateService.saveAll(newEventDates);
  }

  async updateTournament(
    tournamentId: number,
    UpdateTournamentDto: UpdateTournamentDto
  ): Promise<TournamentGeneralDto> {

    const tournament = await this.tournamentRepository.findTournamentByIdAndNotDeleted(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const notAllowed = [TournamentStatus.DELETED];
    if (notAllowed.includes(tournament.status)) {
      throw new BadRequestException('Cannot update tournament that is deleted');
    }

    const allowedAdvance = [TournamentStatus.NEED_INFORMATION, TournamentStatus.READY, TournamentStatus.IN_PROGRESS];
    if (allowedAdvance.includes(tournament.status)) {
      await this.editEventDatesInGeneral(UpdateTournamentDto, tournamentId, tournament);
      await this.editOrganizersInGeneral(UpdateTournamentDto, tournamentId);
    } else if (UpdateTournamentDto.eventDates || UpdateTournamentDto.organizers) {
      throw new BadRequestException('Cannot update tournament');
    }

    // Update tournament
    if (UpdateTournamentDto.title) tournament.title = UpdateTournamentDto.title;
    if (UpdateTournamentDto.description) tournament.description = UpdateTournamentDto.description;   
    if (UpdateTournamentDto.categoryId) {
      const category = await this.categoryService.findCategoryById(UpdateTournamentDto.categoryId);
      if (!category) throw new NotFoundException('Category not found');
      tournament.categoryId = category.id;
    }

    tournament.updatedAt = LocalDateTime.now();
    await this.tournamentRepository.save(tournament);

    return {
      id: tournament.id,
      title: tournament.title,
      description: tournament.description,
      category: await this.categoryService.findCategoryDtoById(tournament.categoryId),
      status: tournament.status,
      eventDates: await this.eventDateService.findAllByTournamentId(tournamentId),
      organizers: await this.userService.findOrganizerInGeneral(tournamentId)
    };
  }

  async getDetailLeaderBoard(tournamentId: number): Promise<LeaderBoardDetailDto> {
    const tournament = await this.tournamentRepository.findTournamentByIdAndNotDeleted(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const leaderBoard = await this.matchService.getLeaderBoardByTournamentId(tournamentId);
    const matches = await this.matchService.getMatchOfLeaderBoardByTournamentId(tournamentId);

    return {
      leaderBoard,
      matches
    };
  }

  async discardTournament(tournamentId: number): Promise<void> {
    const tournament = await this.tournamentRepository.findTournamentByIdAndNotDeleted(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.status === TournamentStatus.DISCARDED) {
      throw new BadRequestException('Cannot discard tournament');
    }

    tournament.status = TournamentStatus.DISCARDED;
    await this.tournamentRepository.save(tournament);
  }

  async getPlanByTournamentId(tournamentId: number): Promise<any> {
    const plan = await this.tournamentRepository.getPlanByTournamentId(tournamentId);
    if (!plan) {
      throw new NotFoundException('Tournament not found');
    }
    return plan;
  }
}