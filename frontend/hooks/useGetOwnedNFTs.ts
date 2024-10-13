import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetCollections } from "@/hooks/useGetCollections";
import { aptosClient } from "@/utils/aptosClient";
import { getIpfsJsonContent } from "@/utils/getIpfsJsonContent";
import { FEATURES, ImageMetadata } from "@/utils/assetsUploader";
import { useEffect } from "react";

export interface NFT extends ImageMetadata {
  id: string;
  collection_id: string;
}

export interface Token {
  current_token_data: {
    collection_id: string;
    token_name: string;
    token_uri: string;
    token_data_id: string;
  };
}

export function useGetOwnedNFTs() {
  const { account } = useWallet();
  const queryClient = useQueryClient();

  const { data: collections } = useGetCollections();

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [account, queryClient, collections]);

  return useQuery({
    queryKey: ["nfts", account?.address],
    enabled: !!account && !!collections,
    queryFn: async () => {
      if (!account || !collections) return null;

      try {
        // Fetch all tokens owned by the account using getAccountOwnedTokens
        const tokens = (await aptosClient().getAccountOwnedTokens({ accountAddress: account.address })) as Token[];

        if (!tokens || tokens.length === 0) {
          return [];
        }

        // Filter tokens by collections
        const filteredTokens = tokens.filter((token) =>
          collections.some((collection) => collection.collection_id === token.current_token_data.collection_id),
        );

        // Fetch token data for each token (assuming standard format)
        const fetchedNFTs: NFT[] = await Promise.all(
          filteredTokens.map(async (token) => {
            const { collection_id, token_name, token_uri, token_data_id } = token.current_token_data;

            // Fetch metadata from token_uri
            const metadata = (await getIpfsJsonContent(token_uri)) as ImageMetadata;

            // Set the proper image based on features
            const image = await setImageBasedOnFeatures(metadata, token_name);

            return {
              ...metadata,
              id: token_data_id,
              collection_id,
              name: token_name,
              image,
            };
          }),
        );

        return fetchedNFTs;
      } catch (error) {
        console.error("Failed to fetch NFTs:", error);
        return null;
      }
    },
  });
}

// Function to set the proper image based on features
async function setImageBasedOnFeatures(metadata: ImageMetadata, token_name: string): Promise<string> {
  let image = metadata.image; // Initialize image with the default metadata image

  for (const feature of FEATURES) {
    const featureData = metadata[feature.keyName];

    if (featureData) {
      const matchingKey = Object.keys(featureData).find((key) => key === token_name);

      if (matchingKey) {
        try {
          const featureMetadata = (await getIpfsJsonContent(featureData[matchingKey])) as ImageMetadata;
          image = featureMetadata.image;

          break;
        } catch (error) {
          console.error(`Error fetching ${feature.name} metadata for ${matchingKey}:`, error);
        }
      }
    }
  }

  return image;
}
