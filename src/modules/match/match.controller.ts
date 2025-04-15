import { Controller, Get, Put, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MatchService } from './match.service';
import { RequestDragDropMatch } from './dto/RequestDragDropMatch';
import { SuccessResponse } from 'src/helper/OkResponse';
import * as matchEntity from './entities/match.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { parseMatchReportExcel } from 'src/helper/excel.helper';
import { PlayerMatchService } from '../player-match/player-match.service';

@Controller('tournament/:tournamentId/match')
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly playerMatchService: PlayerMatchService
  ) {}

  @Get('result')
  async getAllMatchResult(@Param('tournamentId') tournamentId: number) {
    const result = await this.matchService.getAllResult(tournamentId);
    return SuccessResponse(true, result.length, result);
  }

  @Get('result/:matchID')
  async getMatchResult(@Param('tournamentId') tournamentId: number, @Param('matchID') matchID: number) {
    const result = await this.matchService.getMatchResult(tournamentId, matchID);
    return SuccessResponse(true, result.length, result);
  }

  @Put('result/:matchID')
  async updateMatchResult(
    @Param('tournamentId') tournamentId: number,
    @Param('matchID') matchID: number,
    @Body() match: matchEntity.Match,
  ) {
    const updateMatch = await this.matchService.updateMatchResult(
      tournamentId,
      matchID,
      match.teamOneResult,
      match.teamTwoResult,
    );
    return SuccessResponse(true, 1, updateMatch);
  }
  @Put('updateResult/:matchID')
  @UseInterceptors(FileInterceptor('file'))
  async updateDetailsMatchResult(
    @Param('tournamentId') tournamentId: number,
    @Param('matchID') matchID: number,
    @UploadedFile() file: Express.Multer.File & { buffer: Buffer },
  ) {
    const report = parseMatchReportExcel(file.buffer);
    const updateMatch = await this.matchService.updateMatchResult(
      tournamentId,
      matchID,
      parseInt(report.matchInfo.teamOneResult),
      parseInt(report.matchInfo.teamTwoResult),
    );
    const updatePlayerMatch= await this.playerMatchService.savePlayerMatch(
      updateMatch.matchId,
      updateMatch.teamOneId,
      updateMatch.teamTwoId,
      report.team1Players,
      report.team2Players,
    );

    return SuccessResponse(true, 1, null, 'Match report imported successfully');
  }

  @Put('dragAndDrop')
  async dragAndDropMatchOrEvent(@Body() request: RequestDragDropMatch) {
    const data = await this.matchService.dragAndDropMatch(
      request.matchId,
      request.newEventDateId,
      request.newIndexOfMatch,
    );
    return SuccessResponse(true, data.length, data);
  }

  @Put(':matchID')
  async updateMatchDetails(
    @Param('tournamentId') tournamentId: number,
    @Param('matchID') matchID: number,
    @Body() updateMatchDto: any,
  ) {
    return this.matchService.updateMatchDetails(
      tournamentId,
      matchID,
      updateMatchDto.teamOneId,
      updateMatchDto.teamTwoId,
      updateMatchDto.matchDuration,
    );
  }
}
