import { aptosClient } from "@/utils/aptosClient";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ImageMetadata } from "@/utils/assetsUploader";
import { IpfsImage } from "@/components/IpfsImage";
import { Button } from "@/components/ui/button";
import { combineNFT } from "@/entry-functions/combine_nft";
import { getIpfsJsonContent } from "@/utils/getIpfsJsonContent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetCollections } from "@/hooks/useGetCollections";
import { GetCollectionDataResponse } from "@aptos-labs/ts-sdk";
import { Header } from "@/components/Header";

interface NFT {
  id: string;
  collection_id: string;
  name: string;
  image: string;
}

interface Token {
  current_token_data: {
    collection_id: string;
    token_name: string;
    token_uri: string;
    token_data_id: string;
  };
}

export function MyNFTs() {
  const { account } = useWallet();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const collections: Array<GetCollectionDataResponse> = useGetCollections();

  // fetch NFTs for the connected wallet
  const nftsQuery = useQuery({
    queryKey: ["nfts", account?.address],
    queryFn: async () => {
      if (!account) return [];

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
        return [];
      }
    },
  });

  const allNFTs = nftsQuery.data || [];

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [account, queryClient, collections]);




  return (
    <>
      <Header />

      <div className="container mx-auto p-4 pb-16">
        <h2 className="text-3xl text-center font-bold">View Your NFTs</h2>
        <div className="bg-center bg-[length:120%] bg-no-repeat relative before:content-[''] before:block before:pt-[70.8%] lg:mt-[-3rem] md:mt-[-2rem] sm:mt-[-1rem]">
          <div className="absolute w-full h-full top-0 left-0 pt-[22.4%]">


            <div className="grid grid-cols-5 gap-4">
              {allNFTs.map((nft) => {

                return (
                  <div
                    key={nft.id}
                  >
                    <div
                      className={`relative p-2 border `}
                    >
                      <div
                        className={`w-full h-full object-cover `}
                      >
                        <IpfsImage ipfsUri={nft.image} />
                      </div>
                    </div>
                    <p className={`text-center pt-2 `}>{nft.name}</p>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

interface AreaProps {
  selectedNFT: NFT | null;
  onClick: () => void;
  type: "main" | "secondary";
}

const Area = ({ selectedNFT, onClick, type }: AreaProps) => {
  return (
    <div className="w-1/3 relative before:content-[''] before:block before:pt-[141.53%]">
      <div className="absolute w-full h-full top-0 left-0 cursor-pointer" onClick={onClick}>
        <div className="absolute w-full h-full top-0 left-0 pointer-events-none bg-areaCard bg-contain bg-no-repeat drop-shadow-areaCard"></div>
        {selectedNFT ? (
          <div>
            <div>
              <IpfsImage ipfsUri={selectedNFT.image} className="absolute w-full h-full top-0 left-0 object-contain" />
            </div>
          </div>
        ) : (
          <p className="absolute top-0 right-0 text-center w-full translate-y-[-120%] text-vw16 font-medium text-primary-foreground bg-gray-800/80 py-[3.5%] rounded-sm">
            Click to select the
            <br />
            {type[0].toUpperCase() + type.slice(1)} NFT
          </p>
        )}
      </div>
    </div>
  );
};