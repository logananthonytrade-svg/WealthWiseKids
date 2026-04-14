#!/usr/bin/env node
/**
 * migrate.js — WealthWise Kids production migration runner
 *
 * Reads every .sql file from supabase/migrations/ in alphabetical order
 * and executes them sequentially against your Supabase Postgres database.
 * Each migration runs in its own transaction; a failure rolls back that
 * migration and stops the run so you can fix and re-run safely.
 *
 * Prerequisites:
 *   npm install pg      (run once from the /scripts directory)
 *
 * Usage:
 *   node scripts/migrate.js
 *
 * Required env var (set in backend/.env or export in shell):
 *   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
 *
 * Where to find your DATABASE_URL:
 *   Supabase Dashboard → Project Settings → Database → Connection String (URI)
 *
 * Already-run migrations are safe to re-run; every DDL statement uses
 * IF NOT EXISTS / IF EXISTS / ON CONFLICT DO NOTHING guards.
 */

'use strict';

const { Client }  = require('pg');
const fs          = require('fs');
const path        = require('path');
const { config }  = require('dotenv');

// Load .env from backend/ (one level up from scripts/)
config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    '\n[migrate] ❌  DATABASE_URL is not set.\n' +
    '  Add it to backend/.env or export it in your shell:\n' +
    '  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres\n' +
    '  (Supabase Dashboard → Project Settings → Database → Connection String)\n'
  );
  process.exit(1);
}

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'supabase', 'migrations');

async function run() {
  // ── List migrations in alphabetical order ───────────────────
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrate] No .sql files found in', MIGRATIONS_DIR);
    process.exit(0);
  }

  console.log(`\n[migrate] Found ${files.length} migration(s):\n`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  });

  await client.connect();
  console.log('[migrate] ✅  Connected to database\n');

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql      = fs.readFileSync(filePath, 'utf8');

    process.stdout.write(`  Running ${file} ... `);

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅  OK');
      passed++;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {}); // ignore rollback errors
      console.log(`❌  FAILED\n`);
      console.error(`    Error in ${file}:`);
      console.error(`    ${err.message}`);
      if (err.position) {
        // Show a snippet of SQL around the error position
        const pos     = parseInt(err.position, 10);
        const snippet = sql.slice(Math.max(0, pos - 120), pos + 120).replace(/\n/g, ' ');
        console.error(`    Near: ...${snippet}...`);
      }
      console.error('');
      failed++;
      break; // Stop on first failure — fix and re-run
    }
  }

  await client.end();

  console.log(`\n[migrate] Done — ${passed} succeeded, ${failed} failed.\n`);

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[migrate] Fatal error:', err.message);
  process.exit(1);
});
