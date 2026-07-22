import { expect, getMails } from "../utils/tests-setup";
import { BUNDLED_ANSWER } from "./fixtures";
import { setupReplay, settle } from "./replay";

// This is about operational safety, not an attack. After a chain reorg or a restart the bot scans
// blocks it has already handled. Processing the same block twice must not send the notifications
// again. It reuses the bundled-answer block because that block is the busiest, with a question and
// an answer together.
describe("Replay: reprocessing an already-processed block", function () {
  this.timeout(90000);
  const replay = setupReplay([BUNDLED_ANSWER.questionId]);

  it("sends nothing new when the same block is processed again", async () => {
    await replay.processBlock(BUNDLED_ANSWER.block);
    await settle();
    const baseline = await getMails();

    await replay.processBlock(BUNDLED_ANSWER.block);
    await settle();

    const after = await getMails();
    expect(after.length, "reprocessing sends no duplicate emails").to.equal(baseline.length);
  });
});
