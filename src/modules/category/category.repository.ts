import { Injectable } from '@nestjs/common';
import { DataSource, Repository, ILike } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryRepository extends Repository<Category> {
  constructor(private dataSource: DataSource) {
    super(Category, dataSource.createEntityManager());
  }

  async totalCategory(keyword: string): Promise<number> {
    return this.count({
      where: { categoryName: ILike(`%${keyword}%`), isDeleted: false },
    });
  }

  async findCategoriesByName(
    keyword: string,
    skip: number,
    take: number,
  ): Promise<Category[]> {
    return this.find({
      where: { categoryName: ILike(`%${keyword}%`), isDeleted: false },
      order: { categoryName: 'ASC' },
      skip,
      take,
    });
  }

  async findCategoryByName(
    categoryName: string,
  ): Promise<Category | undefined> {
    return this.findOne({
      where: { categoryName: ILike(categoryName), isDeleted: false },
    });
  }

  async findCategoryById(id: number): Promise<Category | undefined> {
    return this.findOne({ where: { categoryId: id, isDeleted: false } });
  }

  async getAllCategories(): Promise<Category[]> {
    return this.find({
      where: { isDeleted: false },
      order: { categoryName: 'ASC' },
    });
  }
}
