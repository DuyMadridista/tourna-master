import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TournamentModule } from './tournament/tournament.module';
import { TeamModule } from './team/team.module';
import { PlayerModule } from './player/player.module';
import { MatchModule } from './match/match.module';
import { EventDateModule } from './event-date/event-date.module';
import { HttpExceptionFilter } from './exception-filter/http-exception.filter';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [UserModule, TournamentModule, TeamModule, PlayerModule, MatchModule, EventDateModule],
  controllers: [AppController],
  providers: [ {
    provide: APP_FILTER,
    useClass: HttpExceptionFilter,
  },AppService],
})
export class AppModule {}
