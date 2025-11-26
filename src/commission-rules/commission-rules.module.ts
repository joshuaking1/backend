import { Module } from '@nestjs/common';
import { CommissionRulesService } from './commission-rules.service';
import { CommissionRulesController } from './commission-rules.controller';

@Module({
  controllers: [CommissionRulesController],
  providers: [CommissionRulesService],
})
export class CommissionRulesModule {}
