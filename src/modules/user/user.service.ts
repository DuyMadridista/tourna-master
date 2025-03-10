import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UserRole } from 'src/enums/user-role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import { CommonValidationService } from 'src/helper/common-validation';
import { OrganizerTableDto } from './dto/organizer-table.dto';
import { OrganizerUpSertDto } from './dto/organizer-upsert.dto';
import * as bcrypt from 'bcrypt';
import { DateValidatorUtils } from 'src/helper/date-validator.utils';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto';
import { UserDto } from './dto/user.dto';
import { OrganizerInGeneralDto } from './dto/OrganizerInGeneral.dto';
@Injectable()
export class UserService {
  private readonly ORGANIZER_DEFAULT_PASSWORD = 'defaultPassword123'; // Move to config

  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository ,
    private readonly commonValidation: CommonValidationService
  ) {}

  async loadUserByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findUserByEmail(username);
    if (!user) {
      throw new NotFoundException(`User not found with username or email: ${username}`);
    }
    return user;
  }

  async organizerTable(
    keyword: string,
    sortType: 'ASC' | 'DESC',
    page: number,
    size: number,
    sortValue: string
  ): Promise<OrganizerTableDto[]> {
    this.commonValidation.validatePageAndSize(page, size);
    
    if (!sortType) {
      sortValue = 'id';
      sortType = 'DESC';
    }

    const foundUsers = await this.userRepository.organizerTable(
      this.commonValidation.escapeSpecialCharacters(keyword.trim()),
      sortValue,
      sortType,
      page,
      size
    );

    if (!foundUsers.length) {
      throw new NotFoundException('Organizer not found');
    }

    return foundUsers;
  }

  async totalOrganizer(keyword: string): Promise<number> {
    return this.userRepository.totalOrganizer(keyword.trim()
      // this.commonValidation.escapeSpecialCharacters(keyword.trim())
    );
  }

  async deleteOrganizer(id: number): Promise<User> {
    const organizer = await this.userRepository.findOrganizerById(id);
    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    organizer.isDeleted = true;
    organizer.deletedAt = new Date();
    return this.userRepository.save(organizer);
  }

  async createOrganizer(organizer: OrganizerUpSertDto): Promise<User> {
    if (organizer.dateOfBirth && !DateValidatorUtils.isBeforeToday(organizer.dateOfBirth)) {
      throw new BadRequestException('Date of birth must be before today');
    }

    const existingUser = await this.userRepository.findOneBy({email: organizer.email});
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(organizer.password ?? this.ORGANIZER_DEFAULT_PASSWORD, 10);
    const user = this.userRepository.create({
      email: organizer.email,
      password: hashedPassword,
      firstName: organizer.firstName,
      lastName: organizer.lastName,
      phoneNumber: organizer.phoneNumber,
      dateOfBirth: organizer.dateOfBirth,
      role: UserRole.ORGANIZER,
    });

    return this.userRepository.save(user);
  }

  async updateOrganizer(id: number, organizer: OrganizerUpSertDto): Promise<User> {
    if (organizer.dateOfBirth && !DateValidatorUtils.isBeforeToday(organizer.dateOfBirth)) {
      throw new BadRequestException('Date of birth must be before today');
    }

    const user = await this.userRepository.findOrganizerById(id);
    if (!user) {
      throw new NotFoundException('Organizer not found');
    }

    const userByEmail = await this.userRepository.findOneBy({email: organizer.email});
    if (userByEmail && userByEmail.id !== id) {
      throw new BadRequestException('Email already exists');
    }

    Object.assign(user, {
      email: organizer.email,
      firstName: organizer.firstName,
      lastName: organizer.lastName,
      phoneNumber: organizer.phoneNumber,
      dateOfBirth: organizer.dateOfBirth || user.dateOfBirth,
    });

    return this.userRepository.save(user);
  }

  async getOrganizer(id: number): Promise<User> {
    const organizer = await this.userRepository.findOrganizerById(id);
    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }
    return organizer;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async isOrganizerOfTournament(email: string, tournamentId: number): Promise<boolean> {
    const user = await this.userRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('Organizer not found');
    }

    const isOrganizer = await this.userRepository.isOrganizerOfTournament(
      user.id,
      tournamentId
    );

    return !!isOrganizer;
  }

  async changePassword(user: User, request: ChangePasswordRequestDto): Promise<OrganizerUpSertDto> {
    if (!request.newPassword?.trim()) {
      throw new BadRequestException('New password must not be empty');
    }

    const isOldPasswordValid = await bcrypt.compare(
      request.oldPassword.trim(),
      user.password
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is not correct');
    }

    if (request.newPassword.trim() === request.oldPassword.trim()) {
      throw new BadRequestException('New password must be different from old password');
    }

    if (request.newPassword.trim() !== request.confirmPassword.trim()) {
      throw new BadRequestException('Confirm password must be the same as new password');
    }

    user.password = await bcrypt.hash(request.newPassword.trim(), 10);
    await this.userRepository.save(user);
    
    return OrganizerUpSertDto.fromUser(user);
  }

    async findAllOrganizer(): Promise<User[]> {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.role = :role', { role: UserRole.ORGANIZER })
        .getMany();
    
      return users;
    }

    async findUserByTournamentId (tournamentId: number): Promise<UserDto[]> {
      const users = await this.userRepository.findUserByTournamentId(tournamentId);
      return users;
    }
     
    async findOrganizerInGeneral(tournamentId: number): Promise<OrganizerInGeneralDto[]> {
      const organizers = await this.userRepository.findOrganizerInGeneral(tournamentId);
      return organizers;
    }
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({id: id});
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
