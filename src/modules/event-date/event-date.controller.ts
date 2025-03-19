import { Controller, Put, Param, Body } from '@nestjs/common';
import { EventDateService } from './event-date.service';
import { UpdateTimeDto } from './dto/update-time.dto';
import { SuccessResponseDto } from 'src/helper/successResponse.dto';
import { EventDate } from './entities/event-date.entity';

@Controller('tournament/:tournamentId/eventDate')
export class EventDateController {
  constructor(private readonly eventDateService: EventDateService) {}

  @Put('/:eventDateId')
  async updateStartTimeAndEndTime(
    @Param('tournamentId') tournamentId: number,
    @Param('eventDateId') eventDateId: number,
    @Body() updateTimeDto: UpdateTimeDto,
  ): Promise<SuccessResponseDto<EventDate>> {
    const { startTime, endTime } = updateTimeDto;
    return this.eventDateService.updateStartTimeAndEndTime(
      tournamentId,
      eventDateId,
      startTime,
      endTime,
    );
  }
}
