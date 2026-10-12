import { EventType, InvalidProposalNotification, TransportName } from "../notify";
import { getTemplateFilePath, render } from "./notification-template";
import { randomizeAnswerNotification, randomizeProposalNotification } from "./test-mocks";
import { expect } from "./tests-setup";
import { env } from "./env";

const unsubscribeEmail = env.SMTP_UNSUBSCRIBE_EMAIL;

describe("Notification templates", () => {
  describe("getTemplateFilePath", () => {
    const fn = getTemplateFilePath;

    it("should resolve the path for a proposal via Telegram", () => {
      const transportName: TransportName = "telegram";
      const result = fn(transportName, EventType.PROPOSAL_QUESTION_VALID);
      expect(result).to.equal("telegram/proposal-valid.ejs");
    });

    it("should resolve the path for a proposal email subject", () => {
      const transportName: TransportName = "email";
      const result = fn(transportName, EventType.PROPOSAL_QUESTION_VALID, "subject");
      expect(result).to.equal("email/proposal-valid-subject.ejs");
    });

    it("should resolve the path for an answer via Slack", () => {
      const transportName: TransportName = "slack";
      const result = fn(transportName, EventType.NEW_ANSWER);
      expect(result).to.equal("slack/answer-issued.ejs");
    });
  });

  describe("render", () => {
    const fn = render;

    // "test" is not a valid transport name, but we store under that name templates that are not
    // expected to be customized, so tests are more predictable
    const transportName = "test" as any as TransportName;

    it("should interpolate a valid Proposal notification into a test template", async () => {
      const notification = randomizeProposalNotification();
      const result = await fn(transportName, notification);

      const { type, space, event } = notification;
      const expectedResult = `
type: ${type}
unsubscribeEmail: ${unsubscribeEmail}
space.ens: ${space.ens}
space.moduleAddress: ${space.moduleAddress}
space.oracleAddress: ${space.oracleAddress}
space.startBlock: ${space.startBlock}
space.lastProcessedBlock: ${space.lastProcessedBlock}
event.txHash: ${event.txHash}
event.blockNumber: ${event.blockNumber}
event.questionId: ${event.questionId}
event.proposalId: ${event.proposalId}
event.snapshotId: ${event.snapshotId}
event.startedAt: ${event.startedAt.toISOString()}
event.finishedAt: ${event.finishedAt.toISOString()}
event.timeout: ${event.timeout}
event.happenedAt: ${event.happenedAt.toISOString()}
`;
      expect(result).to.equal(expectedResult.trim());
    });

    describe("should interpolate an invalid Proposal notification into a test template", async () => {
      const cases = [
        {
          title: "when the notification is a warning due to missing data",
          notification: {
            ...randomizeProposalNotification(),
            type: EventType.PROPOSAL_QUESTION_INCOMPLETE_DATA,
            validationMessage: "This is the warning message reason",
          } as InvalidProposalNotification,
        },
        {
          title: "when the notification is an alert due to validation failure",
          type: EventType.PROPOSAL_QUESTION_ALERT,
          notification: {
            ...randomizeProposalNotification(),
            type: EventType.PROPOSAL_QUESTION_ALERT,
            validationMessage: "This is the alert message reason",
          } as InvalidProposalNotification,
        },
      ];

      cases.forEach(({ title, notification }) => {
        it(title, async () => {
          const result = await fn(transportName, notification);

          const { type, space, event, validationMessage } = notification;
          const expectedResult = `
type: ${type}
unsubscribeEmail: ${unsubscribeEmail}
space.ens: ${space.ens}
space.moduleAddress: ${space.moduleAddress}
space.oracleAddress: ${space.oracleAddress}
space.startBlock: ${space.startBlock}
space.lastProcessedBlock: ${space.lastProcessedBlock}
event.txHash: ${event.txHash}
event.blockNumber: ${event.blockNumber}
event.questionId: ${event.questionId}
event.proposalId: ${event.proposalId}
event.snapshotId: ${event.snapshotId}
event.startedAt: ${event.startedAt.toISOString()}
event.finishedAt: ${event.finishedAt.toISOString()}
event.timeout: ${event.timeout}
event.happenedAt: ${event.happenedAt.toISOString()}
validationMessage: ${validationMessage}
`;
          expect(result).to.equal(expectedResult.trim());
        });
      });
    });

    it("should interpolate an Answer notification into a test template", async () => {
      // "test" is not a valid transport name, but we store under that name templates that are not
      // expected to be customized, so tests are more predictable
      const transportName = "test" as any as TransportName;
      const notification = randomizeAnswerNotification();
      const result = await fn(transportName, notification);

      const { type, space, event } = notification;
      const expectedResult = `
type: ${type}
unsubscribeEmail: ${unsubscribeEmail}
space.ens: ${space.ens}
space.moduleAddress: ${space.moduleAddress}
space.oracleAddress: ${space.oracleAddress}
space.startBlock: ${space.startBlock}
space.lastProcessedBlock: ${space.lastProcessedBlock}
event.txHash: ${event.txHash}
event.blockNumber: ${event.blockNumber}
event.questionId: ${event.questionId}
event.answer: ${event.answer}
event.bond: ${event.bond}
event.user: ${event.user}
event.happenedAt: ${event.happenedAt.toISOString()}
`;
      expect(result).to.equal(expectedResult.trim());
    });
  });

  describe("untrusted proposal id rendering", () => {
    // The Reality module emits the proposer's string verbatim, so every transport that parses
    // markup is a channel to the reviewer deciding whether the proposal is an attack. The
    // sentinels bracket the interpolated value so the assertion cannot catch the template's
    // own legitimate markup.
    const START = "INJECTIONSTART";
    const END = "INJECTIONEND";
    const HOSTILE_ID = `${START}<a href="http://evil">Approved by Kleros</a> *bold* _em_ \`code\` <http://evil|x>${END}`;

    const surfaces: [TransportName, string | undefined][] = [
      ["telegram" as TransportName, undefined],
      ["slack" as TransportName, undefined],
      ["email" as TransportName, "html"],
      ["email" as TransportName, "plain"],
    ];

    surfaces.forEach(([transport, variant]) => {
      it(`should not emit markup from the proposal id via ${transport}${variant ? ` (${variant})` : ""}`, async () => {
        const notification = randomizeProposalNotification();
        notification.event.snapshotId = HOSTILE_ID;

        const rendered = await render(transport, notification, variant);
        const from = rendered.indexOf(START);
        const to = rendered.indexOf(END);

        expect(from, "the proposal id was not interpolated at all").to.be.greaterThan(-1);

        const interpolated = rendered.slice(from, to);

        // The text survives, because it is the evidence a reviewer needs to judge the proposal.
        expect(interpolated).to.contain("Approved by Kleros");
        [...'<>&"`*_[]()|='].forEach((markup) => expect(interpolated).to.not.contain(markup));
      });
    });
  });

  describe("space identification", () => {
    // The group receives alerts for every monitored space, so a reader must be able to tell
    // which DAO an alert belongs to without opening a link. On 2026-09-23 both monitored
    // spaces fired hours apart and the Telegram headers were indistinguishable.
    const surfaces: [TransportName, string | undefined][] = [
      ["telegram" as TransportName, undefined],
      ["slack" as TransportName, undefined],
      ["email" as TransportName, "subject"],
    ];

    surfaces.forEach(([transport, variant]) => {
      it(`should name the space in a proposal notification via ${transport}${variant ? ` (${variant})` : ""}`, async () => {
        const notification = randomizeProposalNotification();

        const rendered = await render(transport, notification, variant);

        expect(rendered).to.contain(notification.space.ens);
      });

      it(`should name the space in an answer notification via ${transport}${variant ? ` (${variant})` : ""}`, async () => {
        const notification = randomizeAnswerNotification();

        const rendered = await render(transport, notification, variant);

        expect(rendered).to.contain(notification.space.ens);
      });
    });
  });
});
