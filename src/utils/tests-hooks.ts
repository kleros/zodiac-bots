import { sql } from "drizzle-orm";
import { disconnect, getConnection } from "../services/db/connection";

const clearTablesQuery = `
DO
$$
DECLARE
    table_name text;
BEGIN
    -- Loop through all user tables
    FOR table_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE;', table_name);
    END LOOP;
END;
$$;

`;

export const mochaHooks = {
  beforeAll() {
    // Clear database to make tests idempotent
    const connection = getConnection();
    return connection.db.execute(sql.raw(clearTablesQuery));
  },
  afterAll() {
    // Disconnect from the database
    return disconnect(getConnection());
  },
};
