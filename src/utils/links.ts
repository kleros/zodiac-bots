import type { Address } from "viem";
import { AnswerNotification, ValidProposalNotification } from "../notify";
import { env } from "./env";

/**
 * Given a notification, generates a link to the Snapshot propoasal page.
 *
 * @param notification - The notification object related to the triggering event
 *
 * @example
 * const link = getSnapshotProposalLink(notification);
 */
export const getSnapshotProposalLink = (notification: ValidProposalNotification | AnswerNotification): string => {
  const {
    space: { ens },
    event: { snapshotId },
  } = notification;

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
  notification: ValidProposalNotification | AnswerNotification,
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
