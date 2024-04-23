import type { WatchContractEventReturnType, Hash, Address } from "viem";

export type SnapshotSpace = {
  id: string;
  name: string;
  network: string;
  plugins: {
    safeSnap: {
      address: Address;
    };
  };
};

export type Answer = {
  answer: Hash | undefined;
  bond: bigint | undefined;
  timestamp: number;
  user: Hash | undefined;
};

export type Proposal = {
  proposalId: string | undefined;
  questionId: Hash;
  answers: Answer[];
};

export type Context = {
  watchers: WatchContractEventReturnType[];
  proposals: Proposal[];
};
