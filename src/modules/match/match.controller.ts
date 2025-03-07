import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { MatchService } from './match.service';
import { RequestDragDropMatch } from './dto/RequestDragDropMatch';
import { SuccessResponse } from 'src/helper/OkResponse';
import * as matchEntity from './entities/match.entity';

@Controller('tournament/:tournamentId/match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('result')
  async getAllMatchResult(@Param('tournamentId') tournamentId: number) {
    const result = await this.matchService.getAllResult(tournamentId);
    return  SuccessResponse(true, result.length, result);
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

  @Put(':matchID')
  async updateMatchDetails(
    @Param('tournamentId') tournamentId: number,
    @Param('matchID') matchID: number,
    @Body() updateMatchDto: matchEntity.Match,
  ) {
    return this.matchService.updateMatchDetails(
      tournamentId,
      matchID,
      updateMatchDto.teamOne.teamId,
      updateMatchDto.teamTwo.teamId,
      updateMatchDto.matchDuration,
    );
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
}
