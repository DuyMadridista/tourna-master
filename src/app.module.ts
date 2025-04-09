import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { TeamModule } from './modules/team/team.module';
import { PlayerModule } from './modules/player/player.module';
import { MatchModule } from './modules/match/match.module';
import { EventDateModule } from './modules/event-date/event-date.module';
import { HttpExceptionFilter } from './exception-filter/http-exception.filter';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryModule } from './modules/category/category.module';
import typeormConfig from './config/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { GenerationModule } from './modules/generate/generation.module';
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { PlayerMatchModule } from './modules/player-match/player-match.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeormConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('typeorm'),
      }),
    }),
    AuthModule,
    UserModule,
    TournamentModule,
    TeamModule,
    PlayerModule,
    MatchModule,
    EventDateModule,
    CategoryModule,
    GenerationModule,
    CronJobsModule,
    PlayerMatchModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule {}
