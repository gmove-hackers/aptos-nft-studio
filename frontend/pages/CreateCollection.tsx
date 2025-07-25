// External packages
import { useRef, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
// Internal utils
import { aptosClient } from "@/utils/aptosClient";
import { uploadCollectionData } from "@/utils/assetsUploader";
// Internal components
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { UploadSpinner } from "@/components/UploadSpinner";
import { LabeledInput } from "@/components/ui/labeled-input";
import { DateTimeInput } from "@/components/ui/date-time-input";
// Entry functions
import { createCollection } from "@/entry-functions/create_collection";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Container } from "@/components/Container";
import { PageTitle } from "@/components/PageTitle";

export function CreateCollection() {
  // Wallet Adapter provider
  // const aptosWallet = useWallet();
  const { account, signAndSubmitTransaction } = useWallet();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Collection data entered by the user on UI
  const [royaltyPercentage, setRoyaltyPercentage] = useState<number>();
  // const [preMintAmount, setPreMintAmount] = useState<number>();
  const [publicMintStartDate, setPublicMintStartDate] = useState<Date>();
  const [publicMintStartTime, setPublicMintStartTime] = useState<string>();
  const [publicMintEndDate, setPublicMintEndDate] = useState<Date>();
  const [publicMintEndTime, setPublicMintEndTime] = useState<string>();
  const [publicMintLimitPerAccount, setPublicMintLimitPerAccount] = useState<number>(1);
  const [publicMintFeePerNFT, setPublicMintFeePerNFT] = useState<number>();
  const [files, setFiles] = useState<FileList | null>(null);

  // Internal state
  const [isUploading, setIsUploading] = useState(false);

  // Local Ref
  const inputRef = useRef<HTMLInputElement>(null);

  // On publish mint start date selected
  const onPublicMintStartTime = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = event.target.value;
    setPublicMintStartTime(timeValue);

    const [hours, minutes] = timeValue.split(":").map(Number);

    publicMintStartDate?.setHours(hours);
    publicMintStartDate?.setMinutes(minutes);
    publicMintStartDate?.setSeconds(0);
    setPublicMintStartDate(publicMintStartDate);
  };

  // On publish mint end date selected
  const onPublicMintEndTime = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = event.target.value;
    setPublicMintEndTime(timeValue);

    const [hours, minutes] = timeValue.split(":").map(Number);

    publicMintEndDate?.setHours(hours);
    publicMintEndDate?.setMinutes(minutes);
    publicMintEndDate?.setSeconds(0);
    setPublicMintEndDate(publicMintEndDate);
  };

  // On create collection button clicked
  const onCreateCollection = async () => {
    try {
      if (!account) throw new Error("Please connect your wallet");
      if (!files) throw new Error("Please upload files");
      if (isUploading) throw new Error("Uploading in progress");

      // Set internal isUploading state
      setIsUploading(true);

      // Upload collection files to IPFS
      const { collectionName, collectionDescription, maxSupply, projectUri } = await uploadCollectionData(
        // aptosWallet,
        files,
      );

      // Submit a create_collection entry function transaction
      const response = await signAndSubmitTransaction(
        createCollection({
          collectionDescription,
          collectionName,
          projectUri,
          maxSupply,
          royaltyPercentage,
          allowList: undefined,
          allowListStartDate: undefined,
          allowListEndDate: undefined,
          allowListLimitPerAccount: undefined,
          allowListFeePerNFT: undefined,
          publicMintStartDate,
          publicMintEndDate,
          publicMintLimitPerAccount,
          publicMintFeePerNFT,
        }),
      );

      // Wait for the transaction to be commited to chain
      const committedTransactionResponse = await aptosClient().waitForTransaction({
        transactionHash: response.hash,
      });
      await queryClient.invalidateQueries();

      // Once the transaction has been successfully commited to chain,
      if (committedTransactionResponse.success) {
        // mint NFTs immediately for the creator if preMintAmount is set
        // if (preMintAmount) {
        //   // TODO
        // }

        // navigate to the `collections` page
        navigate(`/collections`);
      }
    } catch (error) {
      alert(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Header />

      <Container>
        <PageTitle text={<>Create a Collection</>} />
        <div className="flex flex-col md:flex-row items-start justify-between px-4 py-8 gap-4 bg-primary-foreground/90 rounded-xl text-primary">
          <div className="w-full md:w-2/3 flex flex-col gap-y-5 order-2 md:order-1">
            <UploadSpinner on={isUploading} />

            <Card>
              <CardHeader>
                <CardDescription>Uploads collection files to IPFS</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-start justify-between">
                  {!files?.length && (
                    <Label
                      htmlFor="upload"
                      className={buttonVariants({
                        variant: "outline",
                        className: "cursor-pointer",
                      })}
                    >
                      Choose Folder to Upload
                    </Label>
                  )}
                  <Input
                    className="hidden"
                    ref={inputRef}
                    id="upload"
                    disabled={isUploading || !account}
                    webkitdirectory="true"
                    multiple
                    type="file"
                    placeholder="Upload Assets"
                    onChange={(event) => {
                      setFiles(event.currentTarget.files);
                    }}
                  />

                  {!!files?.length && (
                    <div>
                      {files.length} files selected{" "}
                      <Button
                        variant="link"
                        className="text-destructive"
                        onClick={() => {
                          setFiles(null);
                          inputRef.current!.value = "";
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex item-center gap-4 mt-4">
              <DateTimeInput
                id="mint-start"
                label="Public mint start date"
                tooltip="When minting becomes active"
                disabled={isUploading || !account}
                date={publicMintStartDate}
                onDateChange={setPublicMintStartDate}
                time={publicMintStartTime}
                onTimeChange={onPublicMintStartTime}
                className="basis-1/2"
              />

              <DateTimeInput
                id="mint-end"
                label="Public mint end date"
                tooltip="When minting finishes"
                disabled={isUploading || !account}
                date={publicMintEndDate}
                onDateChange={setPublicMintEndDate}
                time={publicMintEndTime}
                onTimeChange={onPublicMintEndTime}
                className="basis-1/2"
              />
            </div>

            <LabeledInput
              id="mint-limit"
              required
              label="Mint limit per address"
              tooltip="How many NFTs an individual address is allowed to mint"
              disabled={isUploading || !account}
              onChange={(e) => {
                setPublicMintLimitPerAccount(parseInt(e.target.value));
              }}
            />

            <LabeledInput
              id="royalty-percentage"
              label="Royalty Percentage"
              tooltip="The percentage of trading value that collection creator gets when an NFT is sold on marketplaces"
              disabled={isUploading || !account}
              onChange={(e) => {
                setRoyaltyPercentage(parseInt(e.target.value));
              }}
            />

            <LabeledInput
              id="mint-fee"
              label="Mint fee per NFT in MOVE"
              tooltip="The fee the nft minter is paying the collection creator when they mint an NFT, denominated in APT"
              disabled={isUploading || !account}
              onChange={(e) => {
                setPublicMintFeePerNFT(Number(e.target.value));
              }}
            />

            {/* <LabeledInput
            id="for-myself"
            label="Mint for myself"
            tooltip="How many NFTs to mint immediately for the creator"
            disabled={isUploading || !account}
            onChange={(e) => {
              setPreMintAmount(parseInt(e.target.value));
            }}
          /> */}

            <Button
              variant="green"
              className="self-start mt-4"
              onClick={onCreateCollection}
              disabled={
                !account ||
                !files?.length ||
                !publicMintStartDate ||
                !publicMintLimitPerAccount ||
                !account ||
                isUploading
              }
            >
              Create Collection
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}
