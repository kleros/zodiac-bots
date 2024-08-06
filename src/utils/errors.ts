import { type Hash } from "viem";

export class MissingLogNewQuestionEventError extends Error {
  constructor(txHash: Hash, ens: string) {
    const message = `Unable to resolve LogNewQuestion event for proposal with tx ${txHash} for space ${ens}`;
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, MissingLogNewQuestionEventError);
  }
}

export class InvalidLogNewQuestionArgsEventError extends Error {
  constructor(txHash: Hash, ens: string) {
    const message = `Expected at least two values in the question field of the LogNewQuestion event for proposal with tx ${txHash} for space ${ens}`;
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, MissingLogNewQuestionEventError);
  }
}
