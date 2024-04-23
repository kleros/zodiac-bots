import { WatchContractEventReturnType } from "viem";

export type SnapshotSpace = {
  id: string;
  name: string;
  network: string;
  plugins: {
    safeSnap: {
      address: `0x${string}`;
    };
  };
};

export type Answer = {
  answer: `0x${string}` | undefined;
  bond: bigint | undefined;
  timestamp: number;
  user: `0x${string}` | undefined;
};

export type Proposal = {
  proposalId: string | undefined;
  questionId: `0x${string}`;
  answers: Answer[];
};

export type Context = {
  watchers: WatchContractEventReturnType[];
  proposals: Proposal[];
};
