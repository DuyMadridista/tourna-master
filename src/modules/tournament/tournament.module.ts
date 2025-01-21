import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentRepository } from './tournament.repository';
import { Tournament } from './entities/tournament.entity';
import { UserService } from '../user/user.service';
import { EventDateService } from '../event-date/event-date.service';

@Module({
  imports: [TypeOrmModule.forFeature([TournamentRepository]), TypeOrmModule.forFeature([Tournament])],
  controllers: [TournamentController],
  providers: [TournamentService, UserService,EventDateService,   {
      provide: TournamentRepository, 
      useClass: TournamentRepository,
    }],
})
export class TournamentModule {}
