import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env file');
}

// A separate, single-use connection for running migrations
const migrationClient = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // Only one connection is needed for the migration process
});

const db = drizzle(migrationClient);

async function main() {
  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrations completed successfully!');
}

main()
  .catch((err) => {
    console.error('Error running migrations:', err);
    process.exit(1);
  })
  .finally(() => {
    console.log('Closing migration client.');
    migrationClient.end();
  });
