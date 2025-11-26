import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  /**
   * Invites a new staff member to an organization.
   * A temporary password is created, and the user must reset it later.
   * @param inviteStaffDto - The data for the new staff member.
   * @param organizationId - The organization they are being invited to.
   */
  async create(inviteStaffDto: InviteStaffDto, organizationId: string) {
    // Generate a secure temporary password
    const temporaryPassword = randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

    // TODO: In a real-world scenario, you would email this temporaryPassword
    // to the user and force them to change it on first login.
    console.log(`
      ======================================================
      TEMPORARY PASSWORD for ${inviteStaffDto.email}: ${temporaryPassword}
      ======================================================
    `);

    try {
      const newStaffUser = await this.prisma.user.create({
        data: {
          email: inviteStaffDto.email,
          firstName: inviteStaffDto.firstName,
          lastName: inviteStaffDto.lastName,
          role: inviteStaffDto.role,
          organizationId: organizationId,
          branchId: inviteStaffDto.branchId,
          hashedPassword: hashedPassword,
          staffProfile: {
            create: {
              phone: inviteStaffDto.phone,
            },
          },
        },
        include: {
          staffProfile: true, // Include the newly created profile in the response
        },
      });

      // Use object destructuring to exclude hashedPassword
      const { hashedPassword: _, ...userWithoutPassword } = newStaffUser;
      return userWithoutPassword;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForbiddenException('A user with this email already exists.');
      }
      throw error;
    }
  }

  /**
   * Finds all staff members within a specific organization.
   * @param organizationId - The ID of the organization to search within.
   */
  async findAll(organizationId: string) {
    const staff = await this.prisma.user.findMany({
      where: {
        organizationId: organizationId,
        // Exclude customers from the staff list
        NOT: {
          role: 'CUSTOMER',
        },
      },
      include: {
        staffProfile: true, // Also retrieve their staff profile
      },
    });

    // We must never return password hashes
    return staff.map(({ hashedPassword, ...user }) => user);
  }

  /**
   * Finds a single staff member by their unique ID.
   * @param id - The ID of the user to find.
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { staffProfile: true },
    });

    if (!user) {
      throw new NotFoundException(`Staff member with ID "${id}" not found.`);
    }

    // Use object destructuring to exclude hashedPassword
    const { hashedPassword, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Updates a staff member's User and StaffProfile details.
   * @param id - The ID of the user to update.
   * @param updateStaffDto - The new data to apply.
   */
  async update(id: string, updateStaffDto: UpdateStaffDto) {
    // Separate DTO into fields for the User model and the StaffProfile model
    const { bio, instagramHandle, commissionRate, phone, baseSalary, salaryType, commissionRuleId, ...userData } = updateStaffDto;
    
    const profileData = { bio, instagramHandle, commissionRate, phone, baseSalary, salaryType, commissionRuleId };

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        staffProfile: {
          update: profileData,
        },
      },
      include: {
        staffProfile: true,
      },
    });

    // Use object destructuring to exclude hashedPassword
    const { hashedPassword, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Deletes a staff member.
   * NOTE: In a true enterprise system, you might "deactivate" instead of delete.
   */
  async remove(id: string) {
    // First, check if the user exists to provide a clear error message.
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Staff member with ID "${id}" not found.`);
    }

    // Thanks to 'onDelete: Cascade' in our schema, deleting the user
    // will also automatically delete their StaffProfile.
    await this.prisma.user.delete({ where: { id } });

    return {
      message: `Successfully deleted staff member ${user.firstName} ${user.lastName}.`,
      statusCode: 200,
    };
  }
}