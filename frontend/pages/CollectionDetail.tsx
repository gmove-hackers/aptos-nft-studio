import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useGetCollectionData } from "@/hooks/useGetCollectionData";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GetCollectionDataResponse } from "@aptos-labs/ts-sdk";
import { Header } from "@/components/Header";
import { Container } from "@/components/Container";
import { PageTitle } from "@/components/PageTitle";
import { useGetCollectionDetailData } from "@/hooks/useGetCollectionDetailData";
import { getNumberActiveNFTs } from "@/view-functions/get_number_active_nfts";
import { convertIpfsUriToCid } from "@/utils/convertIpfsUriToCid";
import { FEATURES, ImageMetadata, ipfs } from "@/utils/assetsUploader";
import { mintNFT } from "@/entry-functions/mint_nft";
import { aptosClient } from "@/utils/aptosClient";
import { addCombinationRule } from "@/entry-functions/add_combination_rule";
import { IpfsImage } from "@/components/IpfsImage";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { NETWORK } from "@/constants";
import { addEvolutionRule } from "@/entry-functions/add_evolution_rule";
import { useGetCollections } from "@/hooks/useGetCollections";
import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useGetCollectionNFTsMetadata } from "@/hooks/useGetCollectionNFTsMetadata";
import { removeMetadataNameDuplicates } from "@/utils/removeMetadataNameDuplicates";

export function CollectionDetail() {
  const { collection_id } = useParams<{ collection_id: string }>();
  const { data, isLoading } = useGetCollectionData(collection_id);

  const queryClient = useQueryClient();
  const { account } = useWallet();
  useEffect(() => {
    queryClient.invalidateQueries();
  }, [account, queryClient]);

  return (
    <>
      <Header />

      <Container>
        <PageTitle text={<>Collection Detail</>} />
        {isLoading ? (
          <div className="">Loading...</div>
        ) : !data ? (
          <div className="">Collection not found</div>
        ) : (
          <div className="py-3 bg-primary-foreground/90 rounded-xl text-primary overflow-hidden">
            <Table>
              <CollectionTableHeader />
              <TableBody>
                <CollectionRow collection={data.collection as GetCollectionDataResponse} isDetail />
              </TableBody>
            </Table>
          </div>
        )}
      </Container>
    </>
  );
}

const CollectionTableHeader = () => {
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

const CollectionRow = ({ collection, isDetail }: CollectionRowProps) => {
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
  // Add evolution rule
  const evolutionMainCollection = collection.collection_id;
  const [evolutionMainTokenName, setEvolutionMainTokenName] = useState<string>();
  const [evolutionResultTokenName, setEvolutionResultTokenName] = useState<string>();

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
      const committedTransactionResponse = await aptosClient().waitForTransaction({
        transactionHash: response.hash,
      });
      await queryClient.invalidateQueries();

      // Once the transaction has been successfully commited to chain,
      if (committedTransactionResponse.success) {
        // navigate to the `my-nfts` page
        navigate(`/my-nfts`);
      }
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

  // Add evolution rule
  const executeAddEvolutionRule = async () => {
    try {
      if (!account) throw new Error("Please connect your wallet");
      if (!evolutionMainTokenName) throw new Error("Please set the main token name");
      if (!evolutionResultTokenName) throw new Error("Please set the result token name");
      if (isUploading) throw new Error("Uploading in progress");
      setIsUploading(true);

      // Submit a add_evolution_rule entry function transaction
      const response = await signAndSubmitTransaction(
        addEvolutionRule({
          main_collection: evolutionMainCollection,
          main_token: evolutionMainTokenName,
          result_token: evolutionResultTokenName,
        }),
      );

      // Wait for the transaction to be commited to chain
      const committedTransactionResponse = await aptosClient().waitForTransaction({
        transactionHash: response.hash,
      });
      await queryClient.invalidateQueries();

      // Once the transaction has been successfully commited to chain,
      if (committedTransactionResponse.success) {
        // navigate to the `evolve-nft` page
        navigate(`/evolve-nft`);
      }
    } catch (error) {
      alert(error);
    } finally {
      setIsUploading(false);
    }
  };

  // hide rules setting
  const [isRulesSettingHidden, setIsRulesSettingHidden] = useState(true);
  const toggleRulesSetting = () => {
    setIsRulesSettingHidden((state) => !state);
  };

  const { data: collections } = useGetCollections();

  // fetch main collection nfts metadata
  const [isFetchMainCollectionNFTsMetadata, setIsFetchMainCollectionNFTsMetadata] = useState(false);
  const { data: mainCollectionNFTsMetadata } = useGetCollectionNFTsMetadata(
    isFetchMainCollectionNFTsMetadata ? collection : null,
  );
  // fetch combination secondary collection nfts metadata
  const [combinationSecondaryCollectionToFetchNFTsMetadata, setCombinationSecondaryCollectionToFetchNFTsMetadata] =
    useState<GetCollectionDataResponse>();
  const { data: combinationSecondaryCollectionNFTsMetadata } = useGetCollectionNFTsMetadata(
    combinationSecondaryCollectionToFetchNFTsMetadata ?? null,
  );
  const [isInvalidCombinationSecondaryCollection, setIsInvalidCombinationSecondaryCollection] = useState(false);

  const TokenNameSelect = ({
    feature,
    nameType,
  }: {
    feature: (typeof FEATURES)[number]["name"];
    nameType: "main" | "secondary" | "result";
  }) => {
    const mainNFTsMetadata = mainCollectionNFTsMetadata
      ? removeMetadataNameDuplicates(mainCollectionNFTsMetadata)
      : null;
    const list =
      nameType === "main"
        ? mainNFTsMetadata
        : nameType === "secondary"
          ? combinationSecondaryCollectionNFTsMetadata
            ? removeMetadataNameDuplicates(combinationSecondaryCollectionNFTsMetadata)
            : null
          : nameType === "result" && mainNFTsMetadata
            ? feature === "combination" && combinationMainTokenName
              ? mainNFTsMetadata
                  .filter((v) => v.name === combinationMainTokenName && v.combinations)
                  .map((v) =>
                    Object.keys(v.combinations!).map((name) => ({
                      name,
                    })),
                  )
                  .flat()
              : feature === "evolution" && evolutionMainTokenName
                ? mainNFTsMetadata
                    .filter((v) => v.name === evolutionMainTokenName && v.evolutions)
                    .map((v) =>
                      Object.keys(v.evolutions!).map((name) => ({
                        name,
                      })),
                    )
                    .flat()
                : null
            : null;
    if (nameType === "result" && !list) return null;
    if (nameType === "secondary" && feature === "combination" && !combinationSecondaryCollection) return null;
    return (
      <>
        <p className="my-2">or</p>
        {(
          nameType === "secondary"
            ? combinationSecondaryCollectionToFetchNFTsMetadata
            : isFetchMainCollectionNFTsMetadata
        ) ? (
          list ? (
            list.length > 0 ? (
              <Select.Root
                value={
                  feature === "combination"
                    ? nameType === "main"
                      ? combinationMainTokenName
                      : nameType === "secondary"
                        ? combinationSecondaryTokenName
                        : nameType === "result"
                          ? combinationResultTokenName
                          : undefined
                    : feature === "evolution"
                      ? nameType === "main"
                        ? evolutionMainTokenName
                        : nameType === "result"
                          ? evolutionResultTokenName
                          : undefined
                      : undefined
                }
                onValueChange={
                  feature === "combination"
                    ? nameType === "main"
                      ? setCombinationMainTokenName
                      : nameType === "secondary"
                        ? setCombinationSecondaryTokenName
                        : nameType === "result"
                          ? setCombinationResultTokenName
                          : undefined
                    : feature === "evolution"
                      ? nameType === "main"
                        ? setEvolutionMainTokenName
                        : nameType === "result"
                          ? setEvolutionResultTokenName
                          : undefined
                      : undefined
                }
                disabled={isUploading || !account}
              >
                <Select.Trigger className="selectTrigger">
                  <Select.Value placeholder={`Select ${nameType} token name`} />
                  <Select.Icon>
                    <ChevronDownIcon />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Content className="selectContent">
                  <Select.Viewport className="selectViewport">
                    {list.map((item, i) => (
                      <Select.Item key={i} value={item.name} className="selectItem">
                        <Select.ItemText>{item.name}</Select.ItemText>
                        <Select.ItemIndicator className="selectItemIndicator">
                          <CheckIcon />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Root>
            ) : (
              <div className="text-red-500">No {feature} defined in the selected main token name metadata</div>
            )
          ) : (
            <div className="">Loading...</div>
          )
        ) : (
          <div>
            <button
              onClick={() => {
                if (nameType === "secondary") {
                  if (feature === "combination" && combinationSecondaryCollection) {
                    const col = collections?.find((v) => v.collection_id === combinationSecondaryCollection);
                    if (col) {
                      setCombinationSecondaryCollectionToFetchNFTsMetadata(col);
                      setIsInvalidCombinationSecondaryCollection(false);
                    } else {
                      setIsInvalidCombinationSecondaryCollection(true);
                    }
                  }
                } else {
                  setIsFetchMainCollectionNFTsMetadata(true);
                }
              }}
              className="bg-indigo-500 text-primary-foreground px-4 py-2 rounded-md"
            >
              Select from NFTs metadata
            </button>
            {nameType === "secondary" && feature === "combination" && isInvalidCombinationSecondaryCollection && (
              <p className="text-red-500 inline-block ml-4">Invalid secondary collection to fetch metadata</p>
            )}
          </div>
        )}
        {nameType === "secondary" && combinationSecondaryCollectionToFetchNFTsMetadata && list && (
          <div className="mt-3">
            <button
              onClick={() => {
                if (feature === "combination" && combinationSecondaryCollection) {
                  const col = collections?.find((v) => v.collection_id === combinationSecondaryCollection);
                  if (col) {
                    setCombinationSecondaryCollectionToFetchNFTsMetadata(col);
                    setIsInvalidCombinationSecondaryCollection(false);
                  } else {
                    setIsInvalidCombinationSecondaryCollection(true);
                  }
                }
              }}
              className="bg-indigo-500 text-primary-foreground px-4 py-2 rounded-md"
            >
              Update NFTs metadata
            </button>
            {nameType === "secondary" && feature === "combination" && isInvalidCombinationSecondaryCollection && (
              <p className="text-red-500 inline-block ml-4">Invalid secondary collection to fetch metadata</p>
            )}
          </div>
        )}
      </>
    );
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
          {/* Mint */}
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
          <TableRow className="hover:bg-inherit border-0">
            <TableCell className="w-full text-center" colSpan={4}>
              <button onClick={toggleRulesSetting}>
                <small className="mr-2">{isRulesSettingHidden ? "▼" : "▲"}</small>
                {isRulesSettingHidden ? "Open" : "Close"} Rules Setting
              </button>
            </TableCell>
          </TableRow>
          {!isRulesSettingHidden && (
            <>
              {/* Combination */}
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
                    <TokenNameSelect feature="combination" nameType="main" />
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
                      {collections && collections.length > 0 && (
                        <>
                          <p className="my-2">or</p>
                          <Select.Root
                            value={combinationSecondaryCollection}
                            onValueChange={setCombinationSecondaryCollection}
                            disabled={isUploading || !account}
                          >
                            <Select.Trigger className="selectTrigger">
                              <Select.Value placeholder="Select secondary collection" />
                              <Select.Icon>
                                <ChevronDownIcon />
                              </Select.Icon>
                            </Select.Trigger>
                            <Select.Content className="selectContent">
                              <Select.Viewport className="selectViewport">
                                {collections.map((col) => (
                                  <Select.Item key={col.collection_id} value={col.collection_id} className="selectItem">
                                    <Select.ItemText>{col.collection_name}</Select.ItemText>
                                    <Select.ItemIndicator className="selectItemIndicator">
                                      <CheckIcon />
                                    </Select.ItemIndicator>
                                  </Select.Item>
                                ))}
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Root>
                        </>
                      )}
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
                    <TokenNameSelect feature="combination" nameType="secondary" />
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
                    <TokenNameSelect feature="combination" nameType="result" />
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
              {/* Evolution */}
              <TableRow className="hover:bg-inherit">
                <TableCell className="w-full" colSpan={4}>
                  <div className="max-w-2xl">
                    <p className="mb-5 font-bold text-16">Add evolution rule</p>
                    <div>
                      <LabeledInput
                        id={`${collection.collection_id}-evolution-main-collection`}
                        required
                        label="Main collection"
                        tooltip="Set the collection id of the main token to be evolved."
                        disabled={true}
                        onChange={() => {}}
                        type="text"
                        value={collection.collection_id}
                      />
                    </div>
                    <div className="mt-5">
                      <LabeledInput
                        id={`${collection.collection_id}-evolution-main-token-name`}
                        required
                        label="Main token name"
                        tooltip="Set the main token name to be evolved."
                        disabled={isUploading || !account}
                        onChange={(e) => {
                          setEvolutionMainTokenName(e.target.value);
                        }}
                        type="text"
                      />
                    </div>
                    <TokenNameSelect feature="evolution" nameType="main" />
                    <div className="mt-5">
                      <LabeledInput
                        id={`${collection.collection_id}-evolution-result-token-name`}
                        required
                        label="Evolved token name"
                        tooltip="Set the name of the token to be created by this evolution."
                        disabled={isUploading || !account}
                        onChange={(e) => {
                          setEvolutionResultTokenName(e.target.value);
                        }}
                        type="text"
                      />
                    </div>
                    <TokenNameSelect feature="evolution" nameType="result" />
                    <Button
                      variant="green"
                      onClick={executeAddEvolutionRule}
                      disabled={
                        isUploading ||
                        !account ||
                        !evolutionMainCollection ||
                        !evolutionMainTokenName ||
                        !evolutionResultTokenName
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
      )}
    </>
  );
};
