import { EventType, TransportName, transportNames } from "../notify";
import { getTemplateFilePath, render } from "./notification-template";
import { randomizeProposalNotification } from "./test-mocks";
import { expect } from "./tests-setup";

describe("Notification templates", () => {
  describe("getTemplateFilePath", () => {
    const fn = getTemplateFilePath;

    it("should resolve the path for a proposal via Telegram", () => {
      const transportName: TransportName = "telegram";
      const result = fn(transportName, EventType.PROPOSAL_QUESTION_CREATED);
      expect(result).to.equal("telegram/proposal-created.ejs");
    });

    it("should resolve the path for a proposal email subject", () => {
      const transportName: TransportName = "email";
      const result = fn(transportName, EventType.PROPOSAL_QUESTION_CREATED, "subject");
      expect(result).to.equal("email/proposal-created-subject.ejs");
    });

    it("should resolve the path for an answer via Slack", () => {
      const transportName: TransportName = "slack";
      const result = fn(transportName, EventType.NEW_ANSWER);
      expect(result).to.equal("slack/answer-issued.ejs");
    });
  });

  describe("render", () => {
    const fn = render;

    it("should interpolate a notification into a test template", async () => {
      // "test" is not a valid transport name, but we store under that name templates that are not
      // expected to be customized, so tests are more predictable
      const transportName = "test" as any as TransportName;
      const notification = randomizeProposalNotification();
      const result = await fn(transportName, notification);
      const expectedResult = `
type: ${notification.type}
space.ens: ${notification.space.ens}
space.startBlock: ${notification.space.startBlock}
space.lastProcessedBlock: ${notification.space.lastProcessedBlock}
event.txHash: ${notification.event.txHash}
event.blockNumber: ${notification.event.blockNumber}
event.questionId: ${notification.event.questionId}
event.proposalId: ${notification.event.proposalId}`;
      expect(result).to.equal(expectedResult.trim());
    });
  });
});
