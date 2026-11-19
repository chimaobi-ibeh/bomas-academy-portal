#!/usr/bin/env node
/**
 * Backup of online admission applications: every application record (JSON) plus its uploaded
 * passport photograph and birth certificate, written to a local folder.
 *
 * Supabase Free has no automatic backups, so run this regularly (e.g. monthly) and keep the
 * folder somewhere safe and private (it contains children's personal and health information).
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://<project>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"
 *   node scripts/export-admissions.mjs ./admissions-backup-2026-11
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const out = process.argv[2] ?? `admissions-backup-${new Date().toISOString().slice(0, 10)}`;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
await mkdir(out, { recursive: true });

let from = 0;
let total = 0;
const pageSize = 200;
for (;;) {
  const { data, error } = await db
    .from("admission_applications")
    .select("*, admission_payment_attempts(*)")
    .order("created_at", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  if (!data.length) break;
  for (const app of data) {
    const dir = join(out, `${app.reference}-${app.status}`);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "application.json"), JSON.stringify(app, null, 2));
    for (const path of [app.passport_path, app.birth_cert_path]) {
      const { data: file } = await db.storage.from("admission-documents").download(path);
      if (file) await writeFile(join(dir, path.split("/").pop()), Buffer.from(await file.arrayBuffer()));
    }
    total++;
  }
  from += pageSize;
}
console.log(`Exported ${total} application(s) to ${out}`);
