import { Injectable } from '@nestjs/common';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommissionRulesService {
  constructor(private prisma: PrismaService) {}

  create(organizationId: string, createCommissionRuleDto: CreateCommissionRuleDto) {
    return this.prisma.commissionRule.create({
      data: {
        organizationId,
        ...createCommissionRuleDto,
      },
    });
  }

  findAll(organizationId: string) {
    return this.prisma.commissionRule.findMany({
      where: {
        organizationId,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.commissionRule.findUnique({
      where: {
        id,
      },
    });
  }

  update(id: string, updateCommissionRuleDto: UpdateCommissionRuleDto) {
    return this.prisma.commissionRule.update({
      where: {
        id,
      },
      data: updateCommissionRuleDto,
    });
  }

  remove(id: string) {
    return this.prisma.commissionRule.delete({
      where: {
        id,
      },
    });
  }
}
