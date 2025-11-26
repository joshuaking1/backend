import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserRole } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new customer for an organization.
   * This creates a User with the CUSTOMER role and an associated CustomerProfile.
   * A placeholder password is created as the User model requires it.
   * @param createCustomerDto The data for the new customer.
   * @param organizationId The organization the customer belongs to.
   */
  async create(createCustomerDto: CreateCustomerDto, organizationId: string) {
    // A placeholder password is required for the User model.
    const placeholderPassword = randomBytes(16).toString('hex');
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(placeholderPassword, salt);

    try {
      // First create the user with basic profile
      const newCustomer = await this.prisma.user.create({
        data: {
          email: createCustomerDto.email,
          firstName: createCustomerDto.firstName,
          lastName: createCustomerDto.lastName,
          hashedPassword,
          role: UserRole.CUSTOMER,
          organizationId,
          customerProfile: {
            create: {
              phone: createCustomerDto.phone,
              address: createCustomerDto.address,
              notes: createCustomerDto.notes,
              // TypeScript might complain about allergies until Prisma client is regenerated
              ...(createCustomerDto.allergies && { allergies: createCustomerDto.allergies }),
            },
          },
        },
        include: {
          customerProfile: true,
        },
      });

      // Create a new object without the hashedPassword
      const { hashedPassword: _, ...result } = newCustomer;
      return result;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForbiddenException(
          'A customer with this email already exists in this organization.',
        );
      }
      throw error;
    }
  }

  /**
   * Finds all customers within a specific organization.
   * @param organizationId The ID of the organization.
   */
  async findAll(organizationId: string) {
    const customers = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: UserRole.CUSTOMER, // Only fetch users who are customers
      },
      include: {
        customerProfile: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    // Return customers without the hashedPassword
    return customers.map(({ hashedPassword: _, ...customer }) => customer);
  }

  /**
   * Finds a single customer by their unique ID.
   * @param id The ID of the user (customer) to find.
   */
  async findOne(id: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id, role: UserRole.CUSTOMER },
      include: { customerProfile: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found.`);
    }

    // Return customer without the hashedPassword
    const { hashedPassword: _, ...result } = customer;
    return result;
  }

  /**
   * Updates a customer's details.
   * @param id The ID of the user (customer) to update.
   * @param updateCustomerDto The new data to apply.
   */
  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    // Separate DTO into fields for User model vs CustomerProfile model
    const {
      email,
      firstName,
      lastName,
      address,
      allergies,
      notes,
      phone,
    } = updateCustomerDto;

    const userData = { email, firstName, lastName };
    const profileData = { address, allergies, notes, phone };

    try {
      const updatedCustomer = await this.prisma.user.update({
        where: { id, role: UserRole.CUSTOMER },
        data: {
          ...userData,
          customerProfile: {
            update: profileData,
          },
        },
        include: {
          customerProfile: true,
        },
      });

      // Return updated customer without the hashedPassword
      const { hashedPassword: _, ...result } = updatedCustomer;
      return result;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Customer with ID "${id}" not found.`);
      }
      throw error;
    }
  }

  /**
   * Deletes a customer.
   * @param id The ID of the user (customer) to delete.
   */
  async remove(id: string) {
    try {
        await this.prisma.user.delete({
            where: { id, role: UserRole.CUSTOMER },
        });

        return {
            message: `Successfully deleted customer.`,
            statusCode: 200,
        };
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new NotFoundException(`Customer with ID "${id}" not found.`);
        }
        throw error;
    }
  }
}