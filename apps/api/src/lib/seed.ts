import type { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "./password";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";

const VIEWER_EMAIL = "viewer@example.com";
const VIEWER_PASSWORD = "viewer123";

async function upsertUser(args: {
  prisma: PrismaClient;
  email: string;
  password: string;
  role: UserRole;
}) {
  const passwordHash = await hashPassword(args.password);
  await args.prisma.user.upsert({
    where: { email: args.email },
    update: { role: args.role, status: "active", passwordHash },
    create: {
      email: args.email,
      passwordHash,
      role: args.role,
      status: "active",
    },
  });
}

export async function ensureSeedData(prisma: PrismaClient) {
  await upsertUser({
    prisma,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
  });

  await upsertUser({
    prisma,
    email: VIEWER_EMAIL,
    password: VIEWER_PASSWORD,
    role: "viewer",
  });

  const existing = await prisma.project.count();
  if (existing === 0) {
    await prisma.project.createMany({
      data: [
        { name: "Alpha", key: "ALPHA", status: "active" },
        { name: "Beta", key: "BETA", status: "active" },
        { name: "Legacy", key: "LEGACY", status: "archived" },
      ],
    });
  }
}

