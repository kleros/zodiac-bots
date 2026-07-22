import type { Hash } from "viem";

// Public on-chain coordinates on the monitored governance space, replayed against the forked node.
// The narrative for each case lives with its scenario test.

export const NORMAL_PROPOSAL = {
  block: 19475120n,
  questionId: "0xebf5b601fedfaa5562a03590e9ac8be937cc070a131443af01948a7eda6dfabf" as Hash,
  txHash: "0x890ddd7826fcd79ff17b54368e8df393959f269847ceeb0fea13cc4b68330d43" as Hash,
  logIndex: 303,
};

export const NORMAL_ANSWER = {
  block: 19640300n,
  questionId: "0x8566ba6b1ac945f2b152a20ecc7cb3a87982190190af14cb4fbc85e12eb474e2" as Hash,
  txHash: "0x0cc20c32ee428bdb8f16fa1aa22b396ecafa91b61bc2c3350723e4dfefeebff0" as Hash,
  logIndex: 188,
};

export const BUNDLED_ANSWER = {
  block: 25578097n,
  questionId: "0xe3769cf1d8abc74ce68c81c480fbad99a3fdbf946f486075ae6352569aa3da77" as Hash,
  txHash: "0xcaa348ddea39b3af94feb415f4238ab551bacc044b7c640a7730cdabd122f5b9" as Hash,
  questionLogIndex: 43,
  answerLogIndex: 44,
};

export const ORIGINAL_QUESTION = {
  block: 25130445n,
  questionId: "0x4256363a7d0ef06d0749b40543e5b4de4f579691acffd2d983d57820920236bd" as Hash,
};

export const REUSED_PROPOSAL_ID = {
  questionBlock: 25164511n,
  questionId: "0x48ef636109cb2f5741693a82e182beb48de90ad92ae24d1564992e1c9bf8997d" as Hash,
  answerBlock: 25164534n,
  answerTxHash: "0x805398edb9670d82662bb453400ffe4fee3c97a18d3e54fd17eb9d8ea0c0b5a4" as Hash,
  answerLogIndex: 45,
};

export const CONTESTED_PROPOSAL = {
  questionBlock: 24404206n,
  questionId: "0xba5941c55705440726311f65e3d580dde0608d34aac17a903a8327d407e3049f" as Hash,
  answerBlock: 24404230n,
  answerTxHash: "0xa7c13b0c7d37220057c1739f207900e2f4d6f9e9a88492e4fda37df0f6f6213d" as Hash,
  answerLogIndex: 271,
};
