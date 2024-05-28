import { sql } from "drizzle-orm";
import { readdir } from "fs/promises";
import { env } from "../../utils/env";
import { expect } from "../../utils/tests-setup";
import config from "./config";
import { connect, getConnection } from "./connection";
import { MIGRATIONS_TABLE, migrate } from "./migrate";

describe("migrate", () => {
  const fn = migrate;
  const defaultConnection = getConnection();

  it("should correctly apply all the migrations", async () => {
    // Create a new database in a clean state
    const newDB = `testmigrations${Math.floor(Math.random() * 10000)}`;
    const newUri = new URL(env.DB_URI);
    newUri.pathname = newDB;
    const query = sql.raw(`CREATE DATABASE ${newDB};`);
    await defaultConnection.db.execute(query);

    // Migrate
    const connection = connect(newUri.toString());
    await fn(connection);

    // Get the amount of applied migrations
    const appliedMigrations = await connection.db.execute(
      sql.raw(`SELECT COUNT(*) AS migrated FROM drizzle.${MIGRATIONS_TABLE};`),
    );
    const { migrated } = appliedMigrations.rows[0];

    // Get the amount of expected migrations to be applied
    const migrations = await readdir(config.out);
    const expected = migrations.filter((file) => file.endsWith(".sql")).length;

    expect(Number(migrated)).to.equal(expected);

    // Why checking that all migrations were applied? Shouldn't that be
    // an ORM responsibility?
    //
    // Drizzle-Kit uses a meta directory which lists the migrations to
    // be applied. If the JSON inside becomes loses an entry, the sql
    // migration will not be read. This test ensures the code is well
    // interfaced with Drizzle-Kit AND the meta state is valid.
  });
});
