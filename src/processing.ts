import { EventEmitter } from "stream";
import { SpaceDetailedPayload, SpaceSkippedPayload, SpaceStartedPayload, BotEventNames } from "./bot-events";
import { EventType, notify } from "./notify";
import { updateSpace } from "./services/db/spaces";
import { getPublicClient } from "./services/provider";
import { getLogNewAnswer, getProposalQuestionsCreated } from "./services/reality";
import { Space } from "./types";
import { defaultEmitter } from "./utils/emitter";
import { env } from "./utils/env";

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
    notifyFn: notify,
  });
};

type ConfigurableProcessSpaceDeps = {
  space: Space;
  blockNumber: bigint;
  emitter: EventEmitter;
  calculateBlockRangeFn: typeof calculateBlockRange;
  updateSpaceFn: typeof updateSpace;
  notifyFn: typeof notify;
};
export const configurableProcessSpace = async (deps: ConfigurableProcessSpaceDeps): Promise<Space> => {
  const { space, blockNumber, calculateBlockRangeFn, emitter, updateSpaceFn, notifyFn } = deps;

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

  if (proposals.length !== 0 || answers.length !== 0) {
    await Promise.all([
      ...proposals.map((event) =>
        notifyFn({
          type: EventType.PROPOSAL_QUESTION_CREATED,
          event,
          space,
        }),
      ),
      ...answers.map((event) =>
        notifyFn({
          type: EventType.NEW_ANSWER,
          event,
          space,
        }),
      ),
    ]);

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
