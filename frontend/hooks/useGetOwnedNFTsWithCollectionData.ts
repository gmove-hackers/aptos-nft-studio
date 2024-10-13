import { useMemo } from "react";
import { useGetCollections } from "./useGetCollections";
import { useGetOwnedNFTs } from "./useGetOwnedNFTs";
import { NFTWithCollectionData } from "./useNFTModal";

export function useGetOwnedNFTsWithCollectionData() {
  const { data: collections, isLoading: collectionsLoading } = useGetCollections();
  const {
    data: ownedNFTs,
    isLoading: nftsLoading,
    isPending: nftsPending,
    isFetching: nftsFetching,
  } = useGetOwnedNFTs();

  const data = useMemo(() => {
    if (!collections || !ownedNFTs) return undefined;

    const nfts: NFTWithCollectionData[] = [];

    ownedNFTs.forEach((nft) => {
      const collection = collections.find((c) => c.collection_id === nft.collection_id);
      if (collection) {
        nfts.push({ ...nft, collection });
      }
    });

    return nfts;
  }, [collections, ownedNFTs]);

  return {
    data,
    isLoading: collectionsLoading || nftsLoading || nftsPending,
    isFetching: nftsFetching,
  };
}
