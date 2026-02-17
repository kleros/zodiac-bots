import { Address, concat, Hex, keccak256 } from "viem";
import { LogNewQuestion } from "../../services/reality";
import { SnapshotProposal } from "../../services/snapshot";
import { calculateTxHash } from "./eip-712-transaction-hash";
import {
  BaseProposalValidationError,
  MissingSnapshotProposalError,
  ProposalIdMismatchError,
  SafeHashCalculationError,
  SafeHashMismatchError,
  SafeNotFoundForProposalNetworkError,
  SafeSnapPluginConfigurationError,
  TxHashMismatchError,
  ValidationErrorSeverity,
} from "./errors";

/**
 * Validate the provided question against the proposal, throwing an error
 * if anything is incorrect
 *
 * @param event - The event to validate.
 * @param proposal - The proposal associated with the event.
 *
 * @throws {BaseProposalValidationError} If the validation fails.
 *
 * @example
 * // This will throw an error if anything is incorrect, otherwise
 * // it will just execute without returning anything
 * assertValidRealityQuestion(event, proposal);
 */
export const assertValidRealityQuestion = (event: LogNewQuestion, proposal: SnapshotProposal | null) => {
  if (!proposal) throw new MissingSnapshotProposalError(event.question.proposalId);

  if (proposal.id != event.question.proposalId) {
    throw new ProposalIdMismatchError(proposal.id, event.question.proposalId);
  }

  const safes = proposal.plugins?.safeSnap?.safes;
  if (!safes || safes.length < 1) {
    throw new SafeSnapPluginConfigurationError();
  }

  safes.forEach((safe) => {
    const { network, realityAddress, txs, hash } = safe;

    const domain = {
      chainId: Number(network),
      verifyingContract: realityAddress as Address,
    } as const;

    const txHashes = txs.map((tx) => {
      const {
        hash,
        mainTransaction: { to, data, nonce, value, operation },
      } = tx;

      const calculatedHash = calculateTxHash(domain, {
        to: to as Address,
        data: data as Hex,
        nonce: BigInt(nonce),
        value: BigInt(value),
        operation: Number(operation),
      });

      if (hash != calculatedHash) throw new TxHashMismatchError(hash, calculatedHash);
      return calculatedHash;
    });

    const calculatedSafeHash = keccak256(concat(txHashes));
    if (calculatedSafeHash != hash) throw new SafeHashCalculationError(hash, calculatedSafeHash);
  });

  const proposalNetworkSafe = safes.find((safe) => safe.network === proposal.network);
  if (!proposalNetworkSafe) throw new SafeNotFoundForProposalNetworkError();

  if (proposalNetworkSafe.hash !== event.question.safeHash) throw new SafeHashMismatchError();
};

type ValidationResultOK = {
  isValid: true;
};

type ValidationResultFailed = {
  isValid: false;
  severity: ValidationErrorSeverity;
  code: string;
  message: string;
};

export type ValidationResult = ValidationResultOK | ValidationResultFailed;

/**
 * Validate the provided question against the proposal, returning a validation result
 *
 * @param event - The event to validate
 * @param proposal - The proposal associated with the event
 * @returns A validation result
 *
 * @example
 * const result = validateRealityQuestion(event, proposal);
 * if (result.isValid) console.log("Validation passed!");
 */
export const validateRealityQuestion = (event: LogNewQuestion, proposal: SnapshotProposal | null): ValidationResult => {
  try {
    assertValidRealityQuestion(event, proposal);
    return { isValid: true };
  } catch (error) {
    if (!(error instanceof BaseProposalValidationError)) throw error;

    return {
      isValid: false,
      severity: error.severity,
      code: error.name,
      message: error.message,
    };
  }
};
