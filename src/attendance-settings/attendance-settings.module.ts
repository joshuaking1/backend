import { Module } from '@nestjs/common';
import { AttendanceSettingsService } from './attendance-settings.service';
import { AttendanceSettingsController } from './attendance-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceSettingsController],
  providers: [AttendanceSettingsService],
  exports: [AttendanceSettingsService],
})
export class AttendanceSettingsModule {}
