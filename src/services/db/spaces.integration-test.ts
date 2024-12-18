import { inArray } from "drizzle-orm";
import { expect } from "../../utils/tests-setup";
import { getConnection } from "./connection";
import * as schema from "./schema";
import { findSpaces, insertSpaces } from "./spaces";

const generateFakeSpace = () => ({
  ens: `testspace${Math.floor(Math.random() * 1000)}.eth`,
  startBlock: BigInt(Math.floor(Math.random() * 9000)),
  lastProcessedBlock: null,
});

describe("Space model", () => {
  const { db } = getConnection();

  describe("findSpaces", () => {
    const fn = findSpaces;

    it("should return the spaces", async () => {
      // Populate the table with some spaces
      const fakeSpaces = [generateFakeSpace(), generateFakeSpace(), generateFakeSpace()];
      await db.insert(schema.space).values(fakeSpaces);

      const enss = fakeSpaces.map((space) => space.ens);
      const result = await fn(enss);
      expect(result).to.deep.eq(fakeSpaces);
    });

    it("should return empty array if no spaces are found", async () => {
      const enss = ["no-such-space.eth", "this-space-is-not-found.eth"];
      const result = await fn(enss);
      expect(result).to.have.lengthOf(0);
    });
  });

  describe("insertSpaces", () => {
    const fn = insertSpaces;

    it("should create rows for every space", async () => {
      const fakeSpaces = [generateFakeSpace(), generateFakeSpace(), generateFakeSpace()];

      await fn(fakeSpaces);

      const inserted = await db
        .select()
        .from(schema.space)
        .where(
          inArray(
            schema.space.ens,
            fakeSpaces.map((space) => space.ens),
          ),
        );

      expect(inserted).to.deep.eq(fakeSpaces);
    });
  });
});
