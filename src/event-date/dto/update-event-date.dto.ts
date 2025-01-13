import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDateDto } from './create-event-date.dto';

export class UpdateEventDateDto extends PartialType(CreateEventDateDto) {}
