/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronJobs } from './cron-jobs.service';
import { TournamentModule } from '../modules/tournament/tournament.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TournamentModule, // Import module cần thiết
  ],
  providers: [CronJobs],
  exports: [CronJobs],
})
export class CronJobsModule {}
