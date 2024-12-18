import { formatEther, formatGwei, Hex } from "viem";

/**
 * Converts a wei amount to a human-readable string in wei, gwei, or ether.
 *
 * - Values less than 0.01 gwei are displayed in wei.
 * - Values from 0.01 gwei up to 0.01 ether are displayed in gwei.
 * - Values equal to or greater than 0.01 ether are displayed in ether.
 *
 * @param {bigint} wei - The amount in wei to be converted.
 * @returns {string} - The human-readable string representation of the wei amount.
 *
 * @example
 * formatWei(1_000n); // "1000 wei"
 * formatWei(10_000_000n); // "0.01 gwei"
 * formatWei(100_0000_000n); // "1 gwei"
 * formatWei(100_000_000_000_000_000n); // "0.1 ether"
 * formatWei(1_000_000_000_000_000_000n); // "1 ether"
 */

export const formatWei = (wei: bigint): string => {
  const digitCount = wei.toString().length;

  if (digitCount < 8) return `${wei.toString()} wei`;
  if (digitCount < 17) return `${formatGwei(wei)} gwei`;
  return `${formatEther(wei)} ether`;
};

/**
 * Transforms a Reality Oracle answer to a human-readable string. Returns the original
 * answer when it is not an expected value.
 *
 * Reality Oracle Answers provide a hexadecimal value of '0x0' or '0x1' to represent
 * rejection or approval respectively.
 *
 * @param answer - The hex value representing the Reality Oracle answer.
 * @returns The human-readable string "Approved" or "Rejected", or the original
 * hex value if it is not '0x0' or '0x1'.
 *
 * @example
 * formatAnswer('0x1'); // "Approved"
 * formatAnswer('0x0'); // "Rejected"
 * formatAnswer('0x2'); // "0x2"
 */
export const formatAnswer = (answer: Hex): string => {
  const num = parseInt(answer, 16);

  if (num == 1) return "Approved";
  if (num == 0) return "Rejected";

  return answer;
};
