import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpStatus } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryDto } from './dto/category.dto';
import { SuccessResponse } from 'src/helper/OkResponse';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get(':id')
  async findCategoryById(@Param('id') id: number) {
    const category = await this.categoryService.findCategoryById(id);
    return  SuccessResponse(!!category, category ? 1 : 0, category || '',"");
  }

  @Get()
  async searchCategoryByNameContaining(
    @Query('keyword') keyword = '',
    @Query('sortType') sortType = '',
    @Query('page') page = 1,
    @Query('size') size = 10,
    @Query('sortValue') sortValue = 'categoryName',
  ) {
    const totalCategories = await this.categoryService.totalCategory(keyword.trim());
    const foundCategories = await this.categoryService.searchAndSortCategories(keyword.trim(), sortType, page - 1, size, sortValue);
    return  SuccessResponse(true, totalCategories, foundCategories,"");
  }

  @Delete(':id')
  async deleteCategory(@Param('id') id: number) {
    const updatedCategory = await this.categoryService.updateCategoryIsDelete(id);
    return  SuccessResponse(true, 1, updatedCategory);
  }

  @Put(':id')
  async updateCategory(@Param('id') id: number, @Body() categoryDto: CategoryDto) {
    const updatedCategory = await this.categoryService.updateCategory(id, categoryDto.categoryName.trim());
    return  SuccessResponse(true, 1, updatedCategory);
  }

  @Post()
  async createCategory(@Body() categoryDto: CategoryDto) {
    const category = await this.categoryService.createCategory(categoryDto.categoryName.trim());
    return  SuccessResponse(true, 1, category, '');
  }

  @Get('all')
  async findAllCategories() {
    const categories = await this.categoryService.findAllCategories();
    return  SuccessResponse(true, categories.length, categories);
  }

  @Get('countTournament/:id')
  async countTournamentByCategory(@Param('id') categoryId: number) {
    const total = await this.categoryService.countTournamentByCategory(categoryId);
    return  SuccessResponse(true, total, null);
  }
}
