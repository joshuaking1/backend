import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FindSlotsDto } from './dto/find-slots.dto';
import { addMinutes, isWithinInterval, parseISO } from 'date-fns';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * The core algorithm for finding available appointment slots.
   */
  async findAvailableSlots(dto: FindSlotsDto, organizationId: string, branchId: string) {
    const { startDate, endDate, serviceId, artistId } = dto;
    const searchStart = parseISO(startDate);
    const searchEnd = parseISO(endDate);

    // 1. Fetch all necessary data in parallel for efficiency
    const [service, artists] = await Promise.all([
      this.prisma.service.findUnique({ where: { id: serviceId } }),
      this.prisma.user.findMany({
        where: {
          id: artistId ? artistId : undefined, // Find specific artist or all in org
          organizationId: organizationId,
          branchId: branchId,
          role: 'ARTIST',
        },
        include: {
          artistAvailabilities: true,
          artistBlockouts: {
            where: {
              OR: [
                { startTime: { lte: searchEnd }, endTime: { gte: searchStart } },
              ],
            },
          },
          artistAppointments: {
            where: {
              OR: [
                { startTime: { lte: searchEnd }, endTime: { gte: searchStart } },
              ],
            },
          },
        },
      }),
    ]);

    if (!service) throw new NotFoundException('Service not found.');

    const availableSlotsByArtist = {};
    const SLOT_INTERVAL = 15; // Check for a new slot every 15 minutes

    // 2. Iterate through each artist to find their personal availability
    for (const artist of artists) {
      availableSlotsByArtist[artist.id] = [];
      let currentDate = new Date(searchStart);

      while (currentDate <= searchEnd) {
        const dayOfWeek = currentDate.getUTCDay() + 1; // 1=Monday..7=Sunday
        const availability = artist.artistAvailabilities.find(
          (a) => a.dayOfWeek === dayOfWeek,
        );

        if (availability) {
          // 3. Generate potential slots for a given day
          const dayStart = new Date(currentDate).setUTCHours(0, availability.startTime, 0, 0);
          const dayEnd = new Date(new Date(currentDate).setUTCHours(0, availability.endTime, 0, 0));
          
          let potentialSlotTime = new Date(dayStart);

          while (potentialSlotTime < dayEnd) {
            const appointmentEndTime = addMinutes(potentialSlotTime, service.duration);
            
            // 4. Validate each potential slot
            const isSlotAvailable =
              appointmentEndTime <= dayEnd &&
              !artist.artistAppointments.some((appt) =>
                isWithinInterval(potentialSlotTime, { start: appt.startTime, end: appt.endTime }) ||
                isWithinInterval(appointmentEndTime, { start: appt.startTime, end: appt.endTime })
              ) &&
              !artist.artistBlockouts.some((block) =>
                 isWithinInterval(potentialSlotTime, { start: block.startTime, end: block.endTime }) ||
                 isWithinInterval(appointmentEndTime, { start: block.startTime, end: block.endTime })
              );

            if (isSlotAvailable) {
              availableSlotsByArtist[artist.id].push(new Date(potentialSlotTime));
            }

            potentialSlotTime = addMinutes(potentialSlotTime, SLOT_INTERVAL);
          }
        }
        currentDate = addMinutes(currentDate, 24 * 60); // Move to the next day
      }
    }

    return availableSlotsByArtist;
  }

  /**
   * Creates a new appointment after verifying the slot is available.
   */
  async create(dto: CreateAppointmentDto, organizationId: string, branchId: string) {
    const { artistId, serviceId, startTime: requestedStartTimeStr } = dto;
    const requestedStartTime = parseISO(requestedStartTimeStr);

    // 1. Fetch service details to get duration and price
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found.');

    const appointmentEndTime = addMinutes(requestedStartTime, service.duration);

    // 2. Check for conflicts (artist appointments or blockouts)
    const conflicts = await this.prisma.user.findFirst({
        where: {
            id: artistId,
            OR: [
                { artistAppointments: { some: { startTime: { lt: appointmentEndTime }, endTime: { gt: requestedStartTime } } } },
                { artistBlockouts: { some: { startTime: { lt: appointmentEndTime }, endTime: { gt: requestedStartTime } } } },
            ]
        }
    });

    if (conflicts) {
      throw new BadRequestException('The requested time slot is no longer available.');
    }

    // 3. Create the appointment
    return this.prisma.appointment.create({
      data: {
        ...dto,
        startTime: requestedStartTime,
        endTime: appointmentEndTime,
        price: service.basePrice,
        organizationId,
        branchId,
      },
    });
  }

  // Standard CRUD methods for fetching and updating appointments
  findAll(organizationId: string, branchId: string | undefined, filters: { artistId?: string, startDate?: string, endDate?: string }) {
    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        branchId: branchId ? branchId : undefined,
        artistId: filters.artistId,
        startTime: { gte: filters.startDate ? parseISO(filters.startDate) : undefined },
        endTime: { lte: filters.endDate ? parseISO(filters.endDate) : undefined },
      },
      include: { artist: true, customer: true, service: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string, branchId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id, organizationId, branchId },
      include: { artist: true, customer: true, service: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    return appointment;
  }

  async findByCustomer(customerUserId: string, organizationId: string, branchId: string) {
    return this.prisma.appointment.findMany({
      where: { 
        customerUserId, 
        organizationId, 
        branchId 
      },
      include: { artist: true, customer: true, service: true },
      orderBy: { startTime: 'desc' },
    });
  }

  async update(id: string, dto: UpdateAppointmentDto, organizationId: string, branchId: string) {
    return this.prisma.appointment.update({
      where: { id, organizationId, branchId },
      data: dto,
    });
  }
}