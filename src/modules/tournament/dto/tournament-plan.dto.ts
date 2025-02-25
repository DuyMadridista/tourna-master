import { LocalTime } from '@js-joda/core';
import { ApiProperty } from '@nestjs/swagger';

export class TournamentPlanDto {
    @ApiProperty({
        description: 'Default start time for tournament matches',
        example: '09:00:00'
    })
    startTimeDefault: LocalTime; // LocalTime equivalent in TypeScript

    @ApiProperty({
        description: 'Default end time for tournament matches',
        example: '17:00:00'
    })
    endTimeDefault: LocalTime; // LocalTime equivalent in TypeScript

    @ApiProperty({
        description: 'Time between matches in minutes',
        example: 15
    })
    timeBetween: number;

    @ApiProperty({
        description: 'Duration of each match in minutes',
        example: 90
    })
    matchDuration: number;

    constructor(partial: Partial<TournamentPlanDto>) {
        Object.assign(this, partial);
    }
}