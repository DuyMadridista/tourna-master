import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { IsNotEmpty, IsBoolean, Length, Matches } from 'class-validator';
import { LocalTime, LocalDate, LocalDateTime } from '@js-joda/core';
import { Tournament } from 'src/modules/tournament/entities/tournament.entity';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  categoryId: number;

  @Column({ nullable: false })
  @IsNotEmpty({ message: 'Category name must be between 2 and 30 characters' })
  @Length(2, 30, { message: 'Category name must be between 2 and 30 characters' })
  categoryName: string;

  @Column({ default: false })
  @IsBoolean()
  isDeleted: boolean;

    @CreateDateColumn({ name: 'created_at' })

  createdAt: LocalDateTime;

    @CreateDateColumn({ name: 'updated_at' })

  updatedAt: LocalDateTime;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: LocalDateTime | null;

  @OneToMany(() => Tournament, (tournament) => tournament.category)
  tournaments: Tournament[];
  
  setCategoryName(categoryName: string) {
    this.categoryName = categoryName?.trim() || null;
  }
}
