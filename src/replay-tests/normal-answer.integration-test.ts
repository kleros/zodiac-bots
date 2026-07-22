import { EventType } from "../notify";
import { findUsedTransports } from "../services/db/notifications";
import { insertProposal } from "../services/db/proposals";
import { randomizeProposal } from "../utils/test-mocks";
import { expect, getMails } from "../utils/tests-setup";
import { NORMAL_ANSWER } from "./fixtures";
import { expectEmailDelivered, setupReplay, settle } from "./replay";

// A normal answer from April 2024 to a question the bot already knows about. It checks that when an
// answer matches a stored proposal the bot sends one answer notification.
describe("Replay: a normal answer", function () {
  this.timeout(90000);
  const replay = setupReplay([NORMAL_ANSWER.questionId]);

  it("notifies a normal answer matched to a known proposal", async () => {
    await insertProposal(randomizeProposal({ ens: replay.space().ens, questionId: NORMAL_ANSWER.questionId }));

    const before = await getMails();

    await replay.processBlock(NORMAL_ANSWER.block);
    await settle();

    const [usedTransports, after] = await Promise.all([
      findUsedTransports(NORMAL_ANSWER.txHash, NORMAL_ANSWER.logIndex),
      getMails(),
    ]);

    expect(usedTransports, "email recorded for the answer log").to.include("email");

    const notification = replay.captured().find((n) => n.event.questionId === NORMAL_ANSWER.questionId);
    expect(notification?.type, "issued an answer notification").to.equal(EventType.NEW_ANSWER);

    await expectEmailDelivered(notification!, before, after);
    expect(after.length, "exactly one email delivered").to.equal(before.length + 1);
  });
});
