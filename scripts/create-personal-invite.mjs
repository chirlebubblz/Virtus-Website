import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { neon } from '@neondatabase/serverless';

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

// Token helpers matching src/lib/tokens.ts and src/lib/staffAuth.ts
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function newSecretToken(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `${prefix}_${toHex(bytes)}`;
}

async function hashSecret(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const newId = (prefix) => `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function run() {
  const email = "jerafisabalo@gmail.com";
  const role = "admin";
  const token = newSecretToken("stfinv");
  const tokenHash = await hashSecret(token);
  const id = newId("inv");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  await sql`
    INSERT INTO staff_invites (id, token_hash, email, role, created_by, expires_at)
    VALUES (${id}, ${tokenHash}, ${email}, ${role}, 'system-bootstrap', ${expiresAt}::timestamptz);
  `;

  console.log('SUCCESS: Personal Admin Invite created in Neon!');
  console.log('Target Email:', email);
  console.log('Role:', role);
  console.log('Token:', token);
  console.log(`Direct Link: https://virtuswebsite.vercel.app/staff/register?invite=${token}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
