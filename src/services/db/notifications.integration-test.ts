import { InferInsertModel, and, eq } from "drizzle-orm";
import { TransportName, transports } from "../../notify";
import { expect, mocks } from "../../utils/tests-setup";
import { getConnection } from "./connection";
import { findUsedTransports, insertUsedTransport } from "./notifications";
import * as schema from "./schema";

const transportNames = Object.keys(transports) as TransportName[];

describe("Notification model", () => {
  const { db } = getConnection();
  describe("insertUsedTransport", () => {
    const fn = insertUsedTransport;

    transportNames.forEach((transportName) => {
      it(`should create a record with ${transportName} as transport`, async () => {
        const notification = mocks.randomizeProposalNotification();

        await fn(notification, transportName);

        const inserted = await db
          .select()
          .from(schema.notification)
          .where(
            and(
              eq(schema.notification.txHash, notification.event.txHash),
              eq(schema.notification.transportName, transportName),
            ),
          );

        expect(inserted).to.have.lengthOf(1);
      });
    });
  });

  describe("findUsedTransports", () => {
    const fn = findUsedTransports;

    it("should return the transports that have already been involved in a transaction notification", async () => {
      const presentTransports = transportNames.slice(0, -1);
      const proposal = mocks.randomizeProposalNotification();
      const insertedNotifications: InferInsertModel<typeof schema.notification>[] = presentTransports.map(
        (transportName) => ({
          transportName,
          txHash: proposal.event.txHash,
          block: proposal.event.blockNumber,
        }),
      );
      await db.insert(schema.notification).values(insertedNotifications);

      const result = await fn(proposal.event.txHash);
      expect(result).to.deep.eq(presentTransports);
    });

    it("should return empty array if no spaces are found", async () => {
      const result = await fn(`0x0000000000000000000000000000000000000000000000000000000000000000`);
      expect(result).to.have.lengthOf(0);
    });
  });
});
