import { sql } from "drizzle-orm";
import { NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../utils/env";
import * as schema from "./schema";

export type DBConnection = {
  pool: Pool;
  db: NodePgDatabase<typeof schema>;
};

let connection: DBConnection | undefined;

/**
 * Configures the PostgreSQL connection and Drizzle.
 *
 * @param uri - The PostgreSQL connection string
 *
 * @example
 *
 * const connection = conect('postgres://user:pass@localhost:5432/db');
 */
export const connect = (uri: string = env.DB_URI): DBConnection => {
  const pool = new Pool({
    connectionString: uri,
  });

  const db = drizzle(pool, {
    schema,
    // When true, logs all SQL queries to the console
    logger: env.DB_DEBUG,
  });

  return { pool, db };
};

/**
 * Gets the DBConnection singleton instance.
 */
export const getConnection = (): DBConnection => {
  if (!connection) {
    connection = connect();
  }

  return connection;
};

/**
 * Tests the database connection and credentials.
 *
 * @param connection - The DBConnection instance
 * @returns True if the connection is successful. If it is not successful, an error is thrown.
 *
 * @example
 *
 * await test(conection);
 * // Now we know the connection is working, we can operate on the database
 */
export const test = async (connection: DBConnection) => {
  // This statement should be enough to validate if the host is reachable, credentials right, etc.
  const { rows } = await connection.db.execute(sql.raw("SELECT 1+1 AS RESULT"));
  return rows[0].result === 2;
};

/**
 * Closes the connection to the database.
 *
 * @param connection - The DBConnection instance
 *
 * @example
 *
 * await disconnect(conection);
 */
export const disconnect = async (connection: DBConnection) => {
  await connection.pool.end();
};
