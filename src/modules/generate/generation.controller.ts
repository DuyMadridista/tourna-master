import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GenerationService } from './generation.service';
import { GenerationRequestDto } from './dto/generation-request.dto';
import { GenerationUpdateRequestDto } from './dto/generation-update-request.dto';
import { LocalTime } from '@js-joda/core';

@Controller('generate')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Get(':tournamentId')
  async getAllGeneration(@Param('tournamentId') tournamentId: number) {
    return await this.generationService.getAllGeneration(tournamentId);
  }

  @Post(':tournamentId')
  async generate(
    @Param('tournamentId') tournamentId: number,
    @Body() request: GenerationRequestDto,
  ) {
    const { startTime, endTime } = request;
    const start = LocalTime.parse(startTime.toString());
    const end = LocalTime.parse(endTime.toString());

    if (!start.isBefore(end)) {
      throw new HttpException(
        'Start time or end time invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.generationService.generateMatch(
      tournamentId,
      request.duration,
      request.betweenTime,
      start,
      end,
    );
  }

  // @Post('group-stage/:tournamentId')
  // async generateGroupStage(
  //   @Param('tournamentId') tournamentId: number,
  //   @Body() request: GenerationRequestDto,
  // ) {
  //   const { startTime, endTime } = request;
  //   const start = LocalTime.parse(startTime.toString());
  //   const end = LocalTime.parse(endTime.toString());

  //   if (!start.isBefore(end)) {
  //     throw new HttpException(
  //       'Start time or end time invalid',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   return await this.generationService.generateGroupStage(
  //     tournamentId,
  //     request.duration,
  //     request.betweenTime,
  //     start,
  //     end,
  //   );
  // }

  @Put('update')
  async updateGeneration(
    @Body() generationUpdateRequest: GenerationUpdateRequestDto,
  ) {
    const updatedGeneration = await this.generationService.updateGeneration(
      generationUpdateRequest.matchId,
      generationUpdateRequest.eventDateIdSelected,
      generationUpdateRequest.matchOfNewTimeId,
    );

    return {
      success: true,
      total: updatedGeneration.length,
      data: updatedGeneration,
    };
  }
}
