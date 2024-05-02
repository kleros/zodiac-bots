export const enum botEventNames {
  START = "start",
  PROCESSING_BLOCKS = "processing_block",
  NOT_ENOUGH_BLOCKS = "not_enough_blocks",
}

export type ProcessingBlocksPayload = {
  fromBlock: bigint;
  toBlock: bigint;
};
