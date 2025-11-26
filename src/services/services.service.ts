import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new service and links it to artists.
   * This is a transactional operation.
   * @param createServiceDto The service data.
   * @param organizationId The organization it belongs to.
   */
  async create(createServiceDto: CreateServiceDto, organizationId: string) {
    const { artistIds, ...serviceData } = createServiceDto;

    return this.prisma.$transaction(async (prisma) => {
      const newService = await prisma.service.create({
        data: {
          ...serviceData,
          organizationId,
        },
      });

      if (artistIds && artistIds.length > 0) {
        await prisma.artistsOnServices.createMany({
          data: artistIds.map((id) => ({
            userId: id,
            serviceId: newService.id,
          })),
        });
      }

      // Return the full service object with artists included
      return prisma.service.findUnique({
        where: { id: newService.id },
        include: { artists: { include: { user: true } } },
      });
    });
  }

  /**
   * Finds all services for an organization, including their categories and artists.
   * @param organizationId The organization ID.
   */
  findAll(organizationId: string) {
    return this.prisma.service.findMany({
      where: { organizationId },
      include: {
        category: true,
        artists: {
          include: {
            // Select only non-sensitive user fields
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Finds a single service by ID.
   * @param id The service ID.
   */
  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        artists: { include: { user: true } },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID "${id}" not found.`);
    }
    return service;
  }

  /**
   * Updates a service, including its artist assignments.
   * This is a transactional operation.
   * @param id The ID of the service to update.
   * @param updateServiceDto The new data.
   */
  async update(id: string, updateServiceDto: UpdateServiceDto) {
    const { artistIds, ...serviceData } = updateServiceDto;

    return this.prisma.$transaction(async (prisma) => {
      const updatedService = await prisma.service.update({
        where: { id },
        data: serviceData,
      });

      if (artistIds) {
        // This is a "delete-then-create" strategy for simplicity and correctness.
        // First, remove all existing artist assignments for this service.
        await prisma.artistsOnServices.deleteMany({
          where: { serviceId: id },
        });

        // Then, create the new assignments based on the provided artistIds.
        if (artistIds.length > 0) {
          await prisma.artistsOnServices.createMany({
            data: artistIds.map((artistId) => ({
              userId: artistId,
              serviceId: id,
            })),
          });
        }
      }

      // Return the fully updated service object
      return prisma.service.findUnique({
        where: { id: updatedService.id },
        include: { artists: { include: { user: true } } },
      });
    });
  }

  /**
   * Deletes a service. The join table entries are removed automatically
   * due to `onDelete: Cascade`.
   * @param id The ID of the service to delete.
   */
  async remove(id: string) {
    // Check for existence first to provide a clear 404
    await this.findOne(id);
    await this.prisma.service.delete({ where: { id } });
    return {
      message: `Successfully deleted service.`,
      statusCode: 200,
    };
  }
}