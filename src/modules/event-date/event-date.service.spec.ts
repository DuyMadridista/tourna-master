import { Test, TestingModule } from '@nestjs/testing';
import { EventDateService } from './event-date.service';

describe('EventDateService', () => {
  let service: EventDateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventDateService],
    }).compile();

    service = module.get<EventDateService>(EventDateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
