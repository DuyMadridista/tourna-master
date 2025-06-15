import { ApiProperty } from '@nestjs/swagger';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
// import { CategoryDto } from '../category/category.dto'
import { OrganizerInGeneralDto } from '../../user/dto/OrganizerInGeneral.dto';
import { EventDate } from '../../event-date/entities/event-date.entity';
import { CategoryDto } from 'src/modules/category/dto/category.dto';
import { TournamentFormat } from 'src/enums/tournament-format.enum';

export class TournamentGeneralDto {
  @ApiProperty({ description: 'Unique identifier of the tournament' })
  id: number;

  @ApiProperty({ description: 'Title of the tournament' })
  title: string;

  @ApiProperty({ description: 'Description of the tournament' })
  description: string;

  @ApiProperty({
    description: 'Current status of the tournament',
    enum: TournamentStatus,
  })
  status: TournamentStatus;

  @ApiProperty({
    description: 'Category details of the tournament',
    type: () => CategoryDto,
  })
  category: CategoryDto;
  
  @ApiProperty({
    description: 'Place of the tournament',
    type: String,
  })
  place: string;

  @ApiProperty({
    description: 'Format of the tournament',
    enum: TournamentFormat,
  })
  format: TournamentFormat;
  
  @ApiProperty({
    description: 'Number of players in the tournament',
    type: Number,
  })
  numberOfPlayers: number;
  
  @ApiProperty({
    description: 'Number of groups in the tournament',
    type: Number,
  })
  numberOfGroups: number;

  @ApiProperty({
 
    type: Number,
  })
  numberOfFields: number;

  @ApiProperty({
    description: 'Number of teams per group in the tournament',
    type: Number,
  })
  teamsPerGroup: number;
  
  @ApiProperty({
    description: 'Number of teams advancing per group in the tournament',
    type: Number,
  })
  advancePerGroup: number;
  
  @ApiProperty({
    description: 'List of organizers of the tournament',
    type: () => [OrganizerInGeneralDto],
  })
  organizers: OrganizerInGeneralDto[];

  @ApiProperty({
    description: 'List of event dates for the tournament',
    type: () => [EventDate],
  })
  eventDates: EventDate[];
  constructor(init?: Partial<TournamentGeneralDto>) {
    Object.assign(this, init);
  }
}
