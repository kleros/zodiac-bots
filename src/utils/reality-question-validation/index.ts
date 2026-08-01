import { concat, isAddress, isHex, keccak256, maxUint256 } from "viem";
import { LogNewQuestion } from "../../services/reality";
import { ProposalSafeBatchResponse, SnapshotProposal } from "../../services/snapshot";
import { calculateTxHash } from "./eip-712-transaction-hash";
import {
  BaseProposalValidationError,
  MalformedSafeError,
  MalformedSafeSnapTxError,
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
 * Reads and parses the EIP-712 message from a safeSnap transaction. The Snapshot API types mark the
 * transaction data as always present, but the response can omit it or hold unparseable values, so
 * anything malformed becomes a validation error instead of an uncaught exception that crashes the bot.
 *
 * @param tx - The safeSnap transaction to read.
 * @param index - The position of the transaction in the safe, used in the error message.
 * @returns The parsed message, ready for the EIP-712 hash calculation.
 * @throws {MalformedSafeSnapTxError} When the transaction data is missing or cannot be parsed.
 *
 * @example
 * const message = parseSafeSnapTxMessage(tx, 0);
 */
const parseSafeSnapTxMessage = (tx: ProposalSafeBatchResponse, index: number) => {
  const mainTransaction = tx?.mainTransaction;
  if (!mainTransaction) throw new MalformedSafeSnapTxError(index);

  const { to, data, nonce, value, operation } = mainTransaction;
  if ([to, data, nonce, value, operation].some((field) => field == null)) {
    throw new MalformedSafeSnapTxError(index);
  }

  // The Snapshot plugin JSON is author-controlled and not schema-validated upstream, so a well-typed
  // hash computation is not guaranteed. Validate every field the EIP-712 encoder is strict about
  // (address, hex data, uint256-range value/nonce, Safe operation) so a malformed payload becomes a
  // validation error instead of an uncaught throw inside calculateTxHash.
  if (!isAddress(to) || !isHex(data)) throw new MalformedSafeSnapTxError(index);

  const operationNumber = Number(operation);
  if (operationNumber !== 0 && operationNumber !== 1) throw new MalformedSafeSnapTxError(index);

  let nonceValue: bigint;
  let txValue: bigint;
  try {
    nonceValue = BigInt(nonce);
    txValue = BigInt(value);
  } catch (error) {
    // BigInt() raises SyntaxError on an unparseable string and RangeError on a non-integer number.
    if (error instanceof SyntaxError || error instanceof RangeError) {
      throw new MalformedSafeSnapTxError(index);
    }
    throw error;
  }
  // BigInt is arbitrary precision, so it accepts values the uint256 encoder rejects; bound both ends.
  if (nonceValue < 0n || nonceValue > maxUint256 || txValue < 0n || txValue > maxUint256) {
    throw new MalformedSafeSnapTxError(index);
  }

  return { to, data, nonce: nonceValue, value: txValue, operation: operationNumber };
};

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

  safes.forEach((safe, safeIndex) => {
    // The safe fields come from the same author-controlled plugin JSON as the transactions, so a
    // malformed realityAddress, network, or txs must not reach the encoder as an uncaught throw.
    if (!safe || !Array.isArray(safe.txs)) throw new MalformedSafeError(safeIndex);

    const { network, realityAddress, txs, hash } = safe;

    if (!isAddress(realityAddress)) throw new MalformedSafeError(safeIndex);

    const chainId = Number(network);
    if (!Number.isInteger(chainId) || chainId < 0) throw new MalformedSafeError(safeIndex);

    const domain = {
      chainId,
      verifyingContract: realityAddress,
    } as const;

    const txHashes = txs.map((tx, index) => {
      const message = parseSafeSnapTxMessage(tx, index);

      const calculatedHash = calculateTxHash(domain, message);

      if (tx.hash != calculatedHash) throw new TxHashMismatchError(tx.hash, calculatedHash);
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
