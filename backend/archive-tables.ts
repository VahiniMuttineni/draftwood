import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://executiveflow:ef_password@localhost:5432/executiveflow_db',
});

async function run() {
  await client.connect();
  console.log('Connected to DB');

  const tablesToRename = [
    'documents',
    'document_versions',
    'workflow_history',
    'document_requests',
    'audit_logs',
    'comments',
    'tags',
    'document_tags',
    'notifications',
    'notification_reads'
  ];

  for (const table of tablesToRename) {
    try {
      await client.query(`ALTER TABLE ${table} RENAME TO ${table}_archive;`);
      console.log(`Renamed ${table} to ${table}_archive`);
    } catch (e) {
      console.log(`Failed to rename ${table} (maybe already renamed?): ${e.message}`);
    }
  }

  await client.end();
}

run().catch(console.error);
