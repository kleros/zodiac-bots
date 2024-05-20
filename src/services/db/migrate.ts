import { migrate as drizzleMigrate } from "drizzle-orm/postgres-js/migrator";
import config from "./config";
import { disconnect, getConnection, type DBConnection } from "./connection";

export const MIGRATIONS_TABLE = "_zodiac_bots_migrations";

/**
 * Ensures the database is up-to-date with the migrations folder.
 *
 * @param connection - The database connection to use.
 * @example
 *
 * const connection = connect('postgres://user:password@localhost/db');
 * await migrate(connection);
 */
export const migrate = async (connection: DBConnection) => {
  await drizzleMigrate(connection.db, {
    migrationsFolder: config.out,
    migrationsTable: MIGRATIONS_TABLE,
  });
};

/**
 * When run directly, migrate the database.
 */
if (require.main === module) {
  const connection = getConnection();
  migrate(connection).finally(() => disconnect(connection));
}
