import { Injectable } from '@nestjs/common';
    import { PrismaService } from 'src/prisma/prisma.service';
    import { SetAvailabilityDto } from './dto/set-availability.dto';
    import { CreateBlockoutDto } from './dto/create-blockout.dto';

    @Injectable()
    export class ArtistAvailabilityService {
      constructor(private prisma: PrismaService) {}

      async setSchedule(dto: SetAvailabilityDto) {
        // This is a transactional "delete-then-create" operation to ensure a clean update.
        return this.prisma.$transaction(async (prisma) => {
          // 1. Delete all existing availability for this artist
          await prisma.artistAvailability.deleteMany({
            where: { artistId: dto.artistId },
          });

          // 2. Create the new availability schedule
          if (dto.schedule && dto.schedule.length > 0) {
            const availabilityData = await Promise.all(
              dto.schedule.map(async (slot) => {
                const user = await prisma.user.findUnique({ where: { id: dto.artistId } });
                if (!user) {
                  throw new Error(`Artist with ID ${dto.artistId} not found.`);
                }
                return {
                  artistId: dto.artistId,
                  dayOfWeek: slot.dayOfWeek,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  organizationId: user.organizationId,
                };
              })
            );
            await prisma.artistAvailability.createMany({
              data: availabilityData,
            });
          }
          
          return this.getSchedule(dto.artistId);
        });
      }

      getSchedule(artistId: string) {
        return this.prisma.artistAvailability.findMany({
          where: { artistId },
          orderBy: { dayOfWeek: 'asc' },
        });
      }

      createBlockout(dto: CreateBlockoutDto, organizationId: string) {
        return this.prisma.blockout.create({
          data: {
            ...dto,
            organizationId,
          },
        });
      }

      getBlockouts(artistId: string) {
        return this.prisma.blockout.findMany({
          where: { artistId, startTime: { gte: new Date() } }, // Only get future blockouts
          orderBy: { startTime: 'asc' },
        });
      }

      async deleteBlockout(blockoutId: string) {
        await this.prisma.blockout.delete({ where: { id: blockoutId } });
        return { message: 'Blockout successfully deleted.', statusCode: 200 };
      }
    }