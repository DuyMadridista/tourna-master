import { DataSource, Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerRepository extends Repository<Player> {
    constructor(private dataSource: DataSource) {
        super(Player, dataSource.createEntityManager());
    }

    async getAllPlayersByTeamId(teamId: number): Promise<Player[]> {
        return this
            .createQueryBuilder('player')
            .where('player.team_id = :teamId', { teamId })
            .orderBy('player.createdAt', 'DESC')
            .getMany();
    }

    async getTotalPlayersByTeamId(teamId: number): Promise<number> {
        return this
            .createQueryBuilder('player')
            .where('player.team_id = :teamId', { teamId })
            .getCount();
    }

    async findByPlayerIdAndTeamId(playerId: number, teamId: number): Promise<Player> {
        return this
            .createQueryBuilder('player')
            .where('player.playerId = :playerId', { playerId })
            .andWhere('player.team_id = :teamId', { teamId })
            .getOne();
    }

    async deleteAllPlayerByTournamentId(tournamentId: number): Promise<void> {
        await this
            .createQueryBuilder('player')
            .delete()
            .where(`player.team_id IN (
                SELECT teamId FROM Team WHERE tournamentId = :tournamentId
            )`, { tournamentId })
            .execute();
    }
}