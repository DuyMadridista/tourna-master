import { ApiProperty } from '@nestjs/swagger';

export class TournamentPlanDto {
    @ApiProperty({
        description: 'Default start time for tournament matches',
        example: '09:00:00'
    })
    startTimeDefault: string; // LocalTime equivalent in TypeScript

    @ApiProperty({
        description: 'Default end time for tournament matches',
        example: '17:00:00'
    })
    endTimeDefault: string; // LocalTime equivalent in TypeScript

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