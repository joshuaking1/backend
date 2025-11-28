import { PaymentMethod } from '@prisma/client';

export class Expense {
  id: string;
  amount: number;
  date: Date;
  description: string;
  vendor: string | null;
  receiptUrl: string | null;
  paymentMethod: PaymentMethod;
  notes: string | null;
  organizationId: string;
  branchId: string | null;
  categoryId: string;
  recordedById: string;
  createdAt: Date;
  updatedAt: Date;
}
