import { Hex } from "viem";
import { formatAnswer, formatWei } from "./format";
import { expect } from "./tests-setup";

describe("formatWei", () => {
  const fn = formatWei;

  it("should display small amounts in wei", () => {
    expect(fn(1n)).to.eql("1 wei");
    expect(fn(10n)).to.eql("10 wei");
    expect(fn(100n)).to.eql("100 wei");
    expect(fn(1_000n)).to.eql("1000 wei");
    expect(fn(10_000n)).to.eql("10000 wei");
    expect(fn(100_000n)).to.eql("100000 wei");
    expect(fn(1_000_000n)).to.eql("1000000 wei");
    expect(fn(9_999_999n)).to.eql("9999999 wei");
  });

  it("should correctly humanize close to the gwei", () => {
    expect(fn(10_000_000n)).to.eql("0.01 gwei");
    expect(fn(100_000_000n)).to.eql("0.1 gwei");
    expect(fn(1_000_000_000n)).to.eql("1 gwei");
    expect(fn(1_500_000_000n)).to.eql("1.5 gwei");
    expect(fn(10_000_000_000n)).to.eql("10 gwei");
    expect(fn(100_000_000_000n)).to.eql("100 gwei");
    expect(fn(1_000_000_000_000n)).to.eql("1000 gwei");
    expect(fn(10_000_000_000_000n)).to.eql("10000 gwei");
    expect(fn(100_000_000_000_000n)).to.eql("100000 gwei");
    expect(fn(1_000_000_000_000_000n)).to.eql("1000000 gwei");
    expect(fn(9_999_999_999_999_999n)).to.eql("9999999.999999999 gwei");
  });

  it("should correctly humanize units close to the ether", () => {
    expect(fn(10_000_000_000_000_000n)).to.eql("0.01 ether");
    expect(fn(100_000_000_000_000_000n)).to.eql("0.1 ether");
    expect(fn(1_000_000_000_000_000_000n)).to.eql("1 ether");
    expect(fn(1_256_000_000_000_000_000n)).to.eql("1.256 ether");
    expect(fn(1_500_000_000_000_000_000n)).to.eql("1.5 ether");
    expect(fn(10_000_000_000_000_000_000n)).to.eql("10 ether");
    expect(fn(100_000_000_000_000_000_000n)).to.eql("100 ether");
  });
});

describe("formatAnswer", () => {
  const fn = formatAnswer;

  it("should return 'Approved' for the hex value '0x1'", () => {
    expect(fn("0x1")).to.equal("Approved");
    expect(fn("0x01")).to.equal("Approved");
    expect(fn("0x0000000000000000000000000001")).to.equal("Approved");
    expect(fn("0x0000000000000000000000000001")).to.equal("Approved");
    expect(fn("0X1" as Hex)).to.equal("Approved");
  });

  it("should return 'Rejected' for the hex value '0x0'", () => {
    expect(fn("0x0")).to.equal("Rejected");
    expect(fn("0x00")).to.equal("Rejected");
    expect(fn("0x0000000000000000000000000000")).to.equal("Rejected");
    expect(fn("0X0" as Hex)).to.equal("Rejected");
  });

  it("should return the original hex value for unexpected values", () => {
    expect(fn("0x2")).to.equal("0x2");
    expect(fn("0x00000000000000000000000000002")).to.equal("0x00000000000000000000000000002");
    expect(fn("0x3")).to.equal("0x3");
    expect(fn("0xffff")).to.equal("0xffff");
  });
});
