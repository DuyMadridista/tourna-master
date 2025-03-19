import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { SuccessResponse } from 'src/helper/OkResponse';
import { OrganizerUpSertDto } from './dto/organizer-upsert.dto';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto';

@Controller('organizer')
export class UserController {
  private static readonly DEFAULT_SORT_VALUE = 'fullName';

  constructor(private readonly userService: UserService) {}

  @Get('table')
  async organizerTable(
    @Query('keyword') keyword: string = '',
    @Query('sortType') sortType: 'ASC' | 'DESC' = 'DESC',
    @Query('page') page: number = 1,
    @Query('size') size: number = 10,
    @Query('sortValue') sortValue: string = UserController.DEFAULT_SORT_VALUE,
  ): Promise<any> {
    try {
      const totalOrganizer = await this.userService.totalOrganizer(
        keyword.trim(),
      );
      const listUser = await this.userService.organizerTable(
        keyword.trim(),
        sortType,
        page - 1,
        size,
        sortValue,
      );
      return SuccessResponse(
        true,
        listUser.length,
        listUser,
        'Organizer retrieved successfully',
        { totalOrganizer },
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async deleteOrganizer(@Param('id') id: number): Promise<any> {
    const deletedOrganizer = await this.userService.deleteOrganizer(id);
    return SuccessResponse(
      true,
      1,
      deletedOrganizer,
      'Organizer deleted successfully',
    );
  }

  @Post()
  async createOrganizer(@Body() organizer: OrganizerUpSertDto): Promise<any> {
    const user = await this.userService.createOrganizer(organizer);
    const temp = OrganizerUpSertDto.fromUser(user);
    return SuccessResponse(true, 1, temp, 'Organizer created successfully');
  }

  @Put(':id')
  async updateOrganizer(
    @Param('id') id: number,
    @Body() organizer: OrganizerUpSertDto,
  ): Promise<any> {
    const user = await this.userService.updateOrganizer(id, organizer);
    const temp = OrganizerUpSertDto.fromUser(user);
    return SuccessResponse(true, 1, temp, 'Organizer updated successfully');
  }

  @Get('getMe')
  async getMe(@Req() req: any): Promise<any> {
    try {
      const username = req.user?.email;
      const user = await this.userService.findByEmail(username);
      const result = OrganizerUpSertDto.fromUser(user);
      return SuccessResponse(
        true,
        1,
        result,
        'Organizer retrieved successfully',
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('getAllOrganizer')
  async getAllOrganizer(): Promise<any> {
    const result = await this.userService.findAllOrganizer();
    return SuccessResponse(
      true,
      result.length,
      result,
      'Organizer retrieved successfully',
    );
  }
  @Put('changePassword')
  async changePassword(
    @Req() req: any,
    @Body() request: ChangePasswordRequestDto,
  ): Promise<any> {
    const username = req.user?.email;
    const user = await this.userService.findByEmail(username);
    const updatedUser = await this.userService.changePassword(user, request);
    return SuccessResponse(
      true,
      1,
      updatedUser,
      'Password changed successfully',
    );
  }
  @Get(':id')
  async getOrganizer(@Param('id') id: number): Promise<any> {
    const user = await this.userService.getOrganizer(id);
    const temp = OrganizerUpSertDto.fromUser(user);
    return SuccessResponse(true, 1, temp, 'Organizer retrieved successfully');
  }
}
