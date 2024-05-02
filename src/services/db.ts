// TODO: Perform proper environment variable validation
const STARTING_BLOCK = process.env.STARTING_BLOCK ?? 1n;

let lastProcessedBlockNumber = BigInt(STARTING_BLOCK);

export type GetLastProcessedBlockNumberFn = () => Promise<bigint>;
export const getLastProcessedBlockNumber: GetLastProcessedBlockNumberFn = () => {
  return Promise.resolve(lastProcessedBlockNumber);
};

export type SetLastProcessedBlockNumberFn = (blockNumber: bigint) => Promise<void>;
export const setLastProcessedBlockNumber = async (blockNumber: bigint) => {
  lastProcessedBlockNumber = blockNumber;
};
