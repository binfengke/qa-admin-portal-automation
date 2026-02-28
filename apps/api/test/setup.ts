process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/qa_admin_portal?schema=public";
process.env.JWT_SECRET ??= "dev-super-secret-change-me-123456";
process.env.WEB_ORIGIN ??= "http://localhost:8080";

