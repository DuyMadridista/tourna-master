import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({ example: 'Football', description: 'The name of the category' })
  categoryName: string;

  @ApiProperty({ example: 1, description: 'The ID of the category' })
  id: number;
}
