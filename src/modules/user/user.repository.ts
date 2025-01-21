import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { OrganizerInGeneralDto } from './dto/OrganizerInGeneral.dto';
import { UserDto } from './dto/user.dto';
import { UserRole } from 'src/enums/user-role.enum';
import { OrganizerTableDto } from './dto/organizer-table.dto';

@Injectable()

export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.findOne({ where: { email, isDeleted: false } });
  }

  async totalOrganizer(keyword: string): Promise<number> {
    const queryBuilder = this.createQueryBuilder('u')
      .leftJoin('organizer_tournament', 'ot', 'u.id = ot.userId')
      .where('u.role = :role', { role: 'ORGANIZER' })
      .andWhere('u.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere(
        '(LOWER(u.email) LIKE LOWER(:keyword) OR LOWER(CONCAT(u.firstName, \' \', u.lastName)) LIKE LOWER(:keyword))',
        { keyword: `%${keyword}%` }
      );

    return queryBuilder.getCount();
  }

  async findOrganizerById(userId: number): Promise<User | undefined> {
    return this.findOne({
      where: {
        id: userId,
        role: UserRole.ORGANIZER,
        isDeleted: false,
      },
    });
  }

  async findOrganizerInGeneral(tournamentId: number): Promise<OrganizerInGeneralDto[]> {
    const queryBuilder = this.createQueryBuilder('u')
      .select([
        'u.id as id',
        'CONCAT(u.firstName, \' \', u.lastName) as fullName',
        'u.email as email',
      ])
      .innerJoin('organizer_tournament', 'ot', 'u.id = ot.userId')
      .where('ot.tournamentId = :tournamentId', { tournamentId })
      .andWhere('u.isDeleted = :isDeleted', { isDeleted: false });

    const results = await queryBuilder.getRawMany();
    return results.map(r => new OrganizerInGeneralDto(r.id, r.fullName, r.email));
  }

  async findUserByTournamentId(tournamentId: number): Promise<UserDto[]> {
    const queryBuilder = this.createQueryBuilder('u')
      .select([
        'u.id',
        'u.firstName',
        'u.lastName',
        'u.email',
        'u.role',
      ])
      .innerJoin('organizer_tournament', 'ot', 'u.id = ot.userId')
      .where('ot.tournamentId = :tournamentId', { tournamentId })
      .andWhere('u.isDeleted = :isDeleted', { isDeleted: false });

    const users = await queryBuilder.getMany();
    return users.map(u => new UserDto({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
      }));      
  }

  async isOrganizerOfTournament(userId: number, tournamentId: number): Promise<User | undefined> {
    return this.createQueryBuilder('u')
      .innerJoin('organizer_tournament', 'ot', 'u.id = ot.userId')
      .where('ot.tournamentId = :tournamentId', { tournamentId })
      .andWhere('ot.userId = :userId', { userId })
      .andWhere('u.isDeleted = :isDeleted', { isDeleted: false })
      .getOne();
  }

  async organizerTable(
    keyword: string,
    sortValue: string,
    sortType: 'ASC' | 'DESC',
    page: number,
    size: number,
  ): Promise<OrganizerTableDto[]> {
    const query = `
      SELECT 
          u.id,
          u.email,
          CONCAT(u.first_name, ' ', u.last_name) AS "fullName",
          u.phone_number AS "phoneNumber",
          u.created_at AS "createdAt",
          COUNT(ot.tournament_id) AS "totalTournament",
          u.date_of_birth AS "dateOfBirth"
      FROM 
          users u
      LEFT JOIN 
          organizer_tournament ot ON u.id = ot.user_id
      WHERE 
          u.role = 'ORGANIZER'
          AND u.is_deleted = false
          AND (
              LOWER(u.email) LIKE LOWER(:keyword)
              OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER(:keyword)
          )
      GROUP BY 
          u.id
      ORDER BY 
          ${sortValue} ${sortType}
      LIMIT :size OFFSET :offset
    `;

    const result = await this.dataSource.query(query, {
      keyword: `%${keyword}%`,
      size,
      offset: page * size,
    } as any);

    return result.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      createdAt: row.createdAt,
      totalTournament: row.totalTournament,
      dateOfBirth: row.dateOfBirth,
    }));
  }
}