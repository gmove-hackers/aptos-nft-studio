import { getIpfsJsonContent } from "@/utils/getIpfsJsonContent";
import { getNumberActiveNFTs } from "@/view-functions/get_number_active_nfts";
import { GetCollectionDataResponse } from "@aptos-labs/ts-sdk";
import { useQuery } from "@tanstack/react-query";

export function useGetCollectionDetailData(collection: GetCollectionDataResponse) {
  // fetch collection metadata and minted nfts amount
  const dataQuery = useQuery({
    queryKey: ["collection", collection.collection_id],
    queryFn: async () => {
      try {
        const data = await Promise.all([
          getIpfsJsonContent(collection.uri),
          getNumberActiveNFTs({ collection_id: collection.collection_id }),
        ]);

        return data;
      } catch (error) {
        console.error("Error fetching collection data:", error);
        return [null, null];
      }
    },
  });

  const [metadata, mintedNfts] = dataQuery.data || [undefined, undefined];

  return { metadata, mintedNfts };
}
