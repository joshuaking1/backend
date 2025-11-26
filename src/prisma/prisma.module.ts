import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Makes this module global
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export the service to make it available
})
export class PrismaModule {}