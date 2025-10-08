import { Address, Hex, Hash, hashTypedData } from "viem";

const types = {
  Transaction: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

type Domain = {
  chainId: number;
  verifyingContract: Address;
};

type Message = {
  to: Address;
  value: bigint;
  data: Hex;
  operation: number;
  nonce: bigint;
};

/**
 * Compute the EIP-712 typed-data hash for a Transaction
 *
 * @param domain - EIP0712 domain separator
 * @param message - Typed data instance (matching Transaction type)
 * @returns EIP-712 message digest for the given domain + message
 *
 * @example
 * const txHash = calculateTxHash(domain, message);
 */
export const calculateTxHash = (domain: Domain, message: Message): Hash => {
  return hashTypedData({
    domain,
    types,
    primaryType: "Transaction",
    message,
  });
};
