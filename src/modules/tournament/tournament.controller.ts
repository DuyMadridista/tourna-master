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
} from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { LeaderBoardDetailDto } from '../match/dto/LeaderBoardDetailDto';
import { TournamentStatus } from '../../enums/tournament-status.enum';
import { SuccessResponse } from 'src/helper/OkResponse';

@Controller('tournament')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get()
  async findAll(
    @Query('size') pageSize : number = 10,
    @Query('page') page: number = 1,
    @Query('sortValue') sortField: string = 'createdAt',
    @Query('sortType') sortType: 'ASC' | 'DESC' = 'DESC',
    @Query('filterStatus') status?: TournamentStatus,
    @Query('keyword') search: string = '',
    @Query('filterCategory') categoryId?: number,
  ) {
    const data = await this.tournamentService.getAll(
      page - 1,
      pageSize,
      sortField,
      sortType,
      status,
      search.trim(),
      categoryId,
    );
    return SuccessResponse(true, data.length, data, 'Tournaments retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    const data =  await this.tournamentService.getTournamentToShowGeneral(id);
    return SuccessResponse(true, 1, data, 'Tournament retrieved successfully');
  }

  @Post()
  create(@Body() createTournamentDto: CreateTournamentDto) {
    const { title, categoryId, eventDates, description } = createTournamentDto;
    const data = this.tournamentService.createTournament(
      title,
      categoryId,
      eventDates,
      description,
    );
    return SuccessResponse(true, 1, data, 'Tournament created successfully');
  }

  @Put(':id/detail')
  update(
    @Param('id') id: number,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    const data = this.tournamentService.updateTournament(id, updateTournamentDto);
    return SuccessResponse(true, 1, data, 'Tournament updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: number) {
    const data = this.tournamentService.deleteTournament(id);
    return SuccessResponse(true, 1, data, 'Tournament deleted successfully');
  }

  @Get(':tournamentId/leaderboard')
  async getLeaderBoard(@Param('tournamentId') tournamentId: number) {
    const data: LeaderBoardDetailDto = await this.tournamentService.getDetailLeaderBoard(tournamentId);
    return SuccessResponse(true, 1, data, 'Leaderboard retrieved successfully');
  }

  @Put(':tournamentId/discard')
  discardTournament(@Param('tournamentId') tournamentId: number) {
    this.tournamentService.discardTournament(tournamentId);
    return SuccessResponse(true, 1, null, 'Tournament discarded successfully');
  }
}
