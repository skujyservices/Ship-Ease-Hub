// Supabase exposes every table in the "public" schema through its Data API (PostgREST).
// The app never uses that API, so turn on Row Level Security with no policies on every
// table: the API sees nothing, while the app (connecting as the owner) keeps full access.
// Runs after `prisma db push` via `npm run db:push`.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const tables = await db.$queryRaw`select tablename from pg_tables where schemaname = 'public'`;
for (const { tablename } of tables) {
  await db.$executeRawUnsafe(`alter table public."${tablename.replace(/"/g, '""')}" enable row level security`);
}
console.log(`Row level security on for ${tables.length} tables`);
await db.$disconnect();
