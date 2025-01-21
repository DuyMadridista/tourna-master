// import { CategoryDto } from 'src/category/dto/category.dto';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
import { TournamentFormat } from 'src/enums/tournament-format.enum';
import { EventDate } from 'src/modules/event-date/entities/event-date.entity';
import { UserDto } from 'src/modules/user/dto/user.dto';

export class TournamentDto {
  id: number;
  title: string;
//   category: CategoryDto;
  createdAt: Date;
  status: TournamentStatus;
  matchDuration: number;
  format: TournamentFormat;
  organizers: UserDto[];
  eventDates: EventDate[];

  constructor(partial: Partial<TournamentDto>) {
    Object.assign(this, partial);
  }
}
