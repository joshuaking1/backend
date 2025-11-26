import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto, SigninDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: AuthDto) {
    // 1. Generate the hashed password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 2. Create the organization and the user in a single transaction
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'ADMIN', // The first user is the organization's Admin
          organization: {
            create: {
              name: dto.organizationName,
            },
          },
        },
        // Include the organization details in the response
        include: {
          organization: true,
        },
      });

      // 3. Create a new object without the hashedPassword
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...result } = user;
      return result;

    } catch (error) {
      // 4. Handle specific database errors
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002' // Unique constraint violation code
      ) {
        // Check which field caused the error
        const target = error.meta?.target as string[];
        if (target?.includes('email')) {
          throw new ForbiddenException('A user with this email already exists.');
        }
        if (target?.includes('name')) {
          throw new ForbiddenException('An organization with this name already exists.');
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  async signin(dto: SigninDto) {
    // 1. Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, role: true, hashedPassword: true, branchId: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Compare passwords
    const passwordMatches = await bcrypt.compare(dto.password, user.hashedPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role, user.branchId ?? undefined);

    // 4. Hash and store refresh token
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  // --- HELPER METHODS ---

  private async generateTokens(userId: string, email: string, role: string, branchId?: string) {
    const payload = { sub: userId, email, role, branchId };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

    // Use direct SQL to update the hashedRefreshToken
    await this.prisma.$executeRaw`
      UPDATE "User"
      SET "hashedRefreshToken" = ${hashedRefreshToken}
      WHERE id = ${userId}
    `;
  }
}