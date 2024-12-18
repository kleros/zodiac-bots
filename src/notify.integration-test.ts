import sinon, { SinonSpy } from "sinon";
import { configurableNotify, notify, transportNames, transports } from "./notify";
import { expect } from "./utils/tests-setup";
import { randomizeProposalNotification } from "./utils/test-mocks";
import { findUsedTransports, insertUsedTransport } from "./services/db/notifications";

describe("Notify", () => {
  const fn = configurableNotify;

  let transportsMock: typeof transports;
  beforeEach(() => {
    transportsMock = {
      telegram: sinon.spy(),
      slack: sinon.spy(),
      email: sinon.spy(),
    };
  });

  it("should notify all the transports under normal cirumstances", async () => {
    const notification = randomizeProposalNotification();

    await fn({
      notification,
      transports: transportsMock,
      findUsedTransportsFn: findUsedTransports,
      insertUsedTransportFn: insertUsedTransport,
    });

    expect((transportsMock.telegram as SinonSpy).calledOnce, "telegram not notified").to.be.true;
    expect((transportsMock.slack as SinonSpy).calledOnce, "slack not notified").to.be.true;

    expect((transportsMock.email as SinonSpy).calledOnce, "email not notified").to.be.true;
    const usedTransports = await findUsedTransports(notification.event.txHash);
    expect(usedTransports).to.have.lengthOf(transportNames.length);
  });

  it("should skip transports that are already used for the txHash", async () => {
    const notification = randomizeProposalNotification();
    await insertUsedTransport(notification, "telegram");

    await fn({
      notification,
      transports: transportsMock,
      findUsedTransportsFn: findUsedTransports,
      insertUsedTransportFn: insertUsedTransport,
    });

    expect((transportsMock.telegram as SinonSpy).calledOnce, "telegram unexpectedly notified").to.be.false;
    expect((transportsMock.slack as SinonSpy).calledOnce, "slack not notified").to.be.true;
    expect((transportsMock.email as SinonSpy).calledOnce, "email not notified").to.be.true;

    const usedTransports = await findUsedTransports(notification.event.txHash);
    expect(usedTransports).to.have.lengthOf(transportNames.length);
  });
});
