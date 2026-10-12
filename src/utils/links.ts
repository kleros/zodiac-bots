import type { Address } from "viem";
import { Notification } from "../notify";
import { isSnapshotProposalId } from "./snapshot-proposal-id";
import { env } from "./env";

/**
 * Given a notification, generates a link to the Snapshot proposal page.
 *
 * Returns `null` for an id that cannot address a real proposal, so attacker text is never
 * rendered as a working link.
 *
 * @param notification - The notification object related to the triggering event
 * @returns The proposal URL, or `null` when the proposal id cannot address a proposal
 *
 * @example
 * const link = getSnapshotProposalLink(notification);
 * if (link) console.log(link);
 */
export const getSnapshotProposalLink = (notification: Notification): string | null => {
  const {
    space: { ens },
    event: { snapshotId },
  } = notification;

  if (!isSnapshotProposalId(snapshotId)) return null;

  return `https://snapshot.org/#/${ens}/proposal/${snapshotId}`;
};

/**
 * Interpolate a string representing a link with the given fields.
 *
 * @param template - The string template with placeholders for the fields using basic interpolation Handlebar syntax
 * @param fields - The fields to be interpolated
 *
 * @example
 * const link = interpolateUrlTemplate('http://example.com/{{foo}}', { foo: 'bar' }) // results in 'http://example.com/bar'
 *
 */
export const interpolateUrlTemplate = (template: string, fields: Record<string, string>): string => {
  return Object.entries(fields).reduce((acc, [key, value]) => {
    return acc.replace(`{{${key}}}`, value);
  }, template);
};

/**
 * Given a notification, generates a link to the Reality question page.
 *
 * @param notification - The notification object related to the triggering event
 * @param template - An string with handlebar-like syntax with the link structure
 * @param chainId - The chain the question lives on. This should be the chain of the space's
 *   oracle/module, but that is not modeled or stored yet, so it defaults to the monitored chain.
 *
 * @example
 * const link = getRealityQuestionLink(notification);
 */
export const getRealityQuestionLink = (
  notification: Notification,
  template: string = env.REALITY_LINK_TEMPLATE,
  chainId: string = env.CHAIN_ID.toString(),
): string => {
  const {
    space: { oracleAddress },
    event: { questionId },
  } = notification;
  return interpolateUrlTemplate(template, {
    chainId,
    oracleAddress: oracleAddress.toLowerCase(),
    questionId: questionId.toLowerCase(),
  });
};

/**
 * Given a transaction hash, generates a link to the block explorer (for example, Etherscan)
 *
 * @param txHash - The transaction hash
 * @param template - An string with handlebar-like syntax with the link structure
 *
 * @example
 * const link = getBlockExplorerLinkForTx('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
 */
export const getBlockExplorerLinkForTx = (
  txHash: Address,
  template: string = env.BLOCK_EXPLORER_TX_LINK_TEMPLATE,
): string => {
  return interpolateUrlTemplate(template, { txHash });
};
