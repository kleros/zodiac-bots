import { AnswerNotification, ProposalNotification } from "../notify";

export const getSnapshotProposalLink = (notification: ProposalNotification): string => {
  const {
    space: { ens },
    event: { snapshotId },
  } = notification;

  return `https://snapshot.org/#/${ens}/proposal/${snapshotId}`;
};

export const getRealityAnswerLink = (notification: AnswerNotification): string => {
  const {
    space: { oracleAddress },
    event: { questionId },
  } = notification;
  return `https://reality.eth.limo/app/#!/question/${oracleAddress}-${questionId}/token/ETH`;
};