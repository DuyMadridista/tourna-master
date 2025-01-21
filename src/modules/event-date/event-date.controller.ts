import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventDateService } from './event-date.service';
import { CreateEventDateDto } from './dto/create-event-date.dto';
import { UpdateEventDateDto } from './dto/update-event-date.dto';

@Controller('event-date')
export class EventDateController {
  constructor(private readonly eventDateService: EventDateService) {}

  @Post()
  create(@Body() createEventDateDto: CreateEventDateDto) {
    return this.eventDateService.create(createEventDateDto);
  }

  @Get()
  findAll() {
    return this.eventDateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventDateService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDateDto: UpdateEventDateDto) {
    return this.eventDateService.update(+id, updateEventDateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventDateService.remove(+id);
  }
}
