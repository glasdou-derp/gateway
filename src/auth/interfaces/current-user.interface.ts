export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  password: string;
  roles: Role[];
  createdAt: Date | string;
  updateAt: Date | string;
  deletedAt?: Date | string;
}

export enum Role {
  User = 'User',
  Admin = 'Admin',
  Moderator = 'Moderator',
}
