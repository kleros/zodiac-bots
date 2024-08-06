import {
  BotEventNames,
  type SpaceDetailedPayload,
  type SpaceSkippedPayload,
  type SpaceStartedPayload,
} from "./bot-events";
import { EventType, notify } from "./notify";
import { findProposalByQuestionId, insertProposal } from "./services/db/proposals";
import { updateSpace } from "./services/db/spaces";
import { getPublicClient } from "./services/provider";
import {
  getLogNewAnswer,
  getLogNewQuestion,
  getProposalQuestionsCreated,
  type LogNewAnswer,
  type ProposalQuestionCreated,
} from "./services/reality";
import { defaultEmitter } from "./utils/emitter";
import { env } from "./utils/env";
import type { EventEmitter } from "node:events";
import type { Space } from "./types";
import { InvalidLogNewQuestionArgsEventError, MissingLogNewQuestionEventError } from "./utils/errors";

/**
 * Process all spaces, respecting the batch size. Triggers a notification per event. Returns the
 * updated spaces.
 *
 * @param spaces - The spaces to process
 * @returns the spaces with the `lastProcessedBlock` field updated
 *
 * @example
 *
 * const updatedSpaces = await processSpaces(spaces)
 */
export const processSpaces = async (spaces: Space[]) => {
  return configurableProcessSpaces({
    spaces,
    getBlockNumberFn: () => getPublicClient().getBlockNumber(),
    processSpaceFn: processSpace,
  });
};

type ConfigurableProcessSpacesDeps = {
  spaces: Space[];
  getBlockNumberFn: () => Promise<bigint>;
  processSpaceFn: typeof processSpace;
};
export const configurableProcessSpaces = async (deps: ConfigurableProcessSpacesDeps) => {
  const { spaces, getBlockNumberFn, processSpaceFn } = deps;
  const blockNumber = await getBlockNumberFn();
  return Promise.all(spaces.map((space) => processSpaceFn(space, blockNumber)));
};

/**
 * Check for new space events, respecting the batch size. Triggers a notification per event
 * found. Finally, it updates the last processed block and returns the updated space.
 *
 * @param space - The space to process
 * @param blockNumber - The latest block number
 * @returns the space with the `lastProcessedBlock` field updated
 *
 * @example
 *
 * const updatedSpace = await processSpace(space, blockNumber)
 */
export const processSpace = async (space: Space, blockNumber: bigint) => {
  return configurableProcessSpace({
    space,
    blockNumber,
    emitter: defaultEmitter,
    calculateBlockRangeFn: calculateBlockRange,
    updateSpaceFn: updateSpace,
    processProposalsFn: processProposals,
    processAnswersFn: processAnswers,
  });
};

type ConfigurableProcessSpaceDeps = {
  space: Space;
  blockNumber: bigint;
  emitter: EventEmitter;
  calculateBlockRangeFn: typeof calculateBlockRange;
  updateSpaceFn: typeof updateSpace;
  processProposalsFn: typeof processProposals;
  processAnswersFn: typeof processAnswers;
};
export const configurableProcessSpace = async (deps: ConfigurableProcessSpaceDeps): Promise<Space> => {
  const { space, blockNumber, calculateBlockRangeFn, emitter, updateSpaceFn, processProposalsFn, processAnswersFn } =
    deps;

  emitter.emit(BotEventNames.SPACE_STARTED, { space } satisfies SpaceStartedPayload);

  const { fromBlock, toBlock } = calculateBlockRangeFn(space, blockNumber);

  // If there are no new blocks, skip this iteration
  if (fromBlock >= toBlock) {
    emitter.emit(BotEventNames.SPACE_SKIPPED, { space, fromBlock, toBlock } satisfies SpaceSkippedPayload);
    return space;
  }

  const [proposals, answers] = await Promise.all([
    getProposalQuestionsCreated({
      realityModuleAddress: space.moduleAddress,
      fromBlock,
      toBlock,
    }),
    getLogNewAnswer({
      realityOracleAddress: space.oracleAddress,
      fromBlock,
      toBlock,
    }),
  ]);

  const emittedContext: SpaceDetailedPayload = {
    space,
    fromBlock,
    toBlock,
    proposals,
    answers,
  };
  emitter.emit(BotEventNames.SPACE_EVENTS_FETCHED, emittedContext);

  await processProposalsFn(space, proposals);
  await processAnswersFn(space, answers);

  if (proposals.length !== 0 || answers.length !== 0) {
    emitter.emit(BotEventNames.SPACE_NOTIFIED, emittedContext);
  }

  await updateSpaceFn(space.ens, toBlock);

  emitter.emit(BotEventNames.SPACE_ENDED, emittedContext);
  return {
    ...space,
    lastProcessedBlock: toBlock,
  };
};

/**
 * Returns the block range that should be processed for the given space.
 *
 * @param space - The space to calculate the block range for
 * @param blockNumber - The latest block number
 * @returns the block range that should be processed
 *
 * @example
 *
 * const { fromBlock, toBlock } = calculateBlockRange(space, blockNumber)
 */
export const calculateBlockRange = (space: Space, blockNumber: bigint) => {
  const lastProcessedBlock = space.lastProcessedBlock || space.startBlock;

  const fromBlock = max(lastProcessedBlock, space.startBlock);
  const toBlock = min(blockNumber, fromBlock + BigInt(env.MAX_BLOCKS_BATCH_SIZE));

  return { fromBlock, toBlock };
};

/**
 * Returns the smaller of two bigints.
 *
 * @param a first bigint
 * @param b second bigint
 * @returns the smaller of the two bigints
 * @example
 *
 * const smallest = min(5n, 10n) // 5n
 */
export const min = (a: bigint, b: bigint) => (a < b ? a : b);

/**
 * Returns the biggest of two bigints.
 *
 * @param a first bigint
 * @param b second bigint
 * @returns the biggest of the two bigints
 * @example
 *
 * const biggest = max(5n, 10n) // 10n
 */
export const max = (a: bigint, b: bigint) => (a > b ? a : b);

/**
 * Enritches the proposal info with data coming from the corresponding LogNewQuestion event,
 * registers the proposals as as active (to enable later identification of answers) and issues
 * notifications for them.
 *
 * @param space - The space that the proposals belong to
 * @param proposals - The proposals to process
 *
 * @example
 * await processProposals(space, proposals)
 */
export const processProposals = (space: Space, proposals: ProposalQuestionCreated[]) => {
  return configurableProcessProposals({
    space,
    proposals,
    getLogNewQuestionFn: getLogNewQuestion,
    notifyFn: notify,
    insertProposalFn: insertProposal,
  });
};

type ConfigurableProcessProposalsDeps = {
  space: Space;
  proposals: ProposalQuestionCreated[];
  getLogNewQuestionFn: typeof getLogNewQuestion;
  notifyFn: typeof notify;
  insertProposalFn: typeof insertProposal;
};
export const configurableProcessProposals = async (deps: ConfigurableProcessProposalsDeps) => {
  const { space, proposals, getLogNewQuestionFn, insertProposalFn, notifyFn } = deps;

  await Promise.all(
    proposals.map(async (event) => {
      const questions = await getLogNewQuestionFn({
        realityOracleAddress: space.oracleAddress,
        fromBlock: event.blockNumber,
        toBlock: event.blockNumber,
      });
      const newQuestionEvent = questions.find((q) => q.questionId === event.questionId);

      if (!newQuestionEvent) throw new MissingLogNewQuestionEventError(event.txHash, space.ens);
      if (newQuestionEvent.question.length < 2) throw new InvalidLogNewQuestionArgsEventError(event.txHash, space.ens);

      const { question, startedAt, finishedAt, timeout } = newQuestionEvent;
      const snapshotId = question[0];

      const logNewQuestionFields = { snapshotId, startedAt, finishedAt, timeout };

      return Promise.all([
        insertProposalFn({
          ens: space.ens,
          proposalId: event.proposalId,
          questionId: event.questionId,
          txHash: event.txHash,
          happenedAt: event.happenedAt,
          ...logNewQuestionFields,
        }),
        notifyFn({
          type: EventType.PROPOSAL_QUESTION_CREATED,
          event: {
            ...event,
            ...logNewQuestionFields,
          },
          space,
        }),
      ]);
    }),
  );
};

/**
 * Notifies the answers, ignoring those not issued for the current space
 *
 * @param space - The space that the answers belong to
 * @param answers - The answers to process
 *
 * @example
 * await processAnswers(space, answers)
 */
export const processAnswers = (space: Space, answers: LogNewAnswer[]) => {
  return configurableProcessAnswers({
    space,
    answers,
    notifyFn: notify,
    findProposalByQuestionIdFn: findProposalByQuestionId,
  });
};

type ConfigurableProcessAnswersDeps = {
  space: Space;
  answers: LogNewAnswer[];
  notifyFn: typeof notify;
  findProposalByQuestionIdFn: typeof findProposalByQuestionId;
};
export const configurableProcessAnswers = async (deps: ConfigurableProcessAnswersDeps) => {
  const { space, answers, notifyFn, findProposalByQuestionIdFn } = deps;

  await Promise.all(
    answers.map(async (event) => {
      const proposal = await findProposalByQuestionIdFn(event.questionId);

      if (!proposal || proposal.ens !== space.ens) return;

      await notifyFn({
        type: EventType.NEW_ANSWER,
        event,
        space,
      });
    }),
  );
};
