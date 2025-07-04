import { NETWORK } from "@/constants";
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";

const aptos = new Aptos(
  new AptosConfig({
    network: NETWORK,
    fullnode: "https://full.mainnet.movementinfra.xyz/v1",
    indexer: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
  }),
);

// Reuse same Aptos instance to utilize cookie based sticky routing
export function aptosClient() {
  return aptos;
}
