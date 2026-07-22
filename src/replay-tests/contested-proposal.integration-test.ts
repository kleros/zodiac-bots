import { EventType } from "../notify";
import { findUsedTransports } from "../services/db/notifications";
import { findProposalByQuestionId } from "../services/db/proposals";
import { expect, getMails } from "../utils/tests-setup";
import { CONTESTED_PROPOSAL } from "./fixtures";
import { expectEmailDelivered, setupReplay, settle } from "./replay";

// A proposal from February 2026 that got several competing answers in separate transactions. This
// was a normal dispute, not an attack. It confirms the usual question then answer path still
// notifies.
describe("Replay: a normal contested proposal", function () {
  this.timeout(90000);
  const replay = setupReplay([CONTESTED_PROPOSAL.questionId]);

  it("notifies the question and its answer", async () => {
    const before = await getMails();

    await replay.processBlock(CONTESTED_PROPOSAL.questionBlock);
    await settle();

    const proposal = await findProposalByQuestionId(CONTESTED_PROPOSAL.questionId);
    expect(proposal, "contested question registered as active").to.not.be.null;

    // Its Snapshot data is only partly available now, so it lands on incomplete-data rather than
    // valid. Either way it must be a normal proposal notification, not a security alert.
    const proposalNotification = replay.captured().find((n) => n.event.questionId === CONTESTED_PROPOSAL.questionId);
    expect(proposalNotification?.type, "issued a normal proposal notification, not an alert").to.be.oneOf([
      EventType.PROPOSAL_QUESTION_VALID,
      EventType.PROPOSAL_QUESTION_INCOMPLETE_DATA,
    ]);

    await replay.processBlock(CONTESTED_PROPOSAL.answerBlock);
    await settle();

    const [answerTransports, after] = await Promise.all([
      findUsedTransports(CONTESTED_PROPOSAL.answerTxHash, CONTESTED_PROPOSAL.answerLogIndex),
      getMails(),
    ]);
    expect(answerTransports, "email recorded for the contested answer log").to.include("email");

    const answerNotification = replay
      .captured()
      .find((n) => n.event.questionId === CONTESTED_PROPOSAL.questionId && n.type === EventType.NEW_ANSWER);
    expect(answerNotification, "issued an answer notification").to.exist;

    await Promise.all([
      expectEmailDelivered(proposalNotification!, before, after),
      expectEmailDelivered(answerNotification!, before, after),
    ]);
    expect(after.length, "exactly the proposal and the answer email delivered").to.equal(before.length + 2);
  });
});
