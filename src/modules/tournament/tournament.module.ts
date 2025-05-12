import { forwardRef, Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentRepository } from './tournament.repository';
import { Tournament } from './entities/tournament.entity';
import { UserModule } from '../user/user.module';
import { TeamModule } from '../team/team.module';
import { EventDateModule } from '../event-date/event-date.module';
import { CategoryModule } from '../category/category.module';
import { MatchModule } from '../match/match.module';
import { PlayerModule } from '../player/player.module';
import { CurrentUserProvider } from 'src/helper/current-user.provider';
import { AuthModule } from '../auth/auth.module';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournament, User]),
    AuthModule,
    UserModule,
    forwardRef(() => TeamModule),
    forwardRef(() => EventDateModule),
    forwardRef(() => CategoryModule),
    forwardRef(() => MatchModule),
    forwardRef(() => PlayerModule),
  ],
  controllers: [TournamentController],
  providers: [TournamentService, TournamentRepository, CurrentUserProvider],
  exports: [TournamentService, TournamentRepository],
})
export class TournamentModule {}
