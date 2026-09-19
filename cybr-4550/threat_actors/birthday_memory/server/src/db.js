import pg from 'pg';

// `birthdate` is a DATE column. node-postgres parses DATE into a JS Date in the
// server's local timezone, which can shift the day by one. Keep it as a string.
pg.types.setTypeParser(1082, (value) => value);

const {
  DATABASE_URL,
  PGHOST = 'localhost',
  PGPORT = '5544',
  PGUSER = 'bm_app',
  PGPASSWORD,
  PGDATABASE = 'thebirthdates',
  PGSSL,
} = process.env;

// Fail closed: never fall back to a hardcoded/default database password.
if (!DATABASE_URL && !PGPASSWORD) {
  console.error(
    '[db] No database password configured. Set PGPASSWORD (or DATABASE_URL) ' +
    'in server/.env. Refusing to start with an implicit/blank credential.',
  );
  process.exit(1);
}

const ssl = PGSSL === 'true' ? { rejectUnauthorized: true } : undefined;

export const pool = DATABASE_URL
  ? new pg.Pool({ connectionString: DATABASE_URL, ssl })
  : new pg.Pool({
      host: PGHOST,
      port: Number(PGPORT),
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      ssl,
      max: 10,
      // Bound how long a single statement may run: caps a runaway/DoS query.
      statement_timeout: 5000,
    });

pool.on('error', (error) => {
  console.error('[db] unexpected pool error:', error.message);
});

/**
 * Verifies the expected schema exists. The low-privilege application role has
 * no DDL rights, so the table/role/grants are created once at container init by
 * db/init/01-schema.sh. This function only confirms the app can reach its table.
 */
export async function assertSchema() {
  const { rows } = await pool.query(
    `SELECT to_regclass('public.birthdays') IS NOT NULL AS present`,
  );
  if (!rows[0]?.present) {
    throw new Error(
      'Table "birthdays" is missing. Recreate the DB container so the init ' +
      'script runs, or apply db/init/01-schema.sh against an existing database.',
    );
  }
}

export function mapRow(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthdate: row.birthdate,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
