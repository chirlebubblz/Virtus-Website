import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { neon } from '@neondatabase/serverless';

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is not set in environment or .env.local');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  try {
    console.log('Connecting to Neon PostgreSQL...');
    const existing = await sql`
      SELECT id, client_name, company, email, date, time, meeting_url, status
      FROM bookings
      ORDER BY created_at DESC;
    `;
    console.log(`Found ${existing.length} booking(s):`);
    console.log(JSON.stringify(existing, null, 2));

    const updated = await sql`
      UPDATE bookings
      SET meeting_url = 'https://zoom.us/j/2842703476'
      WHERE id = 'book-28e68b107f6d43af' OR lower(email) = 'brandon@legendsacquisitions.com'
      RETURNING id, client_name, email, meeting_url;
    `;
    console.log('\nUpdated booking record(s):', JSON.stringify(updated, null, 2));

    // Also update opportunity message if applicable
    const opps = await sql`
      SELECT id, name, company, email, message
      FROM opportunities
      WHERE lower(email) = 'brandon@legendsacquisitions.com';
    `;
    if (opps.length > 0) {
      console.log('\nFound associated opportunity in Neon:', JSON.stringify(opps, null, 2));
      const updatedOpps = await sql`
        UPDATE opportunities
        SET message = REPLACE(message, 'https://meet.google.com/tvl-disc-cyl35', 'https://zoom.us/j/2842703476')
        WHERE lower(email) = 'brandon@legendsacquisitions.com'
        RETURNING id, name, message;
      `;
      console.log('Updated opportunity:', JSON.stringify(updatedOpps, null, 2));
    }
  } catch (err) {
    console.error('Error updating booking:', err);
    process.exit(1);
  }
}

run();
