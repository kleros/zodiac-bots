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

    it("should return the transports that have already sent a notification for the given log", async () => {
      const presentTransports = transportNames.slice(0, -1);
      const proposal = mocks.randomizeProposalNotification();
      const insertedNotifications: InferInsertModel<typeof schema.notification>[] = presentTransports.map(
        (transportName) => ({
          transportName,
          txHash: proposal.event.txHash,
          logIndex: proposal.event.logIndex,
          block: proposal.event.blockNumber,
        }),
      );
      await db.insert(schema.notification).values(insertedNotifications);

      const result = await fn(proposal.event.txHash, proposal.event.logIndex);
      expect(result).to.have.members(presentTransports);
    });

    it("should scope the result to the log index, not the whole transaction", async () => {
      const txHash = mocks.getRandomHash();
      const questionLogIndex = 43;
      const answerLogIndex = 44;
      await db.insert(schema.notification).values([
        { transportName: transportNames[0], txHash, logIndex: questionLogIndex, block: 50n },
        { transportName: transportNames[1], txHash, logIndex: answerLogIndex, block: 50n },
      ]);

      const [questionResult, answerResult] = await Promise.all([
        fn(txHash, questionLogIndex),
        fn(txHash, answerLogIndex),
      ]);

      expect(questionResult).to.deep.eq([transportNames[0]]);
      expect(answerResult).to.deep.eq([transportNames[1]]);
    });

    it("should return empty array if no notification is found for the log", async () => {
      const result = await fn(`0x0000000000000000000000000000000000000000000000000000000000000000`, 0);
      expect(result).to.have.lengthOf(0);
    });
  });
});
