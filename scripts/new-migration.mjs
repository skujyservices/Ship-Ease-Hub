// Creates a migration from the difference between the live database and prisma/schema.prisma.
//   npm run db:migration -- add_delivery_notes
// Review the SQL it writes, commit it, then apply with `npm run db:deploy`.
// (Diffs against the database itself, so no "shadow database" is needed on Supabase.)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const name = (process.argv[2] ?? "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "");
if (!name) {
  console.error("Usage: npm run db:migration -- <short_name>");
  process.exit(1);
}

const prisma = path.join("node_modules", "prisma", "build", "index.js");
const diff = spawnSync(
  process.execPath,
  [prisma, "migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
  { encoding: "utf8", env: process.env },
);
if (diff.status !== 0) {
  console.error(diff.stderr);
  process.exit(diff.status ?? 1);
}
if (/^\s*-- This is an empty migration\.\s*$/.test(diff.stdout) || !diff.stdout.trim()) {
  console.log("No changes: the database already matches the schema.");
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const dir = path.join("prisma", "migrations", `${stamp}_${name}`);
fs.mkdirSync(dir, { recursive: true });
const rls = `
-- Keep every table locked against Supabase's public Data API (see 0_init)
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
`;
fs.writeFileSync(path.join(dir, "migration.sql"), diff.stdout + rls);
console.log(`Wrote ${dir}/migration.sql. Review it, then run: npm run db:deploy`);
