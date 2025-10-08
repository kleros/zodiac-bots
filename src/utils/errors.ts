import { Hex, type Hash } from "viem";

export class MissingLogNewQuestionEventError extends Error {
  constructor(txHash: Hash, ens: string) {
    const message = `Unable to resolve LogNewQuestion event for proposal with tx ${txHash} for space ${ens}`;
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, MissingLogNewQuestionEventError);
  }
}

export class MissingSnapshotProposalError extends Error {
  constructor(proposalId: Hex, questionId: Hex, txHash: Hash) {
    const message = `Unable to resolve proposal ${proposalId} related to Reality question ${questionId} present in the LogNewQuestion event in tx ${txHash}`;
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, MissingLogNewQuestionEventError);
  }
}