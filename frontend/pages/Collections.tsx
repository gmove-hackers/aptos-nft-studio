import { Link, useNavigate } from "react-router-dom";
import { GetCollectionDataResponse } from "@aptos-labs/ts-sdk";
// Internal components
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { IpfsImage } from "@/components/IpfsImage";
// Internal hooks
import { useGetCollections } from "@/hooks/useGetCollections";
// Internal constants
import { NETWORK } from "@/constants";
import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Button } from "@/components/ui/button";
import { mintNFT } from "@/entry-functions/mint_nft";
import { addCombinationRule } from "@/entry-functions/add_combination_rule";
import { aptosClient } from "@/utils/aptosClient";
import { convertIpfsUriToCid } from "@/utils/convertIpfsUriToCid";
import { ImageMetadata, ipfs } from "@/utils/assetsUploader";
import { getIpfsJsonContent } from "@/utils/getIpfsJsonContent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNumberActiveNFTs } from "@/view-functions/get_number_active_nfts";
import { Header } from "@/components/Header";

export function Collections() {
  const collections: Array<GetCollectionDataResponse> = useGetCollections();

  return (
    <>
      <Header />
      <div className="max-w-screen-xl mx-auto py-3 bg-primary-foreground/90 rounded-xl text-primary overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
          {collections.length > 0 &&
            collections.map((collection) => (
              <CollectionCard key={collection?.collection_id} collection={collection} />
              
            ))}
        </div>
      </div>
    </>
  );
}

export const CollectionTableHeader = () => {
  return (
    <TableHeader>
      <TableRow className="hover:bg-inherit">
        <TableHead>Collection</TableHead>
        <TableHead>Collection Address</TableHead>
        <TableHead>Minted NFTs</TableHead>
        <TableHead>Max Supply</TableHead>
      </TableRow>
    </TableHeader>
  );
};

interface CollectionCardProps {
  collection: GetCollectionDataResponse;
}

const CollectionCard = ({ collection }: CollectionCardProps) => {
  const { account, signAndSubmitTransaction } = useWallet();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const [isUploading, setIsUploading] = useState(false);

  const combinationMainCollection = collection.collection_id;
  const [combinationMainTokenName, setCombinationMainTokenName] = useState<string>();
  const [combinationSecondaryCollection, setCombinationSecondaryCollection] = useState<string>();
  const [combinationSecondaryTokenName, setCombinationSecondaryTokenName] = useState<string>();
  const [combinationResultTokenName, setCombinationResultTokenName] = useState<string>();

  const onClickCard = () => {
    navigate(`/collection/${collection.collection_id}`);
  };
 // Mint NFT
 const executeMintNft = async () => {
  try {
    if (!account) throw new Error("Please connect your wallet");
    // if (!mintAmount) throw new Error("Please set the amount");
    if (isUploading) throw new Error("Uploading in progress");
    setIsUploading(true);

    // Get the next token metadata based on the number of tokens already minted
    const totalMinted = await getNumberActiveNFTs({ collection_id: collection.collection_id }); // refetch the number of minted NFTs
    const nextTokenIndex = Number(totalMinted) + 1; // e.g., if 2 tokens minted, next is 3.json
    const cid = convertIpfsUriToCid(collection.uri).replace("/collection.json", ""); // Get the CID for the collection
    const tokenMetadataUrl = `${cid}/${nextTokenIndex}.json`; // Build the URL for the next token metadata

    // Fetch the token metadata from IPFS
    const stream = ipfs.cat(tokenMetadataUrl);
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Concatenate the chunks and parse the metadata JSON
    const contentBytes = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      contentBytes.set(chunk, offset);
      offset += chunk.length;
    }

    const contentText = new TextDecoder().decode(contentBytes);
    const tokenMetadata: ImageMetadata = JSON.parse(contentText);

    if (!tokenMetadata || !tokenMetadata.name) {
      throw new Error("Failed to retrieve token metadata or token name");
    }

    // Submit a mint_nft entry function transaction
    const response = await signAndSubmitTransaction(
      mintNFT({
        tokenName: tokenMetadata.name, // Set the token name from the metadata
        collectionId: collection.collection_id,
        amount: 1,
      }),
    );

    // Wait for the transaction to be commited to chain
    await aptosClient().waitForTransaction({
      transactionHash: response.hash,
    });
    await queryClient.invalidateQueries();
  } catch (error) {
    alert(error);
  } finally {
    setIsUploading(false);
  }
};

// Add combination rule
const executeAddCombinationRule = async () => {
  try {
    if (!account) throw new Error("Please connect your wallet");
    if (!combinationMainTokenName) throw new Error("Please set the main token name");
    if (!combinationSecondaryCollection) throw new Error("Please set the secondary collection");
    if (!combinationSecondaryTokenName) throw new Error("Please set the secondary token name");
    if (!combinationResultTokenName) throw new Error("Please set the result token name");
    if (isUploading) throw new Error("Uploading in progress");
    setIsUploading(true);

    // Submit a add_combination_rule entry function transaction
    const response = await signAndSubmitTransaction(
      addCombinationRule({
        main_collection: combinationMainCollection,
        main_token: combinationMainTokenName,
        secondary_collection: combinationSecondaryCollection,
        secondary_token: combinationSecondaryTokenName,
        result_token: combinationResultTokenName,
      }),
    );

    // Wait for the transaction to be commited to chain
    const committedTransactionResponse = await aptosClient().waitForTransaction({
      transactionHash: response.hash,
    });
    await queryClient.invalidateQueries();

    // Once the transaction has been successfully commited to chain,
    if (committedTransactionResponse.success) {
      // navigate to the `craft-nft` page
      navigate(`/craft-nft`);
    }
  } catch (error) {
    alert(error);
  } finally {
    setIsUploading(false);
  }
};

  return (
    <div 
      onClick={onClickCard}
      className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
    >
      <div className="relative pb-[100%]">
        {metadata && (
          <IpfsImage 
            ipfsUri={metadata.image} 
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{collection?.collection_name}</h3>
        <p className="text-sm text-gray-600">
          Minted: {mintedNfts} / {collection?.max_supply}
        </p>
        <Link
          to={`https://explorer.aptoslabs.com/object/${collection?.collection_id}?network=${NETWORK}`}
          target="_blank"
          className="text-xs text-blue-500 hover:underline mt-2 block"
          onClick={(e) => e.stopPropagation()}
        >
          View on Explorer
        </Link>
      </div>
    </div>
  );
};
