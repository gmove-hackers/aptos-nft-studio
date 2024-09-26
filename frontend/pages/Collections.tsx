import { Link, useNavigate } from "react-router-dom";
import { GetCollectionDataResponse } from "@aptos-labs/ts-sdk";
// Internal components
import { TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Internal hooks
import { useGetCollections } from "@/hooks/useGetCollections";
// Internal constants
import { NETWORK } from "@/constants";
import { IpfsImage } from "@/components/IpfsImage";
import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Button } from "@/components/ui/button";
import { mintNFT } from "@/entry-functions/mint_nft";
import { addCombinationRule } from "@/entry-functions/add_combination_rule";
import { aptosClient } from "@/utils/aptosClient";
import { convertIpfsUriToCid } from "@/utils/convertIpfsUriToCid";
import { ImageMetadata, ipfs } from "@/utils/assetsUploader";
import { useQueryClient } from "@tanstack/react-query";
import { getNumberActiveNFTs } from "@/view-functions/get_number_active_nfts";
import { Header } from "@/components/Header";
import { useGetCollectionDetailData } from "@/hooks/useGetCollectionDetailData";

export function Collections() {
  const collections: Array<GetCollectionDataResponse> = useGetCollections();

  return (
    <>
      <Header />
      {collections.length === 0 && <div className="max-w-screen-xl mx-auto p-4">Loading...</div>}
      {collections.length > 0 && (
        <ul className="max-w-screen-xl mx-auto w-11/12 grid md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-4">
          {collections.map((item, i) => {
            return (
              <li key={i}>
                <CollectionItem collection={item} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const CollectionItem = ({ collection }: { collection: GetCollectionDataResponse }) => {
  const { metadata } = useGetCollectionDetailData(collection);

  return (
    <div className="max-w-80 mx-auto overflow-hidden bg-primary/60 rounded-xl">
      <Link to={`/collection/${collection.collection_id}`} className="block relative aspect-square group">
        {metadata && (
          <IpfsImage
            ipfsUri={metadata.image}
            className="absolute w-full h-full object-contain group-hover:scale-105 transition-transform duration-200 pointer-events-none"
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        <p className="absolute bottom-1.5 w-11/12 right-1/2 translate-x-1/2 truncate">{collection.collection_name}</p>
      </Link>
    </div>
  );
};

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

interface CollectionRowProps {
  collection: GetCollectionDataResponse;
  isDetail?: boolean;
}

export const CollectionRow = ({ collection, isDetail }: CollectionRowProps) => {
  const { account, signAndSubmitTransaction } = useWallet();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { metadata, mintedNfts } = useGetCollectionDetailData(collection);

  const [isUploading, setIsUploading] = useState(false);

  // Mint amount
  // const [mintAmount, setMintAmount] = useState<number>();
  // Add combination rule
  const combinationMainCollection = collection.collection_id;
  const [combinationMainTokenName, setCombinationMainTokenName] = useState<string>();
  const [combinationSecondaryCollection, setCombinationSecondaryCollection] = useState<string>();
  const [combinationSecondaryTokenName, setCombinationSecondaryTokenName] = useState<string>();
  const [combinationResultTokenName, setCombinationResultTokenName] = useState<string>();

  const onClickRow = () => {
    if (isDetail) return;
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
    <>
      <TableRow
        key={collection?.collection_id}
        onClick={onClickRow}
        className={`${isDetail ? "border-0 hover:bg-inherit" : "cursor-pointer"}`}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2 flex-wrap">
            {metadata && <IpfsImage ipfsUri={metadata.image} className="w-10 h-10 object-contain" />}
            <span>{collection?.collection_name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Link
            to={`https://explorer.aptoslabs.com/object/${collection?.collection_id}?network=${NETWORK}`}
            target="_blank"
            style={{ textDecoration: "underline" }}
            onClick={(e) => e.stopPropagation()}
          >
            {collection?.collection_id}
          </Link>
        </TableCell>
        <TableCell>{mintedNfts}</TableCell>
        <TableCell>{collection?.max_supply}</TableCell>
      </TableRow>
      {isDetail && (
        <>
          <TableRow className="hover:bg-inherit border-0">
            <TableCell className="w-full" colSpan={4}>
              <p className="mb-4 font-bold text-16">Mint 1 token</p>
              <div className="flex items-end">
                {/* <LabeledInput
                  id={`${collection.collection_id}-mint-amount`}
                  required
                  label="Mint amount"
                  tooltip="How many NFTs you want to mint for this collection."
                  disabled={isUploading || !account}
                  onChange={(e) => {
                    setMintAmount(parseInt(e.target.value));
                  }}
                  labelClassName="font-bold"
                /> */}
                <Button
                  variant="green"
                  onClick={executeMintNft}
                  // disabled={isUploading || !account || !mintAmount}
                  disabled={isUploading || !account}
                  // className="ml-4"
                >
                  Execute
                </Button>
              </div>
            </TableCell>
          </TableRow>
          {/* TODO: Only activate this for the collection owner */}
          <TableRow className="hover:bg-inherit">
            <TableCell className="w-full" colSpan={4}>
              <div className="max-w-2xl">
                <p className="mb-5 font-bold text-16">Add combination rule</p>
                <div>
                  <LabeledInput
                    id={`${collection.collection_id}-combination-main-collection`}
                    required
                    label="Main collection"
                    tooltip="Set the collection id of the main token to be combined."
                    disabled={true}
                    onChange={() => {}}
                    type="text"
                    value={collection.collection_id}
                  />
                </div>
                <div className="mt-5">
                  <LabeledInput
                    id={`${collection.collection_id}-combination-main-token-name`}
                    required
                    label="Main token name"
                    tooltip="Set the main token name to be combined."
                    disabled={isUploading || !account}
                    onChange={(e) => {
                      setCombinationMainTokenName(e.target.value);
                    }}
                    type="text"
                  />
                </div>
                <div className="mt-5">
                  <LabeledInput
                    id={`${collection.collection_id}-combination-secondary-collection`}
                    required
                    label="Secondary collection"
                    tooltip="Set the collection id of the secondary token to be combined. It can be the same as the main collection."
                    disabled={isUploading || !account}
                    onChange={(e) => {
                      setCombinationSecondaryCollection(e.target.value);
                    }}
                    type="text"
                  />
                </div>
                <div className="mt-5">
                  <LabeledInput
                    id={`${collection.collection_id}-combination-secondary-token-name`}
                    required
                    label="Secondary token name"
                    tooltip="Set the secondary token name to be combined."
                    disabled={isUploading || !account}
                    onChange={(e) => {
                      setCombinationSecondaryTokenName(e.target.value);
                    }}
                    type="text"
                  />
                </div>
                <div className="mt-5">
                  <LabeledInput
                    id={`${collection.collection_id}-combination-result-token-name`}
                    required
                    label="Combined token name"
                    tooltip="Set the name of the token to be created by this combination."
                    disabled={isUploading || !account}
                    onChange={(e) => {
                      setCombinationResultTokenName(e.target.value);
                    }}
                    type="text"
                  />
                </div>
                <Button
                  variant="green"
                  onClick={executeAddCombinationRule}
                  disabled={
                    isUploading ||
                    !account ||
                    !combinationMainCollection ||
                    !combinationMainTokenName ||
                    !combinationSecondaryCollection ||
                    !combinationSecondaryTokenName ||
                    !combinationResultTokenName
                  }
                  className="mt-5"
                >
                  Execute
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </>
      )}
    </>
  );
};
