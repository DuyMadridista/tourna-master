import { IsNotEmpty, IsString, IsInt, MaxLength, MinLength, ArrayNotEmpty, IsArray, IsDate, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LocalDate } from '@js-joda/core';

export class CreateTournamentDto {
  @Matches(/^[a-zA-Z0-9\p{L}\s]*$/u, {
    message: 'Title cannot contain special characters',
  })
  @MaxLength(30, { message: 'Tournament title must be less than 30 characters' })
  @MinLength(2, { message: 'Tournament title must be at least 2 characters' })
  @IsString()
  @Transform(({ value }) => value.trim())
  title: string;

  @IsNotEmpty({ message: 'Category ID must not be null' })
  @IsInt()
  categoryId: number;

  @IsNotEmpty({ message: 'Event dates must not be null' })
  @IsArray()
  @ArrayNotEmpty({ message: 'Event dates array must not be empty' })
  @Type(() => LocalDate)
  @IsDate({ each: true, message: 'Each event date must be a valid date' })
  @Transform(({ value }) => LocalDate.parse(value))
  eventDates: LocalDate[];

  @MaxLength(100, { message: 'Tournament description must be less than 100 characters' })
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  constructor(partial: Partial<CreateTournamentDto>) {
    Object.assign(this, partial);
  }
}
