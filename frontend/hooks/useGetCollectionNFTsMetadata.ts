import { ImageMetadata } from "@/utils/assetsUploader";
import { convertIpfsCollectionUriToCidUri } from "@/utils/convertIpfsCollectionUriToCidUri";
import { getIpfsJsonContent } from "@/utils/getIpfsJsonContent";
import { GetCollectionDataResponse } from "@aptos-labs/ts-sdk";
import { useQuery } from "@tanstack/react-query";

export function useGetCollectionNFTsMetadata(collection: GetCollectionDataResponse | null) {
  return useQuery({
    queryKey: ["collectionNFTsMetadata", collection?.collection_id],
    enabled: !!collection,
    queryFn: async () => {
      if (!collection) return null;

      try {
        const baseUri = convertIpfsCollectionUriToCidUri(collection.uri);
        const data = await Promise.all(
          Array.from({ length: collection.max_supply }).map(async (_, i) => {
            const uri = baseUri + `/${i + 1}.json`;
            try {
              return (await getIpfsJsonContent(uri)) as ImageMetadata;
            } catch (error) {
              console.error(`Error fetching ${uri}:`, error);
              return null;
            }
          }),
        );

        return data.filter((v) => v !== null);
      } catch (error) {
        console.error("Error fetching collection NFTs metadata:", error);
        return null;
      }
    },
  });
}
