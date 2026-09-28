export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  emailVerified?: boolean;
  isAdmin?: boolean;
};

export const users = new Map<string, User>();
