import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { neon } from '@neondatabase/serverless';

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is not set in environment or .env.local');
  process.exit(1);
}

console.log('Connecting to Neon Database...');
const sql = neon(databaseUrl);

async function run() {
  try {
    const test = await sql`SELECT current_database() as db, NOW() as time`;
    console.log(`Connected successfully to database: ${test[0].db} at ${test[0].time}`);

    console.log('Initializing agency and staff tables...');

    // 1. Clients
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        company VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(64) DEFAULT 'Active',
        total_revenue NUMERIC DEFAULT 0,
        active_projects_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        portal_token VARCHAR(64) UNIQUE,
        portal_token_hash VARCHAR(64) UNIQUE,
        portal_token_last4 VARCHAR(8),
        portal_token_expires_at TIMESTAMPTZ,
        portal_token_revoked_at TIMESTAMPTZ
      );
    `;

    // 2. Opportunities
    await sql`
      CREATE TABLE IF NOT EXISTS opportunities (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        stage VARCHAR(64) NOT NULL,
        deal_value NUMERIC NOT NULL,
        recommended_tier VARCHAR(64) NOT NULL,
        needs JSONB DEFAULT '[]'::jsonb,
        timeline VARCHAR(128),
        phone VARCHAR(64),
        budget_bracket VARCHAR(128),
        message TEXT,
        deliverables JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 3. Projects
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(64) PRIMARY KEY,
        client_id VARCHAR(64),
        client_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        phase VARCHAR(64) NOT NULL,
        progress INT DEFAULT 0,
        risk_level VARCHAR(64) DEFAULT 'On Track',
        budget NUMERIC DEFAULT 0,
        start_date DATE,
        target_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 4. Tasks
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64),
        project_title VARCHAR(255),
        title TEXT NOT NULL,
        assignee VARCHAR(255) NOT NULL,
        status VARCHAR(64) DEFAULT 'todo',
        priority VARCHAR(64) DEFAULT 'medium',
        due_date VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 5. Invoices
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(64) PRIMARY KEY,
        client_id VARCHAR(64),
        client_name VARCHAR(255) NOT NULL,
        invoice_number VARCHAR(64) NOT NULL,
        amount NUMERIC NOT NULL,
        status VARCHAR(64) DEFAULT 'Pending',
        due_date DATE,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 6. Bookings
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(64) PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        booking_type VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time VARCHAR(128) NOT NULL,
        host VARCHAR(255) NOT NULL,
        meeting_url TEXT NOT NULL,
        status VARCHAR(64) DEFAULT 'Confirmed',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 7. Proposals
    await sql`
      CREATE TABLE IF NOT EXISTS proposals (
        id VARCHAR(64) PRIMARY KEY,
        proposal_number VARCHAR(64) NOT NULL,
        client_id VARCHAR(64),
        client_name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC NOT NULL,
        status VARCHAR(64) DEFAULT 'Sent',
        valid_until DATE,
        scope_summary JSONB DEFAULT '[]'::jsonb,
        timeline VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 8. Contracts
    await sql`
      CREATE TABLE IF NOT EXISTS contracts (
        id VARCHAR(64) PRIMARY KEY,
        contract_number VARCHAR(64) NOT NULL,
        client_id VARCHAR(64),
        client_name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        contract_type VARCHAR(128) NOT NULL,
        value NUMERIC DEFAULT 0,
        status VARCHAR(64) DEFAULT 'Draft',
        signed_at TIMESTAMPTZ,
        signer_name VARCHAR(255),
        signer_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 9. Activity Logs
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        description TEXT NOT NULL,
        category VARCHAR(64) NOT NULL,
        timestamp VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 10. Client Revisions
    await sql`
      CREATE TABLE IF NOT EXISTS client_revisions (
        id VARCHAR(64) PRIMARY KEY,
        client_id VARCHAR(64) NOT NULL,
        round INT NOT NULL,
        categories JSONB DEFAULT '[]'::jsonb,
        target_area VARCHAR(255),
        priority VARCHAR(32) NOT NULL,
        details TEXT NOT NULL,
        reference_url TEXT,
        attachments JSONB DEFAULT '[]'::jsonb,
        submitted_by VARCHAR(255),
        submitted_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS client_revisions_client_idx ON client_revisions (client_id);`;

    // 11. Client Approvals
    await sql`
      CREATE TABLE IF NOT EXISTS client_approvals (
        client_id VARCHAR(64) PRIMARY KEY,
        status VARCHAR(32) NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 12. Staff Users
    await sql`
      CREATE TABLE IF NOT EXISTS staff_users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(16) NOT NULL,
        member_label VARCHAR(120),
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        session_version INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );
    `;

    // 13. Staff Invites
    await sql`
      CREATE TABLE IF NOT EXISTS staff_invites (
        id VARCHAR(64) PRIMARY KEY,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        email VARCHAR(255),
        role VARCHAR(16) NOT NULL,
        created_by VARCHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ
      );
    `;

    // 14. Staff Resets
    await sql`
      CREATE TABLE IF NOT EXISTS staff_resets (
        id VARCHAR(64) PRIMARY KEY,
        staff_id VARCHAR(64) NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ
      );
    `;

    // 15. Staff Audit
    await sql`
      CREATE TABLE IF NOT EXISTS staff_audit (
        id VARCHAR(64) PRIMARY KEY,
        actor VARCHAR(255) NOT NULL,
        action VARCHAR(64) NOT NULL,
        target VARCHAR(255) NOT NULL,
        at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 16. Verify tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log('Tables currently in Neon database:');
    tables.forEach((t) => console.log(' - ' + t.table_name));

    console.log('Neon Database Schema successfully created and verified!');
  } catch (err) {
    console.error('Error during database initialization:', err);
    process.exit(1);
  }
}

run();
