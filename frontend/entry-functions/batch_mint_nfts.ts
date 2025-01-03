import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export type BatchMintNftsArguments = {
  tokenNames: string[];
  collectionId: string;
};

export const batchMintNFTs = (args: BatchMintNftsArguments): InputTransactionData => {
  const { tokenNames, collectionId } = args;
  return {
    data: {
      function: `${import.meta.env.VITE_MODULE_ADDRESS}::launchpad::batch_mint_nfts`,
      typeArguments: [],
      functionArguments: [tokenNames, collectionId],
    },
  };
};
