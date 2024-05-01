import { SetLastProcessedBlockNumberFn, setLastProcessedBlockNumber } from "../services/db";
import { PlanIterationFn, planIteration } from "./plan-iteration";

export type OnBlocksFoundCallback = (fromBlock: bigint, toBlock: bigint) => Promise<void> | void;
export type OnSkipCallback = () => Promise<void> | void;

export type SchedulerFn = (params: SchedulerFnParams) => Promise<void>;

type SchedulerFnParams = {
  // How frequently it should check for new blocks
  intervalInSeconds: number;
  // Function to be called when new blocks are found
  onBlocksFound?: OnBlocksFoundCallback;
  // Function to be called when no blocks are found
  onSkip?: OnSkipCallback;
};
/**
 * Checks for new blocks every `intervalInSeconds`. If new blocks are found, calls
 * `scheduledFn`
 *
 * @example
 *
 * schedule({
 *  intervalInSeconds: 5,
 *  scheduledFn: (fromBlock, toBlock) => console.log(`New blocks detected: ${fromBlock}->${toBlock}`),
 * })
 */
export const scheduler: SchedulerFn = ({ intervalInSeconds, onBlocksFound, onSkip }) => {
  return configurableScheduler({
    intervalInSeconds,
    onBlocksFound,
    onSkip,
    waitForFn: waitFor,
    planIterationFn: planIteration,
    setLastProcessedBlockNumberFn: setLastProcessedBlockNumber,
    shouldContinueFn: () => true,
  });
};

export type ConfigurableSchedulerDeps = {
  intervalInSeconds: number;
  onBlocksFound?: OnBlocksFoundCallback;
  onSkip?: OnSkipCallback;
  planIterationFn: PlanIterationFn;
  setLastProcessedBlockNumberFn: SetLastProcessedBlockNumberFn;
  // Used to wait the interval, mocked on tests to make them run fast
  waitForFn: WaitForFn;
  // Function that evaluates if the scheduling should continue. Used to avoid infinite-loops in
  // testsing but useful in the future for graceful shutdown
  shouldContinueFn: () => Boolean;
};
export const configurableScheduler = async (deps: ConfigurableSchedulerDeps) => {
  const {
    planIterationFn,
    onBlocksFound,
    onSkip,
    waitForFn,
    intervalInSeconds,
    shouldContinueFn,
    setLastProcessedBlockNumberFn,
  } = deps;

  do {
    const plan = await planIterationFn();
    if (plan.hasBlocks) {
      if (onBlocksFound) await onBlocksFound(plan.fromBlock, plan.toBlock);
      await setLastProcessedBlockNumberFn(plan.toBlock);
    } else {
      if (onSkip) await onSkip();
    }
    await waitForFn(intervalInSeconds * 1000);
  } while (shouldContinueFn());
};

export type WaitForFn = (durationInMs: number) => Promise<void>;
/**
 * Returns a promise that resolves after a certain amount of milliseconds.
 *
 * @example
 * await waitFor(1_000);
 * console.log('This message appears after a second')
 */
export const waitFor: WaitForFn = async (durationInMs: number) => {
  return new Promise((resolve) => setTimeout(resolve, durationInMs));
};
