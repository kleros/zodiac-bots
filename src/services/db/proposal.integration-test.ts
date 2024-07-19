import { eq } from "drizzle-orm";
import type { Hash } from "viem";
import type { ProposalNotification } from "../../notify";
import type { Space } from "../../types";
import { randomizeProposalNotification, randomizeSpace } from "../../utils/test-mocks";
import { expect } from "../../utils/tests-setup";
import { getConnection } from "./connection";
import {
  type InsertableProposal,
  findProposalByQuestionId,
  insertProposal,
  removeProposalByQuestionId,
} from "./proposals";
import * as schema from "./schema";
import { insertSpaces } from "./spaces";

describe("Active Proposals model", () => {
  const { db } = getConnection();

  let space: Space;
  before(async () => {
    space = randomizeSpace();
    await insertSpaces([space]);
  });

  const randomizeProposal = (notification: ProposalNotification): InsertableProposal => ({
    ens: notification.space.ens,
    questionId: notification.event.questionId,
    proposalId: notification.event.proposalId,
    txHash: notification.event.txHash,
    happenedAt: notification.event.happenedAt,
  });
  describe("insertProposal", () => {
    const fn = insertProposal;

    it("should insert a proposal", async () => {
      const notification = randomizeProposalNotification({ space });
      const fields = randomizeProposal(notification);
      await fn(fields);

      const inserted = await db.select().from(schema.proposal).where(eq(schema.proposal.questionId, fields.questionId));

      expect(inserted).to.be.length(1);

      const storedProposal = inserted[0];
      expect(storedProposal.createdAt).to.exist;
      expect(storedProposal).to.eql({
        ...fields,
        createdAt: storedProposal.createdAt,
      });
    });
  });

  describe("findProposalByQuestionId", () => {
    const fn = findProposalByQuestionId;

    it("should return an existing proposal", async () => {
      const notification = randomizeProposalNotification({ space });
      const fields = randomizeProposal(notification);
      await insertProposal(fields);

      const result = await fn(fields.questionId as Hash);

      expect(result).to.be.not.null;

      const { createdAt, ...proposal } = result!;
      expect(createdAt).to.exist;
      expect(proposal).to.eql(fields);
    });

    it("should return null if it does not exist", async () => {
      const result = await fn("0xtest");

      expect(result).to.be.null;
    });
  });

  describe("removeProposal", () => {
    const fn = removeProposalByQuestionId;

    it("should return an existing proposal", async () => {
      const notification = randomizeProposalNotification({ space });
      const fields = randomizeProposal(notification);
      await insertProposal(fields);

      await fn(fields.questionId as Hash);

      const found = await findProposalByQuestionId(fields.questionId as Hash);
      expect(found).to.be.null;
    });
  });
});
