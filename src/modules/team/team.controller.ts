import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { SuccessResponse } from 'src/helper/OkResponse';
import { SuccessResponseDto } from 'src/helper/successResponse.dto';
import { Team } from './entities/team.entity';
import { TeamPlayerDto } from './dto/team-player.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import * as xlsx from 'xlsx';

@Controller('tournament/:tournamentId/team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('')
  @HttpCode(HttpStatus.OK)
  async findAllTeamAndPlayer(
    @Param('tournamentId') tournamentId: number,
    @Query('size') size: number = 10,
    @Query('page') page: number = 1,
  ): Promise<SuccessResponseDto<TeamPlayerDto[]>> {
    const totalTeamRecords =
      await this.teamService.getTotalRecordsForTournament(tournamentId);
    const teamAndPlayer = await this.teamService.getAllTeamAndPlayerCount(
      tournamentId,
      page - 1,
      size,
    );

    return SuccessResponse(
      true,
      teamAndPlayer.length,
      teamAndPlayer,
      'Teams and players retrieved successfully',
      {
        totalTeamOfTournament: totalTeamRecords,
      },
    );
  }

  @Get('/all')
  @HttpCode(HttpStatus.OK)
  async getAllTeam(
    @Param('tournamentId') tournamentId: number,
  ): Promise<SuccessResponseDto<Team[]>> {
    const allTeams =
      await this.teamService.getAllTeamByTournamentId(tournamentId);

    return SuccessResponse(
      true,
      allTeams.length,
      allTeams,
      'All teams retrieved successfully',
    );
  }

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createTeam(
    @Body() teamDto: Team,
    @Param('tournamentId') tournamentId: number,
  ): Promise<SuccessResponseDto<Team>> {
    const newTeam = await this.teamService.createTeam(
      teamDto.teamName.trim(),
      tournamentId,
    );

    return SuccessResponse(true, 1, newTeam, 'Team created successfully');
  }

  @Put('/:id')
  @HttpCode(HttpStatus.OK)
  async updateTeam(
    @Param('tournamentId') tournamentId: number,
    @Param('id') id: number,
    @Body() teamDto: Team,
  ): Promise<SuccessResponseDto<Team>> {
    const updatedTeam = await this.teamService.updateTeam(
      tournamentId,
      id,
      teamDto.teamName.trim(),
    );

    return SuccessResponse(true, 1, updatedTeam, 'Team updated successfully');
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTeam(
    @Param('tournamentId') tournamentId: number,
    @Param('id') id: number,
  ): Promise<SuccessResponseDto<Team>> {
    const deletedTeam = await this.teamService.deleteTeam(tournamentId, id);

    return SuccessResponse(true, 1, deletedTeam, 'Team deleted successfully');
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async findTeamById(
    @Param('tournamentId') tournamentId: number,
    @Param('id') id: number,
  ): Promise<SuccessResponseDto<Team>> {
    const team = await this.teamService.findTeamById(tournamentId, id);

    return SuccessResponse(true, 1, team, 'Team retrieved successfully');
  }

  @Post('/import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async importTeams(
    @UploadedFile() file: Express.Multer.File & { buffer: Buffer },
    @Param('tournamentId') tournamentId: number,
  ): Promise<SuccessResponseDto<Team[]>> {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const importedTeams = await this.teamService.importTeams(
      data,
      tournamentId,
    );

    return SuccessResponse(
      true,
      importedTeams.length,
      importedTeams,
      'Teams imported successfully',
    );
  }
}
