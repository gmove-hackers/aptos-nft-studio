import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export type AirdropNftsArguments = {
  nftObjects: string[];
  recipientAddresses: string[];
};

export const airdropNFTs = (args: AirdropNftsArguments): InputTransactionData => {
  const { nftObjects, recipientAddresses } = args;
  return {
    data: {
      function: `${import.meta.env.VITE_MODULE_ADDRESS}::launchpad::airdrop_nfts`,
      typeArguments: [],
      functionArguments: [nftObjects, recipientAddresses],
    },
  };
};
