import { Test, TestingModule } from '@nestjs/testing';
import { CommissionRulesService } from './commission-rules.service';

describe('CommissionRulesService', () => {
  let service: CommissionRulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommissionRulesService],
    }).compile();

    service = module.get<CommissionRulesService>(CommissionRulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
