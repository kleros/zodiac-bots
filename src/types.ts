import { SpaceAddresses } from "./services/reality";

export type Space = {
  ens: string;
  startBlock: bigint;
  lastProcessedBlock?: bigint | null;
} & SpaceAddresses;

export type ParsedSpace = Pick<Space, "ens" | "startBlock"> & Partial<Pick<Space, "moduleAddress">>;
