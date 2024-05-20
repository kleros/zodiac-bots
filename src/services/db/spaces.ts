import { InferInsertModel, eq, inArray, type InferSelectModel } from "drizzle-orm";
import { getConnection } from "./connection";
import * as schema from "./schema";

export type FindSpacesFn = (enss: string[]) => Promise<InferSelectModel<typeof schema.space>[]>;
/**
 * Given a list of ENS, returns the persisted spaces.
 *
 * @param enss - ENS list
 * @returns List of persisted spaces
 *
 * @example
 * const spaces = await findSpaces(['kleros.eth', '1inch.eth']);
 */
export const findSpaces: FindSpacesFn = async (enss) => {
  const { db } = getConnection();
  return db.select().from(schema.space).where(inArray(schema.space.ens, enss));
};

export type InsertSpacesFn = (spaces: InferInsertModel<typeof schema.space>[]) => Promise<void>;
/**
 * Given a list of spaces, persist them into the DB.
 *
 * @param spaces - List of spaces
 *
 * @example
 *
 * await insertSpaces([space1, space2, space3]);
 */
export const insertSpaces: InsertSpacesFn = async (spaces) => {
  const { db } = getConnection();
  await db.insert(schema.space).values(spaces);
};

export type UpdateSpaceFn = (ens: string, lastProcessedBlock: bigint) => Promise<void>;
/**
 * Update the persisted space with the given last processed block.
 *
 * @param ens - ENS of the space
 * @param lastProcessedBlock - Last processed block
 *
 * @example
 *
 * await updateSpace('kleros.eth', 12345n);
 */
export const updateSpace = async (ens: string, lastProcessedBlock: bigint) => {
  const { db } = getConnection();
  await db.update(schema.space).set({ lastProcessedBlock }).where(eq(schema.space.ens, ens));
};
