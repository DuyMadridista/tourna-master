import { Test, TestingModule } from '@nestjs/testing';
import { EventDateController } from './event-date.controller';
import { EventDateService } from './event-date.service';

describe('EventDateController', () => {
  let controller: EventDateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventDateController],
      providers: [EventDateService],
    }).compile();

    controller = module.get<EventDateController>(EventDateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
