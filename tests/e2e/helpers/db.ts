import { Client } from "pg";

export type DbUserRecord = {
  id: string;
  email: string;
  role: "admin" | "viewer";
  status: "active" | "disabled";
  passwordHash: string;
  createdAt: Date;
};

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/qa_admin_portal?schema=public"
  );
}

async function withClient<T>(fn: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function findUserByEmail(email: string): Promise<DbUserRecord | null> {
  return withClient(async (client) => {
    const result = await client.query<DbUserRecord>(
      `select id, email, role, status, "passwordHash", "createdAt"
       from "User"
       where email = $1
       limit 1`,
      [email],
    );

    return result.rows[0] ?? null;
  });
}

export async function deleteUserByEmail(email: string) {
  await withClient(async (client) => {
    await client.query(`delete from "User" where email = $1`, [email]);
  });
}
