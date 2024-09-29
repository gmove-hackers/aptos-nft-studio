import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetCollections } from "@/hooks/useGetCollections";
import { aptosClient } from "@/utils/aptosClient";
import { getIpfsJsonContent } from "@/utils/getIpfsJsonContent";
import { ImageMetadata } from "@/utils/assetsUploader";
import { useEffect } from "react";

export interface NFT {
  id: string;
  collection_id: string;
  name: string;
  image: string;
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

            const metadata = (await getIpfsJsonContent(token_uri)) as ImageMetadata;

            let image = metadata.image;

            // If combined NFT, set the proper image
            if (metadata.combinations) {
              const combinedName = Object.keys(metadata.combinations).find((key) => key === token_name);
              if (combinedName) {
                const combinedMetadata = (await getIpfsJsonContent(
                  metadata.combinations[combinedName],
                )) as ImageMetadata;
                image = combinedMetadata.image;
              }
            }

            return {
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
