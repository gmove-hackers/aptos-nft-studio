import { useMemo } from "react";
import { useGetCollections } from "./useGetCollections";
import { NFT, useGetOwnedNFTs } from "./useGetOwnedNFTs";
import { GetCollectionDataResponse } from "@aptos-labs/ts-sdk";

export interface CollectionWithNFTs extends GetCollectionDataResponse {
  nfts: NFT[];
}

export function useGetOwnedNFTsByCollection() {
  const { data: collections, isLoading: collectionsLoading } = useGetCollections();
  const { data: ownedNFTs, isLoading: nftsLoading, isPending: nftsPending } = useGetOwnedNFTs();

  const data = useMemo(() => {
    if (!collections || !ownedNFTs) return undefined;

    const groupedNFTs: CollectionWithNFTs[] = [];

    ownedNFTs.forEach((nft) => {
      const collection = collections.find((c) => c.collection_id === nft.collection_id);
      if (!collection) return;

      const existingCollection = groupedNFTs.find((c) => c.collection_id === collection.collection_id);
      if (existingCollection) {
        existingCollection.nfts.push(nft);
      } else {
        groupedNFTs.push({ ...collection, nfts: [nft] });
      }
    });

    return groupedNFTs;
  }, [collections, ownedNFTs]);

  return {
    data,
    isLoading: collectionsLoading || nftsLoading || nftsPending,
  };
}
