import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert,
    BeforeUpdate,
    ManyToMany,
  } from 'typeorm';
  import { IsEmail, Length } from 'class-validator';
  import { UserRole } from '../../../enums/user-role.enum';
import { Tournament } from 'src/modules/tournament/entities/tournament.entity';
  
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ length: 50 })
    @IsEmail()
    @Length(3, 50, { message: 'Email must be between 3 and 50 characters' })
    email: string;
  
    @Column()
    @Length(1, 255, { message: 'Password must not be empty' })
    password: string;
  
    @Column({ name: 'first_name' })
    @Length(1, 255, { message: 'First name must not be empty' })
    firstName: string;
  
    @Column({ name: 'last_name' })
    @Length(1, 255, { message: 'Last name must not be empty' })
    lastName: string;
  
    @Column({ name: 'phone_number', length: 25, nullable: true })
    @Length(1, 25, { message: 'Phone number must be between 10 and 11 characters' })
    phoneNumber: string;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @DeleteDateColumn({ name: 'deleted_at', nullable: true })
    deletedAt: Date;
  
    @Column({ type: 'date', name: 'date_of_birth', nullable: true })
    dateOfBirth: Date;
  
    @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
    role: UserRole;
  
    @Column({ name: 'is_deleted', default: false })
    isDeleted: boolean;
    @ManyToMany(() => Tournament, (tournament) => tournament.organizers)
    tournaments: Tournament[];
  
    @BeforeInsert()
    setInitialValues() {
      this.createdAt = new Date();
      this.isDeleted = false;
    }
  
    @BeforeUpdate()
    setUpdatedValues() {
      this.updatedAt = new Date();
    }
  }
  