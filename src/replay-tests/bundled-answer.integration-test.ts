import { EventType } from "../notify";
import { findUsedTransports } from "../services/db/notifications";
import { expect, getMails } from "../utils/tests-setup";
import { BUNDLED_ANSWER } from "./fixtures";
import { expectEmailDelivered, setupReplay, settle } from "./replay";

// In July 2026 an attacker created a governance question and answered it in the same transaction.
// The old de-duplication used only the transaction hash, so the question's notification took the
// single slot for that transaction and the answer got nothing. No channel sent it, and the answer
// was the part that mattered. This test replays that block and checks that both the question
// (log 43) and the answer (log 44) now notify.
describe("Replay: an answer bundled in the question's transaction", function () {
  this.timeout(90000);
  const replay = setupReplay([BUNDLED_ANSWER.questionId]);

  it("notifies both logs when the answer shares the question's transaction", async () => {
    const before = await getMails();

    await replay.processBlock(BUNDLED_ANSWER.block);
    await settle();

    const [questionTransports, answerTransports, after] = await Promise.all([
      findUsedTransports(BUNDLED_ANSWER.txHash, BUNDLED_ANSWER.questionLogIndex),
      findUsedTransports(BUNDLED_ANSWER.txHash, BUNDLED_ANSWER.answerLogIndex),
      getMails(),
    ]);
    expect(questionTransports, "question log notified").to.include("email");
    expect(answerTransports, "answer log notified, previously suppressed by the shared tx hash").to.include("email");

    const captured = replay.captured();
    const questionNotification = captured.find(
      (n) => n.event.questionId === BUNDLED_ANSWER.questionId && n.type !== EventType.NEW_ANSWER,
    );
    const answerNotification = captured.find(
      (n) => n.event.questionId === BUNDLED_ANSWER.questionId && n.type === EventType.NEW_ANSWER,
    );
    expect(questionNotification, "issued a proposal notification for the question").to.exist;
    expect(answerNotification, "issued an answer notification for the bundled answer").to.exist;

    await Promise.all([
      expectEmailDelivered(questionNotification!, before, after),
      expectEmailDelivered(answerNotification!, before, after),
    ]);
    expect(after.length, "exactly the question and the answer email delivered").to.equal(before.length + 2);
  });
});
