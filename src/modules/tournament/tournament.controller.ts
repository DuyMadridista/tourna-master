import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { LeaderBoardDetailDto } from '../match/dto/LeaderBoardDetailDto';
import { TournamentStatus } from '../../enums/tournament-status.enum';
import { SuccessResponse } from 'src/helper/OkResponse';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tournament')
@UseGuards(JwtAuthGuard)
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get()
  async findAll(
    @Query('size') pageSize: number = 10,
    @Query('page') page: number = 1,
    @Query('sortValue') sortField: string = 'createdAt',
    @Query('sortType') sortType: 'ASC' | 'DESC' = 'DESC',
    @Query('filterStatus') status?: TournamentStatus,
    @Query('keyword') search: string = '',
    @Query('filterCategory') categoryId?: number,
  ) {
    return await this.tournamentService.getAll(
      page - 1,
      pageSize,
      sortField,
      sortType,
      status,
      search.trim(),
      categoryId,
    );
    //return SuccessResponse(true, data.length, data, 'Tournaments retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    const res= await this.tournamentService.getTournamentToShowGeneral(id);
    const progress= await this.tournamentService.getProgressTournament(id);
    res.additionalData.progress=progress;
    return res;
  }

  @Get('overview/:id')
  async getTournamentOverview(
    @Param('id') id: number
  ) {
    const res = await this.tournamentService.getTournamentToShowGeneral(id);
    const progress= await this.tournamentService.getProgressTournament(id);
    const upcomingMatch= await this.tournamentService.getUpcomingMatch(id);
    res.additionalData.progress=progress;
    res.additionalData.upcomingMatch=upcomingMatch.slice(0, 3);
    return res;
  }
  @Post()
  async create(@Body() createTournamentDto: CreateTournamentDto) {
    const { title, categoryId, eventDates, description, format,numberOfPlayers, numberOfGroups, teamsPerGroup, advancePerGroup, place, numberOfFields } = createTournamentDto;
    const data = await this.tournamentService.createTournament(
      title,  
      categoryId,
      eventDates,
      description,
      format,
      numberOfPlayers,
      numberOfGroups,
      teamsPerGroup,
      advancePerGroup,
      place,
      numberOfFields
    );
    return SuccessResponse(true, 1, data, 'Tournament created successfully');
  }

  @Put(':id/detail')
  async update(
    @Param('id') id: number,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    const data = await this.tournamentService.updateTournament(
      id,
      updateTournamentDto,
    );
    return SuccessResponse(true, 1, data, 'Tournament updated successfully');
  }

  @Post(':id/generate-groups')
  async generateGroup(@Param('id') id: number) {
    const data = await this.tournamentService.generateGroup(id);
    return SuccessResponse(true, 1, data, 'Tournament generated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: number) {
    const data = await this.tournamentService.deleteTournament(id);
    return SuccessResponse(true, 1, data, 'Tournament deleted successfully');
  }

  @Get(':tournamentId/leaderboard')
  async getLeaderBoard(@Param('tournamentId') tournamentId: number) {
    const data: LeaderBoardDetailDto =
      await this.tournamentService.getDetailLeaderBoard(tournamentId);
    return SuccessResponse(true, 1, data, 'Leaderboard retrieved successfully');
  }

  @Put(':tournamentId/discard')
  async discardTournament(@Param('tournamentId') tournamentId: number) {
    await this.tournamentService.discardTournament(tournamentId);
    return SuccessResponse(true, 1, null, 'Tournament discarded successfully');
  }
}
