/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { UserService } from '../user/user.service';
import { TeamService } from '../team/team.service';
import { EventDateService } from '../event-date/event-date.service';
import { CategoryService } from '../category/category.service';
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
import { EventDate } from '../event-date/entities/event-date.entity';
import { LocalDate, LocalTime } from '@js-joda/core';
import { CurrentUserProvider } from 'src/helper/current-user.provider';
import { TournamentDto } from './dto/tournament.dto';
import { Team } from '../team/entities/team.entity';
// import { OrganizerTournamentService } from '../organizer-tournament/organizer-tournament.service';

@Injectable()
export class TournamentService {
  private readonly INSERT_INTO_TOURNAMENT_ORGANIZER_TABLE =
    'INSERT INTO organizer_tournaments(user_id, tournament_id) VALUES (?, ?)';

  constructor(
    private tournamentRepository: TournamentRepository,
    private userService: UserService,
    @Inject(forwardRef(() => TeamService))
    private teamService: TeamService,
    private eventDateService: EventDateService,
    @Inject(forwardRef(() => CategoryService))
    private categoryService: CategoryService,
    private entityManager: EntityManager,
    // private organizerTournamentService: OrganizerTournamentService,
    @Inject(forwardRef(() => MatchService))
    private matchService: MatchService,
    @Inject(forwardRef(() => PlayerService))
    private playerService: PlayerService,
    private readonly currentUserProvider: CurrentUserProvider,
  ) {}

  // tournament.service.ts
  public async getAll(
    page: number,
    pageSize: number,
    field: string,
    sortType: 'ASC' | 'DESC',
    status: TournamentStatus,
    search: string,
    categoryId: number,
  ): Promise<any> {
    search = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const user = this.currentUserProvider.getUser();
    const isAdmin = user.role === UserRole.ADMIN;
    const isOrganizer = user.role === UserRole.ORGANIZER;

    let tournaments: Tournament[] = [];
    let total = 0;

    if (isAdmin || isOrganizer) {
      const [data, count] = await this.tournamentRepository.findAllByUserId(
        isAdmin ? null : user.id,
        page,
        pageSize,
        sortType,
        field,
        status,
        search,
        categoryId,
      );
      tournaments = data;
      total = count;
    }

    const tournamentDtos = await Promise.all(
      tournaments.map(async (tournament) => {
        const eventDates = await this.eventDateService.findAllByTournamentId(
          tournament.id,
        );
        const organizers = await this.userService.findUserByTournamentId(
          tournament.id,
        );
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

  public async deleteTournament(id: number): Promise<Tournament> {
    // const user = this.currentUserProvider.getUser();
    const tournament =
      await this.tournamentRepository.findTournamentByIdAndNotDeleted(id);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    tournament.isDeleted = true;
    tournament.deletedAt = new Date();
    tournament.status = TournamentStatus.DELETED;

    await Promise.all([
      this.matchService.deleteAllMatchByTournamentId(tournament.id),
      this.playerService.deleteAllPlayerByTournamentId(tournament.id),
      this.teamService.deleteTeamByTournamentId(id),
      this.eventDateService.deleteAllByTournamentId(tournament.id),
    ]);

    return await this.tournamentRepository.save(tournament);
  }

  public async getTournamentToShowGeneral(
    id: number,
  ): Promise<SuccessResponseDto<Tournament>> {
    const response =
      await this.tournamentRepository.findTournamentToShowGeneral(id);
    const eventDates = await this.eventDateService.findAllByTournamentId(id);
    const organizers = await this.userService.findOrganizerInGeneral(id);
    response.data.eventDates = eventDates;
    response.data.organizers = organizers;
    response.additionalData = {
      matchOfEventDates:
        await this.eventDateService.findAllEventDatesAndCountMatch(id),
      tournamentPlan: await this.getPlanByTournamentId(id),
    };
    return response;
  }

  public async createTournament(
    title: string,
    categoryId: number,
    eventDates: LocalDate[],
    desc: string,
    format: TournamentFormat,
    numberOfPlayers: number,
    numberOfGroups: number,
    teamsPerGroup: number,
    advancePerGroup: number,
    place: string,
  ): Promise<Tournament> {
    if (!eventDates.length) {
      throw new BadRequestException('Event Date must not be null');
    }
    const user = this.currentUserProvider.getUser();
    for (const rawDate of eventDates) {
      const date = LocalDate.parse(rawDate.toString());
      if (date.isBefore(LocalDate.now())) {
        throw new BadRequestException('Cannot add a date in the past.');
      }
    }

    const category = await this.categoryService.findCategoryById(categoryId);
    if (!category || category.isDeleted) {
      throw new NotFoundException(`category not found with id: ${categoryId}`);
    }

    const tournament = await this.tournamentRepository.save({
      title,
      category,
      description: desc,
      format: format,
      numberOfPlayers: numberOfPlayers,
      numberOfGroups: numberOfGroups,
      teamsPerGroup: teamsPerGroup,
      advancePerGroup: advancePerGroup,
      place: place,
      status: TournamentStatus.NEED_INFORMATION,
      matchDuration: 0,
      timeBetween: null,
    });

    if (eventDates) {
      const events = Array.from(eventDates).map((date) => {
        const event = new EventDate();
        event.tournament = tournament;
        event.date = date;
        event.startTime = LocalTime.of(0, 0, 0);
        event.endTime = LocalTime.of(23, 59, 59);
        return event;
      });
      console.log('typeof saveAll:', typeof this.eventDateService.saveAll);
      await this.eventDateService.saveAll(events);
    }

    await this.entityManager.query(
      this.INSERT_INTO_TOURNAMENT_ORGANIZER_TABLE,
      [user.id, tournament.id],
    );

    return tournament;
  }

  public async editOrganizersInGeneral(
    UpdateTournamentDto: UpdateTournamentDto,
    tournamentId: number,
  ): Promise<void> {
    // if (UpdateTournamentDto.organizers) {
    //   await this.organizerTournamentService.deleteAllByTournamentId(tournamentId);
    //   const organizers = await Promise.all(
    //     UpdateTournamentDto.organizers.map( async userId => ({
    //       userId: userId,
    //       tournamentId
    //     }))
    //   );
    //   await this.organizerTournamentService.saveAll(organizers);
    //   }
  }

  public async editEventDatesInGeneral(
    UpdateTournamentDto: UpdateTournamentDto,
    tournamentId: number,
    tournament: Tournament,
  ): Promise<void> {
    if (!UpdateTournamentDto.eventDates) return;

    const eventDates =
      await this.eventDateService.findAllByTournamentId(tournamentId);
    const allowedResetAllEventDate = [TournamentStatus.NEED_INFORMATION];

    if (allowedResetAllEventDate.includes(tournament.status)) {
      await this.eventDateService.deleteAllByTournamentId(tournamentId);
    } else {
      for (const eventDate of eventDates) {
        const date = LocalDate.parse(eventDate.date.toString());
        const today = LocalDate.now();
        if (!UpdateTournamentDto.eventDates.includes(date)) {
          if (date.isBefore(today)) {
            throw new BadRequestException(
              'Cannot delete event date that is today or before',
            );
          }
          // if (await this.matchService.isHaveMatchInDate(eventDate.id)) {
          //   throw new BadRequestException(
          //     'Cannot delete event date that have match',
          //   );
          // }
          await this.eventDateService.deleteByEventDateId(eventDate.id);
        }
      }
    }

    if (
      UpdateTournamentDto.eventDates.some((date) =>
        LocalDate.parse(date.toString()).isBefore(LocalDate.now()),
      )
    ) {
      throw new BadRequestException(
        'Cannot add event date that is before today',
      );
    }
    const newEventDates: EventDate[] = UpdateTournamentDto.eventDates.map(
      (date) => {
        const event = new EventDate();
        event.tournament = tournament;
        event.date = date;
        event.startTime = LocalTime.of(0, 0, 0);
        event.endTime = LocalTime.of(23, 59, 59);
        return event;
      },
    );

    await this.eventDateService.saveAll(newEventDates);
  }

  public async updateTournament(
    tournamentId: number,
    UpdateTournamentDto: UpdateTournamentDto,
  ): Promise<TournamentGeneralDto> {
    const tournament =
      await this.tournamentRepository.findTournamentByIdAndNotDeleted(
        tournamentId,
      );
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const notAllowed = [TournamentStatus.DELETED];
    if (notAllowed.includes(tournament.status)) {
      throw new BadRequestException('Cannot update tournament that is deleted');
    }

    const allowedAdvance = [
      TournamentStatus.NEED_INFORMATION,
      TournamentStatus.READY,
      TournamentStatus.IN_PROGRESS,
    ];
    if (allowedAdvance.includes(tournament.status)) {
      await this.editEventDatesInGeneral(
        UpdateTournamentDto,
        tournamentId,
        tournament,
      );
      await this.editOrganizersInGeneral(UpdateTournamentDto, tournamentId);
    } else if (
      UpdateTournamentDto.eventDates ||
      UpdateTournamentDto.organizers
    ) {
      throw new BadRequestException('Cannot update tournament');
    }

    // Update tournament
    if (UpdateTournamentDto.title) tournament.title = UpdateTournamentDto.title;
    if (UpdateTournamentDto.description)
      tournament.description = UpdateTournamentDto.description;
    if (UpdateTournamentDto.categoryId) {
      const category = await this.categoryService.findCategoryById(
        UpdateTournamentDto.categoryId,
      );
      if (!category) throw new NotFoundException('Category not found');
      tournament.category = category;
    }

    // tournament.updatedAt = LocalDateTime.now();
    await this.tournamentRepository.save(tournament);

    return {
      id: tournament.id,
      title: tournament.title,
      description: tournament.description,
      category: await this.categoryService.findCategoryDtoById(
        tournament.category?.categoryId,
      ),
      status: tournament.status,
      format: tournament.format,
      numberOfPlayers: tournament.numberOfPlayers,
      numberOfGroups: tournament.numberOfGroups,
      teamsPerGroup: tournament.teamsPerGroup,
      advancePerGroup: tournament.advancePerGroup,
      place: tournament.place,
      eventDates:
        await this.eventDateService.findAllByTournamentId(tournamentId),
      organizers: await this.userService.findOrganizerInGeneral(tournamentId),
    };
  }

  public async getDetailLeaderBoard(
    tournamentId: number,
  ): Promise<LeaderBoardDetailDto> {
    const tournament =
      await this.tournamentRepository.findTournamentByIdAndNotDeleted(
        tournamentId,
      );
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const leaderBoard =
      await this.matchService.getLeaderBoardByTournamentId(tournamentId);
    const matches =
      await this.matchService.getMatchOfLeaderBoardByTournamentId(tournamentId);

    return {
      leaderBoard,
      matches,
    };
  }

  public async discardTournament(tournamentId: number): Promise<void> {
    const tournament =
      await this.tournamentRepository.findTournamentByIdAndNotDeleted(
        tournamentId,
      );
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.status === TournamentStatus.DISCARDED) {
      throw new BadRequestException('Cannot discard tournament');
    }

    tournament.status = TournamentStatus.DISCARDED;
    await this.tournamentRepository.save(tournament);
  }

  public async getPlanByTournamentId(tournamentId: number): Promise<any> {
    const plan =
      await this.tournamentRepository.getPlanByTournamentId(tournamentId);
    if (!plan) {
      throw new NotFoundException('Tournament not found');
    }
    return plan;
  }
  public async findTournamentByCategoryId(
    categoryId: number,
  ): Promise<Tournament[]> {
    return this.tournamentRepository.findTournamentByCategoryId(categoryId);
  }
  public async findTournamentById(tournamentId: number): Promise<Tournament> {
    return this.tournamentRepository.findActiveTournamentById(tournamentId);
  }
  public async save(tournament: Tournament): Promise<Tournament> {
    return this.tournamentRepository.save(tournament);
  }
  public async generateGroup(tournamentId: number): Promise<any> {
    const tournament = await this.tournamentRepository.findTournamentByIdAndNotDeleted(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
  
    const teams = await this.teamService.getAllTeamByTournamentId(tournamentId);
    if (!teams || teams.length === 0) {
      throw new BadRequestException('No teams found for this tournament');
    }
  
    const numberOfGroups = tournament.numberOfGroups;
    const teamsPerGroup = tournament.teamsPerGroup;
  
    if (!numberOfGroups || !teamsPerGroup) {
      throw new BadRequestException('Group configuration is missing');
    }
  
    if (teams.length !== numberOfGroups * teamsPerGroup) {
      throw new BadRequestException(`Number of teams (${teams.length}) does not match numberOfGroups x teamsPerGroup`);
    }

    const sortedTeams = [...teams].sort((a, b) => a.tier - b.tier);
  
    const groupNames = Array.from({ length: numberOfGroups }, (_, i) => String.fromCharCode(65 + i));
  
    const groupedTeams: Record<string, Team[]> = {};
    groupNames.forEach((group) => (groupedTeams[group] = []));
  
    let index = 0;
    let forward = true;
    while (index < sortedTeams.length) {
      for (let i = 0; i < numberOfGroups && index < sortedTeams.length; i++) {
        const groupIndex = forward ? i : numberOfGroups - 1 - i;
        const groupName = groupNames[groupIndex];
        const team = sortedTeams[index++];
        team.group = groupName;
        groupedTeams[groupName].push(team);
      }
      forward = !forward;
    }
  
    await this.teamService.saveAll(sortedTeams);
  
    return {
      success: true,
      groupedTeams,
    };
  }
  
}
