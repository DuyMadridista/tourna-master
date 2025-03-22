/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TournamentRepository } from '../modules/tournament/tournament.repository';
import { TournamentStatus } from 'src/enums/tournament-status.enum';
import { In } from 'typeorm';

@Injectable()
export class CronJobs {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    console.log('Running cron job to update tournament statuses...');
    await this.updateTournamentStatuses();
    console.log('Cron job completed');
  }

  private async updateTournamentStatuses() {
    await this.bulkUpdateTournamentStatus(
      () =>
        this.tournamentRepository.findTournamentReadyNeedToChangeToInProgress(),
      TournamentStatus.IN_PROGRESS,
      'id',
    );

    await this.bulkUpdateTournamentStatus(
      () =>
        this.tournamentRepository.findTournamentInProgressNeedToChangeToFinished(),
      TournamentStatus.FINISHED,
      'tournament_id',
    );

    await this.bulkUpdateTournamentStatus(
      () =>
        this.tournamentRepository.findTournamentNeedInformationNeedToChangeToFinished(),
      TournamentStatus.FINISHED,
      'tournament_id',
    );
  }

  private async bulkUpdateTournamentStatus(
    finder: () => Promise<any[]>,
    newStatus: TournamentStatus,
    idField: string,
  ) {
    const tournaments = await finder();
    const tournamentIds = tournaments.map((t) => t[idField]);
    if (tournamentIds.length === 0) return;

    await this.tournamentRepository.update(
      { id: In(tournamentIds) },
      { status: newStatus },
    );
  }
}
