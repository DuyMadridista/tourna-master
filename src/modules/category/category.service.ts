import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsOrder } from 'typeorm';
import { Category } from './entities/category.entity';
import { TournamentService } from '../tournament/tournament.service';
import { CategoryDto } from './dto/category.dto';
import { LocalDateTime } from '@js-joda/core';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(forwardRef(() => TournamentService)) 
    private readonly tournamentService: TournamentService,
  ) {}

  async createCategory(categoryName: string): Promise<Category> {
    if (await this.hasExistCategoryName(categoryName.trim())) {
      throw new BadRequestException('Category name has already existed');
    }

    const category = this.categoryRepository.create({
      categoryName: categoryName.trim(),
      createdAt: new Date(),
    });

    return this.categoryRepository.save(category);
  }

  async hasExistCategoryName(categoryName: string): Promise<Category | null> {
    return this.categoryRepository.findOne({ where: { categoryName: Like(categoryName) } });
  }

  getSorting(sortType: string, sortValue: string): FindOptionsOrder<Category> {
    if (!sortType) {
      sortType = 'desc';
      sortValue = 'categoryId';
    }
    return { [sortValue]: sortType.toLowerCase() === 'desc' ? 'DESC' : 'ASC' };
  }

  async findCategoryById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { categoryId: id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async searchAndSortCategories(
    keyword: string,
    sortType: string,
    page: number,
    size: number,
    sortValue: string,
  ): Promise<Category[]> {
    const order = this.getSorting(sortType, sortValue);

    const categories = await this.categoryRepository.find({
      where: { categoryName: Like(`%${keyword.trim()}%`) },
      order,
      skip: page * size,
      take: size,
    });

    if (categories.length === 0) {
      throw new NotFoundException('Category not found');
    }

    return categories;
  }

  async updateCategoryIsDelete(id: number): Promise<Category> {
    const category = await this.findCategoryById(id);
    category.isDeleted = true;
    category.deletedAt = LocalDateTime.now();
    await this.categoryRepository.save(category);

    const tournaments = await this.tournamentService.findTournamentByCategoryId(id);
    const activeTournaments = tournaments.filter(tournament => !tournament.isDeleted);
    for (const tournament of activeTournaments) {
      await this.tournamentService.deleteTournament(tournament.id);
    }

    return category;
  }

  async updateCategory(id: number, categoryName: string): Promise<Category> {
    if (await this.hasExistCategoryName(categoryName)) {
      throw new BadRequestException('Category name has already existed');
    }
    const category = await this.findCategoryById(id);
    category.categoryName = categoryName;
    category.updatedAt = LocalDateTime.now();
    return this.categoryRepository.save(category);
  }

  async totalCategory(keyword: string): Promise<number> {
    return this.categoryRepository.count({ where: { categoryName: Like(`%${keyword.trim()}%`) } });
  }

  async findAllCategories(): Promise<Category[]> {
    return this.categoryRepository.find({ where: { isDeleted: false }, order: { categoryName: 'ASC' } });
  }

  async findCategoryDtoById(categoryId: number): Promise<CategoryDto> {
    const category = await this.findCategoryById(categoryId);
    return { id: category.categoryId, categoryName: category.categoryName };
  }

  async countTournamentByCategory(categoryId: number): Promise<number> {
    const tournaments = await this.tournamentService.findTournamentByCategoryId(categoryId);
    return tournaments.filter(tournament => !tournament.isDeleted).length;
  }
}
