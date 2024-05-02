import sinon from "sinon";
import { ConfigurableSchedulerDeps, configurableScheduler } from "./schedule";
import { expect } from "../utils/tests-setup";

describe("scheduler", () => {
  const fn = configurableScheduler;

  let depsMock: ConfigurableSchedulerDeps = {} as ConfigurableSchedulerDeps;
  beforeEach(() => {
    depsMock = {
      shouldContinueFn: () => false,
      waitForFn: () => Promise.resolve(),
      planIterationFn: () => Promise.resolve({ hasBlocks: false }),
      setLastProcessedBlockNumberFn: () => Promise.resolve(),
      onBlocksFound: async () => {},
      onSkip: async () => {},
      intervalInSeconds: 5,
    };
  });

  it("should call the iterate", async () => {
    const onBlocksFound = sinon.spy();
    depsMock.onBlocksFound = onBlocksFound;
    depsMock.planIterationFn = async () => ({ hasBlocks: true, fromBlock: 2n, toBlock: 3n });
    await fn(depsMock);
    expect(onBlocksFound.calledOnceWith(2n, 3n)).to.be.true;
  });

  it("should skip when there are no blocks", async () => {
    const onSkip = sinon.spy();
    depsMock.onSkip = onSkip;
    depsMock.planIterationFn = async () => ({ hasBlocks: false });
    await fn(depsMock);
    expect(onSkip.calledOnce).to.be.true;
  });

  it("should wait between iterations", async () => {
    const waitForFnSpy = sinon.spy(depsMock.waitForFn);
    depsMock.waitForFn = waitForFnSpy;
    await fn(depsMock);
    expect(waitForFnSpy.calledOnceWith(depsMock.intervalInSeconds * 1_000));
  });

  it("should store the latest processed block", async () => {
    const setLastProcessedBlockNumber = sinon.spy();
    depsMock.setLastProcessedBlockNumberFn = setLastProcessedBlockNumber;
    const toBlock = 6n;
    depsMock.planIterationFn = async () => ({ hasBlocks: true, fromBlock: 2n, toBlock });
    await fn(depsMock);
    expect(setLastProcessedBlockNumber.calledOnceWith(toBlock)).to.be.true;
  });

  it("should store nothing when the block is skipped", async () => {
    const setLastProcessedBlockNumber = sinon.spy();
    depsMock.setLastProcessedBlockNumberFn = setLastProcessedBlockNumber;
    depsMock.planIterationFn = async () => ({ hasBlocks: false });
    await fn(depsMock);
    expect(setLastProcessedBlockNumber.notCalled).to.be.true;
  });
});
