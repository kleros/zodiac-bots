import type { Hash } from "viem";
import { configurableNotify, type Notification, transports } from "../notify";
import { configurableProcessAnswers, configurableProcessProposals, configurableProcessSpace } from "../processing";
import { initialize as initializeEmail } from "../services/email";
import { getConnection } from "../services/db/connection";
import { findUsedTransports, insertUsedTransport } from "../services/db/notifications";
import { findProposalByQuestionId, insertProposal, removeProposalByQuestionId } from "../services/db/proposals";
import * as schema from "../services/db/schema";
import { insertSpaces, updateSpace } from "../services/db/spaces";
import { getLogNewQuestion, type LogNewAnswer, type ProposalQuestionCreated } from "../services/reality";
import { getProposal } from "../services/snapshot";
import type { Space } from "../types";
import { defaultEmitter } from "../utils/emitter";
import { render } from "../utils/notification-template";
import { validateRealityQuestion } from "../utils/reality-question-validation";
import { expect, type Mail, ONEINCH_MODULE_ADDRESS, ONEINCH_ORACLE_ADDRESS } from "../utils/tests-setup";

// Only email is asserted in these replays, so the external channels are stubbed; the real per-log
// de-duplication still runs, so this exercises the same fan-out the bot does.
const emailOnlyTransports = { ...transports, slack: async () => {}, telegram: async () => {} };

/**
 * Helpers for one replay scenario: the current space, the notifications captured during the test,
 * and a runner for a single block.
 */
export type Replay = {
  space: () => Space;
  captured: () => Notification[];
  processBlock: (block: bigint) => Promise<Space>;
};

/**
 * Sets up a replay scenario. Wires the shared hooks (before, beforeEach and afterEach) and returns
 * the helpers to drive it: the current space, the notifications captured during the test, and a
 * processBlock that runs the real pipeline for a single block pinned to a fixed range.
 *
 * The bot initializes its channels at startup and these tests do not start the bot, so the email
 * client is initialized here. Without it every send would silently do nothing.
 *
 * @param fixtureQuestionIds - The question ids this scenario replays. They are real ids also used by
 *   other suites, and question_id is the proposal primary key under once-per-run truncation, so
 *   their proposal rows are cleared before and after each test to avoid shadowing another insert.
 * @returns accessors for the current space and the captured notifications, plus processBlock
 *
 * @example
 *
 * const replay = setupReplay([BUNDLED_ANSWER.questionId]);
 * await replay.processBlock(BUNDLED_ANSWER.block);
 */
export const setupReplay = (fixtureQuestionIds: Hash[]): Replay => {
  const { db } = getConnection();
  let space: Space;
  let captured: Notification[];

  const clearFixtures = () =>
    Promise.all([db.delete(schema.notification), ...fixtureQuestionIds.map((id) => removeProposalByQuestionId(id))]);

  before(() => initializeEmail());

  beforeEach(async () => {
    captured = [];
    space = {
      ens: `replay${Math.floor(Math.random() * 1000000)}.eth`,
      startBlock: 1n,
      lastProcessedBlock: 1n,
      moduleAddress: ONEINCH_MODULE_ADDRESS,
      oracleAddress: ONEINCH_ORACLE_ADDRESS,
    };
    await Promise.all([
      clearFixtures(),
      insertSpaces([{ ens: space.ens, startBlock: space.startBlock, lastProcessedBlock: space.lastProcessedBlock }]),
    ]);
  });

  afterEach(() => clearFixtures());

  const notifyEmailOnly = (notification: Notification) => {
    captured.push(notification);
    return configurableNotify({
      notification,
      transports: emailOnlyTransports,
      findUsedTransportsFn: findUsedTransports,
      insertUsedTransportFn: insertUsedTransport,
    });
  };

  const processProposalsEmailOnly = (currentSpace: Space, proposals: ProposalQuestionCreated[]) =>
    configurableProcessProposals({
      space: currentSpace,
      proposals,
      getLogNewQuestionFn: getLogNewQuestion,
      getSnapshotProposalFn: getProposal,
      validateRealityQuestionFn: validateRealityQuestion,
      notifyFn: notifyEmailOnly,
      insertProposalFn: insertProposal,
    });

  const processAnswersEmailOnly = (currentSpace: Space, answers: LogNewAnswer[]) =>
    configurableProcessAnswers({
      space: currentSpace,
      answers,
      notifyFn: notifyEmailOnly,
      findProposalByQuestionIdFn: findProposalByQuestionId,
    });

  const processBlock = (block: bigint) =>
    configurableProcessSpace({
      space,
      blockNumber: block + 1n,
      emitter: defaultEmitter,
      calculateBlockRangeFn: () => ({ fromBlock: block, toBlock: block + 1n }),
      updateSpaceFn: updateSpace,
      processProposalsFn: processProposalsEmailOnly,
      processAnswersFn: processAnswersEmailOnly,
    });

  return { space: () => space, captured: () => captured, processBlock };
};

// maildev registers burst sends with a small delay (mirrors the email service test).
export const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

/**
 * Asserts that a notification was delivered as an email of the matching kind. Renders the subject and
 * body the notification would produce and looks for a delivered email that matches all three, among
 * the emails that arrived since the before snapshot.
 *
 * @param notification - The notification whose email is expected
 * @param before - The mailbox snapshot taken before the block was processed
 * @param after - The mailbox snapshot taken once it settled
 *
 * @example
 *
 * await expectEmailDelivered(notification, before, after);
 */
export const expectEmailDelivered = async (notification: Notification, before: Mail[], after: Mail[]) => {
  const [subject, plain, html] = await Promise.all([
    render("email", notification, "subject"),
    render("email", notification, "plain"),
    render("email", notification, "html"),
  ]);

  const delivered = after.slice(before.length);
  const match = delivered.find(
    (mail) => mail.subject === subject && mail.text.trim() === plain.trim() && mail.html.trim() === html.trim(),
  );
  expect(match, `delivered the ${notification.type} email`).to.exist;
};
