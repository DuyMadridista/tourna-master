import { Controller } from '@nestjs/common';
import { PlayerMatchService } from './player-match.service';

@Controller('player-match')
export class PlayerMatchController {
  constructor(private readonly playerMatchService: PlayerMatchService) {}
}
