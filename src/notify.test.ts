import type { Hash } from "viem";
import { configurableNotify, EventType, Notification, transports as realTransports, TransportName } from "./notify";
import { expect, mocks } from "./utils/tests-setup";

const transportNames = Object.keys(realTransports) as TransportName[];

describe("configurableNotify - per-log dedup", () => {
  /**
   * Builds in-memory fakes for the transports and the dedup store, so the dedup behaviour can be
   * asserted without a database or real transports.
   */
  const makeNotifyFakes = () => {
    const store: Array<{ txHash: string; logIndex: number; transport: TransportName }> = [];
    const sent: Array<{ type: EventType; txHash: string; logIndex: number; transport: TransportName }> = [];

    const transports = Object.fromEntries(
      transportNames.map((name) => [
        name,
        async (notification: Notification) => {
          sent.push({
            type: notification.type,
            txHash: notification.event.txHash,
            logIndex: notification.event.logIndex,
            transport: name,
          });
        },
      ]),
    ) as typeof realTransports;

    const findUsedTransportsFn = async (txHash: Hash, logIndex: number): Promise<TransportName[]> =>
      store
        .filter((record) => record.txHash === txHash && record.logIndex === logIndex)
        .map((record) => record.transport);

    const insertUsedTransportFn = async (notification: Notification, transport: TransportName): Promise<void> => {
      store.push({ txHash: notification.event.txHash, logIndex: notification.event.logIndex, transport });
    };

    return { store, sent, transports, findUsedTransportsFn, insertUsedTransportFn };
  };

  it("notifies both a question and an answer that share a transaction but differ in log index", async () => {
    const fakes = makeNotifyFakes();
    const txHash = mocks.getRandomHash();

    const question = mocks.randomizeProposalNotification();
    const answer = mocks.randomizeAnswerNotification();
    question.event.txHash = txHash;
    question.event.logIndex = 43;
    answer.event.txHash = txHash;
    answer.event.logIndex = 44;

    await configurableNotify({
      notification: question,
      transports: fakes.transports,
      findUsedTransportsFn: fakes.findUsedTransportsFn,
      insertUsedTransportFn: fakes.insertUsedTransportFn,
    });
    await configurableNotify({
      notification: answer,
      transports: fakes.transports,
      findUsedTransportsFn: fakes.findUsedTransportsFn,
      insertUsedTransportFn: fakes.insertUsedTransportFn,
    });

    const answersSent = fakes.sent.filter((record) => record.type === EventType.NEW_ANSWER);
    expect(answersSent).to.have.lengthOf(transportNames.length);
    const questionsSent = fakes.sent.filter((record) => record.type !== EventType.NEW_ANSWER);
    expect(questionsSent).to.have.lengthOf(transportNames.length);
  });

  it("does not notify the same log twice across reprocessing", async () => {
    const fakes = makeNotifyFakes();
    const deps = {
      notification: mocks.randomizeAnswerNotification(),
      transports: fakes.transports,
      findUsedTransportsFn: fakes.findUsedTransportsFn,
      insertUsedTransportFn: fakes.insertUsedTransportFn,
    };

    await configurableNotify(deps);
    await configurableNotify(deps);

    expect(fakes.sent).to.have.lengthOf(transportNames.length);
  });
});
