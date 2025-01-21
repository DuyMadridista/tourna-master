import { Injectable } from '@nestjs/common';
import { CreateEventDateDto } from './dto/create-event-date.dto';
import { UpdateEventDateDto } from './dto/update-event-date.dto';

@Injectable()
export class EventDateService {
  create(createEventDateDto: CreateEventDateDto) {
    return 'This action adds a new eventDate';
  }

  findAll() {
    return `This action returns all eventDate`;
  }

  findOne(id: number) {
    return `This action returns a #${id} eventDate`;
  }

  update(id: number, updateEventDateDto: UpdateEventDateDto) {
    return `This action updates a #${id} eventDate`;
  }

  remove(id: number) {
    return `This action removes a #${id} eventDate`;
  }
}
