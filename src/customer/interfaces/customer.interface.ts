import { UserSummary } from 'src/user/interfaces';

export interface CustomerResponse {
  id: string;
  name: string;
  email: string;
  code: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt?: Date | null;
  createdBy?: UserSummary | null;
  updatedBy?: UserSummary | null;
  deletedBy?: UserSummary | null;
}
