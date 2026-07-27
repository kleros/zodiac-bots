import { EventType } from "../notify";
import { findUsedTransports } from "../services/db/notifications";
import { findProposalByQuestionId } from "../services/db/proposals";
import { expect, getMails } from "../utils/tests-setup";
import { ORIGINAL_QUESTION, REUSED_PROPOSAL_ID } from "./fixtures";
import { expectEmailDelivered, setupReplay, settle } from "./replay";

// In May 2026 an attacker reused a real proposal's id on a fake question, so both landed on the same
// stored key. The old schema stored proposals under that key, so the fake question saved nothing and
// was never recorded. Its answer arrived later with no matching proposal, so the bot dropped it.
//
// This test replays the real question, then the reuse, and checks three things:
//   1. the reuse is stored on its own and is not lost
//   2. it raises a security alert, because its content does not match the proposal it claims to be
//   3. its answer notifies
describe("Replay: a question that reuses another proposal's id", function () {
  this.timeout(90000);
  const replay = setupReplay([ORIGINAL_QUESTION.questionId, REUSED_PROPOSAL_ID.questionId]);

  it("does not lose the reusing question, raises an alert, and still notifies its answer", async () => {
    const before = await getMails();

    await replay.processBlock(ORIGINAL_QUESTION.block);
    await replay.processBlock(REUSED_PROPOSAL_ID.questionBlock);
    await settle();

    const [original, reused] = await Promise.all([
      findProposalByQuestionId(ORIGINAL_QUESTION.questionId),
      findProposalByQuestionId(REUSED_PROPOSAL_ID.questionId),
    ]);
    expect(original, "original question persisted").to.not.be.null;
    expect(reused, "reused-proposalId question persisted (not overwritten)").to.not.be.null;

    const alert = replay
      .captured()
      .find((n) => n.type === EventType.PROPOSAL_QUESTION_ALERT && n.event.questionId === REUSED_PROPOSAL_ID.questionId);
    expect(alert, "reused-proposalId question raised a security alert").to.exist;

    const originalNotification = replay.captured().find((n) => n.event.questionId === ORIGINAL_QUESTION.questionId);
    expect(originalNotification?.type, "issued a valid-proposal notification for the original").to.equal(
      EventType.PROPOSAL_QUESTION_VALID,
    );

    await replay.processBlock(REUSED_PROPOSAL_ID.answerBlock);
    await settle();

    const [answerTransports, after] = await Promise.all([
      findUsedTransports(REUSED_PROPOSAL_ID.answerTxHash, REUSED_PROPOSAL_ID.answerLogIndex),
      getMails(),
    ]);
    expect(answerTransports, "the answer that was dropped before the fix notified").to.include("email");

    const answerNotification = replay
      .captured()
      .find((n) => n.event.questionId === REUSED_PROPOSAL_ID.questionId && n.type === EventType.NEW_ANSWER);
    expect(answerNotification, "issued an answer notification for the reused-id question").to.exist;

    await Promise.all([
      expectEmailDelivered(originalNotification!, before, after),
      expectEmailDelivered(alert!, before, after),
      expectEmailDelivered(answerNotification!, before, after),
    ]);
    expect(after.length, "exactly the two questions and the answer email delivered").to.equal(before.length + 3);
  });
});
