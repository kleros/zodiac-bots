import { EventType } from "../notify";
import { findUsedTransports } from "../services/db/notifications";
import { findProposalByQuestionId } from "../services/db/proposals";
import { expect, getMails } from "../utils/tests-setup";
import { NORMAL_PROPOSAL } from "./fixtures";
import { expectEmailDelivered, setupReplay, settle } from "./replay";

// A normal governance proposal from March 2024, with no attack. It checks the basic case: when the
// bot reads a proposal from a real block it sends one proposal notification. It is the baseline the
// attack scenarios build on.
describe("Replay: a normal proposal", function () {
  this.timeout(90000);
  const replay = setupReplay([NORMAL_PROPOSAL.questionId]);

  it("notifies a normal proposal decoded from a real block", async () => {
    const before = await getMails();

    await replay.processBlock(NORMAL_PROPOSAL.block);
    await settle();

    const [proposal, usedTransports, after] = await Promise.all([
      findProposalByQuestionId(NORMAL_PROPOSAL.questionId),
      findUsedTransports(NORMAL_PROPOSAL.txHash, NORMAL_PROPOSAL.logIndex),
      getMails(),
    ]);

    expect(proposal, "proposal registered as active").to.not.be.null;
    expect(usedTransports, "email recorded for the proposal log").to.include("email");

    const notification = replay.captured().find((n) => n.event.questionId === NORMAL_PROPOSAL.questionId);
    expect(notification?.type, "issued a valid-proposal notification").to.equal(EventType.PROPOSAL_QUESTION_VALID);

    await expectEmailDelivered(notification!, before, after);
    expect(after.length, "exactly one email delivered").to.equal(before.length + 1);
  });
});
