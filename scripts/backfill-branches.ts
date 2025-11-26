// scripts/backfill-branches.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting branch backfill script...');

  // 1. Find all organizations
  const organizations = await prisma.organization.findMany();
  console.log(`Found ${organizations.length} organizations.`);

  for (const org of organizations) {
    console.log(`Processing organization: ${org.name} (${org.id})`);

    // 2. Create a "Main Branch" for each organization
    const mainBranch = await prisma.branch.create({
      data: {
        name: 'Main Branch',
        organizationId: org.id,
        isDefault: true,
      },
    });
    console.log(` -> Created 'Main Branch' with ID: ${mainBranch.id}`);

    // 3. Update all existing records to link to this new main branch
    const modelsToUpdate = [
      prisma.user.updateMany({ where: { organizationId: org.id }, data: { branchId: mainBranch.id } }),
      prisma.appointment.updateMany({ where: { organizationId: org.id }, data: { branchId: mainBranch.id } }),
      prisma.sale.updateMany({ where: { organizationId: org.id }, data: { branchId: mainBranch.id } }),
      prisma.inventoryItem.updateMany({ where: { organizationId: org.id }, data: { branchId: mainBranch.id } }),
      prisma.artistAvailability.updateMany({ where: { organizationId: org.id }, data: { branchId: mainBranch.id } }),
      prisma.blockout.updateMany({ where: { organizationId: org.id }, data: { branchId: mainBranch.id } }),
    ];

    await Promise.all(modelsToUpdate);
    console.log(` -> Updated all related records to point to the new branch.`);
  }

  console.log('Branch backfill script finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });