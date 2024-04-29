import { GetLastProcessedBlockNumberFn, getLastProcessedBlockNumber } from "../services/db";
import { getPublicClient } from "../services/provider";

// TODO: Perform decent validation for environment variables
const MAX_BLOCKS_BATCH_SIZE = process.env.BLOCKS_BATCH_SIZE ?? 100;

export type IterationPlan =
  | { hasBlocks: false }
  | {
      hasBlocks: true;
      fromBlock: bigint;
      toBlock: bigint;
    };
export type PlanIterationFn = () => Promise<IterationPlan>;

/**
 * Indicates the range of blocks to be processed.
 *
 * @example
 *
 * const plan = await planIteration();
 *
 * if (!plan.hasBlocks) return;
 *
 * for (let i:= plan.fromBlock; i<plan.toBlock; i++) {
 *  console.log('processing block', i)
 *  }
 */
export const planIteration: PlanIterationFn = () => {
  return configurablePlanIteration({
    // TODO: Ensure we get a safe block, and not just the most recent
    getBlockNumber: getPublicClient().getBlockNumber,
    getLastProcessedBlockNumber: getLastProcessedBlockNumber,
    maxBlocksToProcess: Number(MAX_BLOCKS_BATCH_SIZE),
  });
};

export type ConfigurablePlanIterationDeps = {
  getBlockNumber: () => Promise<bigint>;
  getLastProcessedBlockNumber: GetLastProcessedBlockNumberFn;
  maxBlocksToProcess: number;
};
export const configurablePlanIteration = async (deps: ConfigurablePlanIterationDeps): Promise<IterationPlan> => {
  const { getBlockNumber, getLastProcessedBlockNumber, maxBlocksToProcess } = deps;

  const [blockNumber, lastProcessedBlockNumber] = await Promise.all([getBlockNumber(), getLastProcessedBlockNumber()]);

  const pendingBlocks = blockNumber - lastProcessedBlockNumber;

  if (pendingBlocks < 1) return { hasBlocks: false };
  const toBlock = min(blockNumber, lastProcessedBlockNumber + BigInt(maxBlocksToProcess));

  return {
    hasBlocks: true,
    fromBlock: lastProcessedBlockNumber,
    toBlock,
  };
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
const min = (a: bigint, b: bigint) => (a < b ? a : b);
