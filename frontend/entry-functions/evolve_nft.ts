import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export type evolveNFTArguments = {
  main_collection: string;
  main_nft: string;
};

export const evolveNFT = (args: evolveNFTArguments): InputTransactionData => {
  const { main_collection, main_nft } = args;
  return {
    data: {
      function: `${import.meta.env.VITE_MODULE_ADDRESS}::launchpad::evolve_nft`,
      typeArguments: [],
      functionArguments: [main_collection, main_nft],
    },
  };
};
