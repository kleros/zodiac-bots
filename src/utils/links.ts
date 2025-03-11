import type { Address } from "viem";
import { AnswerNotification, ProposalNotification } from "../notify";
import { env } from "./env";

/**
 * Given a notification, generates a link to the Snapshot propoasal page.
 *
 * @param notification - The notification object related to the triggering event
 *
 * @example
 * const link = getSnapshotProposalLink(notification);
 */
export const getSnapshotProposalLink = (notification: ProposalNotification | AnswerNotification): string => {
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
 *
 * @example
 * const link = getRealityQuestionLink(notification);
 */
export const getRealityQuestionLink = (
  notification: ProposalNotification | AnswerNotification,
  template: string = env.REALITY_LINK_TEMPLATE,
): string => {
  const {
    space: { oracleAddress },
    event: { questionId },
  } = notification;
  return interpolateUrlTemplate(template, { oracleAddress, questionId });
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
