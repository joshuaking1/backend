import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config'; // 1. Import ConfigModule
import { UsersModule } from './users/users.module';
import { StaffModule } from './staff/staff.module';
import { CustomersModule } from './customers/customers.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { ServicesModule } from './services/services.module';
import { InventoryCategoriesModule } from './inventory-categories/inventory-categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryItemsModule } from './inventory-items/inventory-items.module';
import { ArtistAvailabilityModule } from './artist-availability/artist-availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SalesModule } from './sales/sales.module';
import { BranchesModule } from './branches/branches.module';
import { CommissionRulesModule } from './commission-rules/commission-rules.module';
import { PayrollModule } from './payroll/payroll.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // 2. Add and configure it here
    PrismaModule,
    AuthModule,
    UsersModule,
    StaffModule,
    CustomersModule,
    ServiceCategoriesModule,
    ServicesModule,
    InventoryCategoriesModule,
    SuppliersModule,
    InventoryItemsModule,
    ArtistAvailabilityModule,
    AppointmentsModule,
    SalesModule,
    BranchesModule,
    CommissionRulesModule,
    PayrollModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}