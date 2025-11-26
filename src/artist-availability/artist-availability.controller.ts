import { Controller, Post, Body, UseGuards, Get, Param, Delete } from '@nestjs/common';
    import { ArtistAvailabilityService } from './artist-availability.service';
    import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
    import { RolesGuard } from 'src/common/guards/roles.guard';
    import { Roles } from 'src/common/decorators/roles.decorator';
    import { UserRole } from '@prisma/client';
    import { GetUser } from 'src/auth/decorator/get-user.decorator';
    import { SetAvailabilityDto } from './dto/set-availability.dto';
    import { CreateBlockoutDto } from './dto/create-blockout.dto';

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Controller('artist-availability')
    export class ArtistAvailabilityController {
      constructor(private readonly availabilityService: ArtistAvailabilityService) {}

      @Post('schedule')
      @Roles(UserRole.ADMIN, UserRole.MANAGER)
      setSchedule(@Body() setAvailabilityDto: SetAvailabilityDto) {
        return this.availabilityService.setSchedule(setAvailabilityDto);
      }

      @Get('schedule/:artistId')
      @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ARTIST)
      getSchedule(@Param('artistId') artistId: string) {
        return this.availabilityService.getSchedule(artistId);
      }

      @Post('blockout')
      @Roles(UserRole.ADMIN, UserRole.MANAGER)
      createBlockout(
        @Body() createBlockoutDto: CreateBlockoutDto,
        @GetUser('organizationId') organizationId: string,
      ) {
        return this.availabilityService.createBlockout(createBlockoutDto, organizationId);
      }

      @Get('blockout/:artistId')
      @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ARTIST)
      getBlockouts(@Param('artistId') artistId: string) {
        return this.availabilityService.getBlockouts(artistId);
      }

      @Delete('blockout/:blockoutId')
      @Roles(UserRole.ADMIN, UserRole.MANAGER)
      deleteBlockout(@Param('blockoutId') blockoutId: string) {
        return this.availabilityService.deleteBlockout(blockoutId);
      }
    }