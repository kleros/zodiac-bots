import { expect } from "../../utils/tests-setup";
import { connect, disconnect, getConnection, test } from "./connection";

describe("connection", () => {
  it("performing a cycle of connecting, testing and disconnecting should raise no errors", async () => {
    const connection = connect();
    await test(connection);
    return disconnect(connection);
  });

  describe("test", () => {
    const fn = test;

    it("should work with a valid connection", async () => {
      const connection = connect();
      const result = await fn(connection);
      expect(result).to.be.true;
      return disconnect(connection);
    });

    it("should fail with an invalid connection", async () => {
      const connection = connect("postgres://invalidhost/invaliddatabase");
      return expect(fn(connection)).rejected;
    });
  });

  describe("getConnection", () => {
    const fn = getConnection;

    it("should return a singleton", () => {
      expect(fn()).to.equal(fn());
    });

    it("should return a working connection", async () => {
      const connection = fn();
      const result = await test(connection);
      expect(result).to.be.true;
    });
  });
});
