import { eq } from "drizzle-orm";
import type { Hash } from "viem";
import type { ValidProposalNotification } from "../../notify";
import type { Space } from "../../types";
import { getRandomHash, randomizeProposal, randomizeProposalNotification, randomizeSpace } from "../../utils/test-mocks";
import { expect } from "../../utils/tests-setup";
import { getConnection } from "./connection";
import { findProposalByQuestionId, insertProposal, removeProposalByQuestionId } from "./proposals";
import * as schema from "./schema";
import { insertSpaces } from "./spaces";

const randomizeProposalFromNotification = (notification: ValidProposalNotification) =>
  randomizeProposal({
    ens: notification.space.ens,
    questionId: notification.event.questionId,
    proposalId: notification.event.proposalId,
    txHash: notification.event.txHash,
    happenedAt: notification.event.happenedAt,
  });

describe("Active Proposals model", () => {
  const { db } = getConnection();

  let space: Space;
  before(async () => {
    space = randomizeSpace();
    await insertSpaces([space]);
  });

  describe("insertProposal", () => {
    const fn = insertProposal;

    it("should insert a proposal", async () => {
      const notification = randomizeProposalNotification({ space });
      const fields = randomizeProposalFromNotification(notification);
      await fn(fields);

      const inserted = await db
        .select()
        .from(schema.proposal)
        .where(eq(schema.proposal.questionId, fields.questionId));

      expect(inserted).to.be.length(1);

      const storedProposal = inserted[0];
      expect(storedProposal.createdAt).to.exist;
      expect(storedProposal).to.eql({
        ...fields,
        createdAt: storedProposal.createdAt,
      });
    });

    it("should persist two questions that share a proposalId (re-ask / reuse) without orphaning either", async () => {
      const proposalId = getRandomHash();
      const first = randomizeProposal({ ens: space.ens, proposalId });
      const second = randomizeProposal({ ens: space.ens, proposalId });

      await fn(first);
      await fn(second);

      const [firstStored, secondStored] = await Promise.all([
        findProposalByQuestionId(first.questionId as Hash),
        findProposalByQuestionId(second.questionId as Hash),
      ]);
      expect(firstStored).to.be.not.null;
      expect(secondStored).to.be.not.null;
    });

    it("should be idempotent when the same question is processed twice", async () => {
      const proposal = randomizeProposal({ ens: space.ens });

      await fn(proposal);
      await fn(proposal);

      const stored = await db
        .select()
        .from(schema.proposal)
        .where(eq(schema.proposal.questionId, proposal.questionId));
      expect(stored).to.be.length(1);
    });
  });

  describe("findProposalByQuestionId", () => {
    const fn = findProposalByQuestionId;

    it("should return an existing proposal", async () => {
      const notification = randomizeProposalNotification({ space });
      const fields = randomizeProposalFromNotification(notification);
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
      const fields = randomizeProposalFromNotification(notification);
      await insertProposal(fields);

      await fn(fields.questionId as Hash);

      const found = await findProposalByQuestionId(fields.questionId as Hash);
      expect(found).to.be.null;
    });
  });
});