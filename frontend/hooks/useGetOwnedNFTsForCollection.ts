import { useMemo } from "react";
import { useGetOwnedNFTsByCollection } from "./useGetOwnedNFTsByCollection";

export function useGetOwnedNFTsForCollection(collectionId: string | undefined) {
  const { data: collectionsWithNFTs, isLoading, isFetching } = useGetOwnedNFTsByCollection();

  const data = useMemo(() => {
    if (!collectionsWithNFTs || !collectionId) return undefined;
    const collection = collectionsWithNFTs.find((c) => c.collection_id === collectionId);
    return collection?.nfts ?? [];
  }, [collectionsWithNFTs, collectionId]);

  return {
    data,
    isLoading,
    isFetching,
  };
}
