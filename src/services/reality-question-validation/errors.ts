import { Hash } from "viem";

export enum ValidationErrorSeverity {
  SECURITY_ALERT = "security-alert",
  INCOMPLETE_DATA = "incomplete-data",
}

export class BaseProposalValidationError extends Error {
  public severity: ValidationErrorSeverity;

  constructor(severity: ValidationErrorSeverity, message: string) {
    super(message); // Pass message to the Error constructor
    this.severity = severity;
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
