import { Module } from '@nestjs/common';
import { PlayerMatchService } from './player-match.service';
import { PlayerMatchController } from './player-match.controller';

@Module({
  controllers: [PlayerMatchController],
  providers: [PlayerMatchService],
})
export class PlayerMatchModule {}
