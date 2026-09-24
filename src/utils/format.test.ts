import { Hex } from "viem";
import { formatAnswer, formatWei, DISPLAYED_PROPOSAL_ID_MAX_LENGTH, toDisplaySafe } from "./format";
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
    const mainnetChainId = 1;
    expect(fn(10_000_000_000_000_000n, mainnetChainId)).to.eql("0.01 ETH");
    expect(fn(100_000_000_000_000_000n, mainnetChainId)).to.eql("0.1 ETH");
    expect(fn(1_000_000_000_000_000_000n, mainnetChainId)).to.eql("1 ETH");
    expect(fn(1_256_000_000_000_000_000n, mainnetChainId)).to.eql("1.256 ETH");
    expect(fn(1_500_000_000_000_000_000n, mainnetChainId)).to.eql("1.5 ETH");
    expect(fn(10_000_000_000_000_000_000n, mainnetChainId)).to.eql("10 ETH");
    expect(fn(100_000_000_000_000_000_000n, mainnetChainId)).to.eql("100 ETH");
  });

  it("should resolve the whole-unit symbol from the provided chain", () => {
    const gnosisChainId = 100;
    expect(fn(1_000_000_000_000_000_000n, gnosisChainId)).to.eql("1 XDAI");
    expect(fn(100_000_000_000_000_000n, gnosisChainId)).to.eql("0.1 XDAI");
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

describe("toDisplaySafe()", () => {
  const passthrough: [string, string][] = [
    ["an EIP-712 hash id", "0xb4c8c69b55a442948a7d66b42ac418ae22cad057fee7fbcb0c27a8768bfd3541"],
    ["an IPFS CIDv0 id", "QmTwFAbf6PPKt11tBVXwiDMk2QY4hP41Mi4hfJzNqE9GYL"],
    ["an IPFS CIDv1 id", "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"],
  ];

  passthrough.forEach(([description, proposalId]) => {
    it(`should leave ${description} untouched`, () => {
      expect(toDisplaySafe(proposalId)).to.equal(proposalId);
    });
  });

  it("should keep an attacker's prose readable, since that is the evidence", () => {
    const prose = "To avoid any risks associated with the safe module, funds will be transferred.";

    expect(toDisplaySafe(prose)).to.equal(prose);
  });

  const neutralized: [string, string][] = [
    ["HTML, which the email transport renders", '<a href="x">Approved by Kleros</a>'],
    ["Telegram Markdown emphasis", "*Approved* _by_ Kleros"],
    ["a Telegram code span break-out", "0xdead` see [here](http://evil)"],
    ["a Slack mrkdwn link", "<http://evil|Approved by Kleros>"],
    ["an HTML entity", "&lt;script&gt;"],
    ["a newline, which could split a message", "0xdead\nApproved by Kleros"],
  ];

  neutralized.forEach(([description, proposalId]) => {
    it(`should neutralize ${description}`, () => {
      const rendered = toDisplaySafe(proposalId);

      [..."<>&`*_[]()|~\n"].forEach((char) => expect(rendered).to.not.contain(char));
    });
  });

  it("should bound the length so a transport limit cannot be reached", () => {
    const oversized = "a".repeat(DISPLAYED_PROPOSAL_ID_MAX_LENGTH + 5000);

    const rendered = toDisplaySafe(oversized);

    expect(rendered.length).to.be.lessThan(DISPLAYED_PROPOSAL_ID_MAX_LENGTH + 40);
    expect(rendered).to.contain("[+5000 chars]");
  });
});
