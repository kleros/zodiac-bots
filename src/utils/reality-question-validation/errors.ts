import { Hash, Hex } from "viem";
import { toDisplaySafe } from "../format";

export enum ValidationErrorSeverity {
  SECURITY_ALERT = "security-alert",
  INCOMPLETE_DATA = "incomplete-data",
}

/**
 * Base class for all the Proposal/Question validation errors. This class
 * it not intended to be instantiated directly, but extended. It allows to
 * detect if the validation failed due to a validation assertion or, otherwise,
 * a completely unexpected cause.
 */
export class BaseProposalValidationError extends Error {
  public severity: ValidationErrorSeverity;

  constructor(severity: ValidationErrorSeverity, message: string) {
    super(message);
    this.severity = severity;
    // Without this every subclass reports `name` as "Error", making the `code` of a
    // validation result useless for telling the failures apart.
    this.name = this.constructor.name;
  }
}

export class MalformedRealityQuestionError extends BaseProposalValidationError {
  constructor() {
    super(
      ValidationErrorSeverity.SECURITY_ALERT,
      "The Reality question is not a proposal id followed by a 64 character transactions hash, so its fields cannot be read",
    );
  }
}

export class MalformedProposalIdError extends BaseProposalValidationError {
  constructor(proposalId: string) {
    super(
      ValidationErrorSeverity.SECURITY_ALERT,
      `The proposal id is not shaped like a Snapshot proposal id: ${toDisplaySafe(proposalId)}`,
    );
  }
}

export class ProposalIdIntegrityError extends BaseProposalValidationError {
  constructor(recorded: Hash, read: Hash) {
    super(
      ValidationErrorSeverity.SECURITY_ALERT,
      `The proposal id read from the Reality question does not match the one recorded by the module. Recorded ${recorded}, read ${read}`,
    );
  }
}

export class MissingSnapshotProposalError extends BaseProposalValidationError {
  constructor(proposalId: string) {
    super(
      ValidationErrorSeverity.INCOMPLETE_DATA,
      `The Snapshot GraphQL API didn't return any proposal with proposalId ${proposalId}`,
    );
  }
}

export class ProposalIdMismatchError extends BaseProposalValidationError {
  constructor(snapshotProposalId: string, realityEventProposalId: string) {
    super(
      ValidationErrorSeverity.INCOMPLETE_DATA,
      `The proposalId of the resolved proposal and Reality question data are different. Snapshot proposalId is ${snapshotProposalId}, Reality proposalId=${realityEventProposalId}`,
    );
  }
}
export class SafeSnapPluginConfigurationError extends BaseProposalValidationError {
  constructor() {
    super(
      ValidationErrorSeverity.INCOMPLETE_DATA,
      `The Snapshot GraphQL API didn't report any safe in the SafeSnap plugins section`,
    );
  }
}

export class MalformedSafeSnapTxError extends BaseProposalValidationError {
  constructor(index: number) {
    super(
      ValidationErrorSeverity.INCOMPLETE_DATA,
      `The SafeSnap plugin transaction at index ${index} is missing its mainTransaction or required fields (to, data, nonce, value, operation)`,
    );
  }
}

export class MalformedSafeError extends BaseProposalValidationError {
  constructor(index: number) {
    super(
      ValidationErrorSeverity.INCOMPLETE_DATA,
      `The SafeSnap safe at index ${index} is malformed (invalid or missing network, realityAddress, or transactions)`,
    );
  }
}

export class TxHashMismatchError extends BaseProposalValidationError {
  constructor(snapshotHash: Hash, computedHash: Hash) {
    super(
      ValidationErrorSeverity.SECURITY_ALERT,
      `The transaction details reported by Snapshot GraphQL doesn't correspond with the provided EIP-712 hash. Snapshot Tx Hash was ${snapshotHash}, the validator computed ${computedHash}`,
    );
  }
}

export class SafeHashCalculationError extends BaseProposalValidationError {
  constructor(snapshotHash: Hash, computedHash: Hash) {
    super(
      ValidationErrorSeverity.SECURITY_ALERT,
      `The safe hash reported by Snapshot GraphQL API doesn't match the keccak256 of the concatenation of hashes. Snapshot reported ${snapshotHash}, the validator computed ${computedHash}`,
    );
  }
}

export class SafeNotFoundForProposalNetworkError extends BaseProposalValidationError {
  constructor() {
    super(
      ValidationErrorSeverity.INCOMPLETE_DATA,
      `Snapshot GraphQL API reported no safe under the same network than the proposal`,
    );
  }
}

export class SafeHashMismatchError extends BaseProposalValidationError {
  constructor() {
    super(
      ValidationErrorSeverity.SECURITY_ALERT,
      `The safe hash included in the Reality question doesn't match the safe hash reported by Reality GraphQL API`,
    );
  }
}
