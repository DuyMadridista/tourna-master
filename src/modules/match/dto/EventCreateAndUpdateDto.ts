import { IsNotEmpty, Max, Min, MaxLength, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class EventCreateAndUpdateDto {
  @IsNotEmpty({ message: 'Time duration must be provided.' })
  @Max(1440, { message: 'Time duration must be between 1 and 1440.' })
  @Min(1, { message: 'Time duration must be between 1 and 1440.' })
  timeDuration: number;

  @IsNotEmpty({ message: 'Title must not be null.' })
  @MaxLength(30, { message: 'Title of Event must be less than or equal to 30 characters.' })
  @MinLength(1, { message: 'Title of Event must be at least 1 character.' })
  @Matches(/^[a-zA-Z0-9\p{L}\s]*$/u, { message: 'Title cannot contain special characters.' })
  @Transform(({ value }) => value.trim())
  title: string;

  constructor(partial: Partial<EventCreateAndUpdateDto>) {
    Object.assign(this, partial);
  }
}
