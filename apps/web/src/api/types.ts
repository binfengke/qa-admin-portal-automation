export type UserRole = "admin" | "viewer";
export type UserStatus = "active" | "disabled";

export type User = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

export type ProjectStatus = "active" | "archived";

export type Project = {
  id: string;
  name: string;
  key: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

