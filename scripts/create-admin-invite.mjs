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

// PBKDF2 helpers matching src/lib/settingsStore.ts
const ITERATIONS = 210_000;
const enc = new TextEncoder();

const toBase64 = (bytes) => {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

async function derive(secret, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256)
  );
}

async function hashSecretSalted(secret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(secret, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

async function run() {
  const adminCode = process.argv[2] || "virtus-admin-2026";
  console.log(`Setting admin invite code to: "${adminCode}"...`);

  // Ensure app_settings table exists
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const hashed = await hashSecretSalted(adminCode);
  const payload = {
    value: hashed,
    updatedAt: new Date().toISOString(),
    updatedBy: "system-bootstrap",
  };

  await sql`
    INSERT INTO app_settings (key, value, updated_at) 
    VALUES ('inviteAdmin', ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  `;

  console.log('SUCCESS: Admin invite code has been saved into live database!');
  console.log(`Your Admin Invite Code is: ${adminCode}`);
  console.log(`Direct registration URL: https://virtuswebsite.vercel.app/staff/register#code=${adminCode}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
