import { Module } from '@nestjs/common';
import { EventDateService } from './event-date.service';
import { EventDateController } from './event-date.controller';

@Module({
  controllers: [EventDateController],
  providers: [EventDateService],
})
export class EventDateModule {}
