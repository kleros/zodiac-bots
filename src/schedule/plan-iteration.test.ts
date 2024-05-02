import { expect } from "../utils/tests-setup";
import { ConfigurablePlanIterationDeps, configurablePlanIteration } from "./plan-iteration";

describe("planIteration", () => {
  const fn = configurablePlanIteration;

  let depsMock: ConfigurablePlanIterationDeps = {} as ConfigurablePlanIterationDeps;
  beforeEach(() => {
    depsMock = {
      getLastProcessedBlockNumber: () => Promise.resolve(40n),
      getBlockNumber: () => Promise.resolve(42n),
      maxBlocksToProcess: 1000,
    };
  });

  it("should skip where there are not enough blocks to process", async () => {
    const start = 10n;
    const end = start;
    depsMock.getLastProcessedBlockNumber = () => Promise.resolve(start);
    depsMock.getBlockNumber = () => Promise.resolve(end);

    const result = await fn(depsMock);

    return expect(result).to.eql({ hasBlocks: false });
  });

  it("should return the range when there are new blocks", async () => {
    const fromBlock = 10n;
    const toBlock = fromBlock + 10n;
    depsMock.getLastProcessedBlockNumber = () => Promise.resolve(fromBlock);
    depsMock.getBlockNumber = () => Promise.resolve(toBlock);

    const result = await fn(depsMock);

    expect(result).to.eql({
      hasBlocks: true,
      fromBlock,
      toBlock,
    });
  });

  it("should impose a threshold to the max number of blocks processed", async () => {
    const lastProcessedBlock = 10n;
    // There are too many blocks unprocessed!
    const currentBlockNumber = lastProcessedBlock + 100_000n;
    // We configure the planner to provide a batch of max 100 blocks
    depsMock.maxBlocksToProcess = 100;
    depsMock.getLastProcessedBlockNumber = () => Promise.resolve(lastProcessedBlock);
    depsMock.getBlockNumber = () => Promise.resolve(currentBlockNumber);

    const result = await fn(depsMock);

    const expectedToBlock = lastProcessedBlock + BigInt(depsMock.maxBlocksToProcess);
    expect(result).to.eql({
      hasBlocks: true,
      fromBlock: lastProcessedBlock,
      toBlock: expectedToBlock,
    });
  });
});
