import sinon from "sinon";
import { Address } from "viem";
import { calculateBlockRange, configurableProcessSpaces, max, min } from "./processing";
import { Space } from "./types";
import { env } from "./utils/env";
import { expect } from "./utils/tests-setup";

describe("processSpaces", () => {
  const fn = configurableProcessSpaces;

  it("should call processSpace for each space", async () => {
    const getBlockNumberFn = async () => 1n;

    const createFakeSpace = () => ({
      ens: `test${Math.floor(Math.random() * 1000)}.eth`,
      startBlock: 1n,
      lastProcessedBlock: 100n,
      moduleAddress: "0xA" as Address,
      oracleAddress: "0xB" as Address,
    });
    const spaces = [createFakeSpace(), createFakeSpace(), createFakeSpace()];

    const processSpaceFn = sinon.stub();
    const expectedResult: Space[] = [];
    processSpaceFn.callsFake(async (space) => {
      const updatedSpace = { ...space, lastProcessedBlock: space.lastProcessedBlock! + 1n };
      expectedResult.push(updatedSpace);
      return updatedSpace;
    });

    const result = await fn({
      spaces,
      getBlockNumberFn,
      processSpaceFn,
    });

    expect(result).to.have.members(expectedResult);
  });
});

describe("calculateBlockRange", () => {
  const fn = calculateBlockRange;

  const mockSpace: Space = {
    ens: "kleros.eth",
    startBlock: 1n,
    lastProcessedBlock: 100n,
    moduleAddress: "0xA",
    oracleAddress: "0xB",
  };

  it("should return the range from lastProcessedBlock up to blockNumber in normal conditions", () => {
    const blockNumber = mockSpace.lastProcessedBlock! + BigInt(env.MAX_BLOCKS_BATCH_SIZE) - 1n;
    const result = fn(mockSpace, blockNumber);
    expect(result.fromBlock).to.equal(mockSpace.lastProcessedBlock);
    expect(result.toBlock).to.equal(blockNumber);
  });

  it("should limit the range if it is larger than MAX_BOCKS_BATCH_SIZE", () => {
    const blockNumber = mockSpace.lastProcessedBlock! + BigInt(env.MAX_BLOCKS_BATCH_SIZE) + 1000n;
    const result = fn(mockSpace, blockNumber);
    expect(result.fromBlock).to.equal(mockSpace.lastProcessedBlock);
    expect(result.toBlock).to.equal(mockSpace.lastProcessedBlock! + BigInt(env.MAX_BLOCKS_BATCH_SIZE));
  });

  it("should use the startBlock if there is no lastProcessedBlock", () => {
    const space = {
      ...mockSpace,
      lastProcessedBlock: null,
    };
    const blockNumber = space.startBlock! + BigInt(env.MAX_BLOCKS_BATCH_SIZE) - 1n;
    const result = fn(space, blockNumber);
    expect(result.fromBlock).to.equal(space.startBlock);
    expect(result.toBlock).to.equal(blockNumber);
  });

  it("should use the startBlock when it is bigger than lastProcessedBlock", () => {
    const space = {
      ...mockSpace,
      startBlock: mockSpace.lastProcessedBlock! + 5n,
    };
    const blockNumber = space.startBlock! + BigInt(env.MAX_BLOCKS_BATCH_SIZE) - 1n;
    const result = fn(space, blockNumber);
    expect(result.fromBlock).to.equal(space.startBlock);
    expect(result.toBlock).to.equal(blockNumber);
  });
});

describe("min", () => {
  it("should return the smallest of two bigints", () => {
    expect(min(1n, 2n)).to.eq(1n);
    expect(min(2n, 1n)).to.eq(1n);
    expect(min(1n, 1n)).to.eq(1n);
  });
});

describe("max", () => {
  it("should return the biggest of two bigints", () => {
    expect(max(1n, 2n)).to.eq(2n);
    expect(max(2n, 1n)).to.eq(2n);
    expect(max(2n, 2n)).to.eq(2n);
  });
});
