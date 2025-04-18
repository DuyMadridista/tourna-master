import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerRequestDto } from './dto/player-request.dto';
import { SuccessResponse } from 'src/helper/OkResponse';
import { SuccessResponseDto } from 'src/helper/successResponse.dto';
import { Player } from './entities/player.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import * as xlsx from 'xlsx';
@Controller('tournament/:tournamentId/team/:teamId/player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get('')
  @HttpCode(HttpStatus.OK)
  async getAllPlayersByTeamID(
    @Param('teamId') teamId: number,
  ): Promise<SuccessResponseDto<Player[]>> {
    const totalPlayers = await this.playerService.getTotalPlayers(teamId);
    const players = await this.playerService.getAllPlayersByTeamId(teamId);

    return SuccessResponse(
      true,
      totalPlayers,
      players,
      'Players retrieved successfully',
    );
  }

  @Get('/:playerId')
  @HttpCode(HttpStatus.OK)
  async getPlayerByPlayerID(
    @Param('teamId') teamId: number,
    @Param('playerId') playerId: number,
  ): Promise<SuccessResponseDto<Player>> {
    const player = await this.playerService.getPlayerByPlayerId(
      teamId,
      playerId,
    );

    return SuccessResponse(true, 1, player, 'Player retrieved successfully');
  }

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createPlayer(
    @Param('teamId') teamId: number,
    @Body() playerDto: PlayerRequestDto,
  ): Promise<SuccessResponseDto<Player>> {
    const newPlayer = await this.playerService.createPlayer(
      teamId,
      playerDto.playerName,
      playerDto.number,
      playerDto.dateOfBirth.toString(),
      playerDto.phone,
    );
    return SuccessResponse(true, 1, newPlayer, 'Player created successfully');
  }

  @Put('/:playerId')
  @HttpCode(HttpStatus.OK)
  async updatePlayer(
    @Param('teamId') teamId: number,
    @Param('playerId') playerId: number,
    @Body() playerDto: PlayerRequestDto,
  ): Promise<SuccessResponseDto<Player>> {
    const updatedPlayer = await this.playerService.updatePlayer(
      teamId,
      playerId,
      playerDto.playerName.trim(),
      playerDto.dateOfBirth.toUTCString(),
      playerDto.phone,
    );

    return SuccessResponse(
      true,
      1,
      updatedPlayer,
      'Player updated successfully',
    );
  }

  @Delete('/:playerId')
  @HttpCode(HttpStatus.OK)
  async deletePlayer(
    @Param('teamId') teamId: number,
    @Param('playerId') playerId: number,
  ): Promise<SuccessResponseDto<Player>> {
    const deletedPlayer = await this.playerService.deletePlayer(
      teamId,
      playerId,
    );

    return SuccessResponse(
      true,
      1,
      deletedPlayer,
      'Player deleted successfully',
    );
  }

  @Post('/import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async importPlayers(
    @UploadedFile() file: Express.Multer.File & { buffer: Buffer },
    @Param('teamId') teamId: number,
  ): Promise<SuccessResponseDto<Player[]>> {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const importedPlayers = await this.playerService.importPlayers(
      data,
      teamId,
    );

    return SuccessResponse(
      true,
      importedPlayers.length,
      importedPlayers,
      'Players imported successfully',
    );
  }
}
