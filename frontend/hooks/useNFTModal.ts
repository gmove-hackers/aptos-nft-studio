import { createContext, useEffect, useState } from "react";
import { NFT } from "./useGetOwnedNFTs";
import { GetCollectionDataResponse } from "@aptos-labs/ts-sdk";

export interface NFTWithCollectionData extends NFT {
  collection: GetCollectionDataResponse;
}

export const NFTModalContext = createContext<Undefineder<ReturnType<typeof useNFTModal>>>({});

export function useNFTModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nft, setNFT] = useState<NFTWithCollectionData | null>();

  useEffect(() => {
    if (!isModalOpen) {
      setNFT(null);
    }
  }, [isModalOpen]);

  return {
    isModalOpen: {
      state: isModalOpen,
      dispatch: setIsModalOpen,
    },
    nft: {
      state: nft,
      dispatch: setNFT,
    },
  };
}
