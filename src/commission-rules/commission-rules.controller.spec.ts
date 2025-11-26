import { Test, TestingModule } from '@nestjs/testing';
import { CommissionRulesController } from './commission-rules.controller';
import { CommissionRulesService } from './commission-rules.service';

describe('CommissionRulesController', () => {
  let controller: CommissionRulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommissionRulesController],
      providers: [CommissionRulesService],
    }).compile();

    controller = module.get<CommissionRulesController>(CommissionRulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
