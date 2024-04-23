import dotenv from "dotenv";
import { start, stop, OnNewAnswerHandler, OnNewProposalHandler } from "./bot";

dotenv.config();

const main = async () => {
  const snapshotSpaceId = "1inch.eth"; // TODO: get this from parameters or configuration file
  const onNewProposal: OnNewProposalHandler = async (proposal) => {};
  const onNewAnswer: OnNewAnswerHandler = async (proposal) => {};

  await start(snapshotSpaceId, onNewProposal, onNewAnswer);
  await new Promise((resolve) => setTimeout(resolve, 60000));
  // WARNING: it will exit the process after 1 minute, should be handled more gracefully
};

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    stop();
  });
