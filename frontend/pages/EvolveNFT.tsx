import { Container } from "@/components/Container";
import { Header } from "@/components/Header";
import { NFTItem } from "@/components/NFTItem";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { evolveNFT } from "@/entry-functions/evolve_nft";
import { useGetEvolutionRules } from "@/hooks/useGetEvolutionRules";
import { CollectionWithNFTs, useGetOwnedNFTsByCollection } from "@/hooks/useGetOwnedNFTsByCollection";
import { NFTModalContext, NFTWithCollectionData, useNFTModal } from "@/hooks/useNFTModal";
import { aptosClient } from "@/utils/aptosClient";
import { UserTransactionResponse } from "@aptos-labs/ts-sdk";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

export function EvolveNFT() {
  const { data, isLoading, isFetching } = useGetOwnedNFTsByCollection();

  const modalContext = useNFTModal();
  const { isModalOpen, nft } = modalContext;

  const { account, signAndSubmitTransaction } = useWallet();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  // New NFT
  const [newNFT, setNewNFT] = useState<NFTWithCollectionData | null>();
  const newNFTIdRef = useRef<string | null>();
  useEffect(() => {
    if (!isModalOpen.state) {
      setNewNFT(null);
      newNFTIdRef.current = null;
    }
  }, [isModalOpen.state]);
  useEffect(() => {
    if (!isFetching && newNFTIdRef.current) {
      const col = data?.find((c) => c.collection_id === nft.state?.collection_id);
      if (!col) return;
      const n = col.nfts.find((n) => n.id === newNFTIdRef.current);
      if (!n) return;
      setNewNFT({ ...n, collection: col });
      newNFTIdRef.current = null;
    }
  }, [isFetching, data, nft.state]);

  // Evolve NFT
  const handleSubmit = async () => {
    try {
      if (!nft.state) return;
      if (isUploading) throw new Error("Uploading in progress");
      setIsUploading(true);

      // Submit a combine_nft entry function transaction
      const response = await signAndSubmitTransaction(
        evolveNFT({
          main_collection: nft.state.collection_id,
          main_nft: nft.state.id,
        }),
      );

      // Wait for the transaction to be commited to chain
      const committedTransactionResponse = await aptosClient().waitForTransaction({
        transactionHash: response.hash,
      });
      await queryClient.invalidateQueries();

      // Once the transaction has been successfully commited to chain,
      if (committedTransactionResponse.success) {
        const event = (committedTransactionResponse as UserTransactionResponse).events.find(
          (e) => e.type === `${import.meta.env.VITE_MODULE_ADDRESS}::launchpad::EvolveNftEvent`,
        );
        if (event) {
          newNFTIdRef.current = event.data.new_nft_obj.inner;
        }
      }
    } catch (error) {
      alert(error);
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitDisabled = isUploading || !account || !nft.state || !!newNFTIdRef.current;

  return (
    <>
      <Header />

      <NFTModalContext.Provider value={modalContext}>
        <Container>
          <PageTitle text={<>Evolve Your NFTs</>} />
          {isLoading || !data ? (
            <div className="">Loading...</div>
          ) : data.length === 0 ? (
            <div className="">No NFTs found</div>
          ) : (
            <div className="">
              {data.map((collection) => {
                return <NFTCollection key={collection.collection_id} collection={collection} />;
              })}
            </div>
          )}
        </Container>

        <Dialog.Root open={isModalOpen.state} onOpenChange={isModalOpen.dispatch}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-80" />
            <Dialog.Content
              className="fixed bg-white p-6 shadow-lg rounded-lg"
              style={{
                width: "90%",
                maxWidth: "380px",
                maxHeight: "80%",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                overflow: "auto",
              }}
            >
              <Dialog.Title className="text-xl text-center mb-4 font-medium">
                {newNFT ? "New NFT Generated!" : "Evolve this NFT?"}
              </Dialog.Title>
              <Dialog.Description></Dialog.Description>

              {(newNFT || nft.state) && (
                <div className="px-8 max-w-xs mx-auto">
                  <NFTItem nft={(newNFT || nft.state) as NFTWithCollectionData} />
                </div>
              )}

              {newNFT && (
                <p className="text-center mt-2 text-blue-500">
                  <Link to={`/my-nfts`}>View your NFTs</Link>
                </p>
              )}

              <div className="flex justify-between mt-6">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 bg-gray-500 text-white rounded">Cancel</button>
                </Dialog.Close>

                {!newNFT && (
                  <Button variant="green" onClick={handleSubmit} disabled={isSubmitDisabled}>
                    Execute
                  </Button>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </NFTModalContext.Provider>
    </>
  );
}

const NFTCollection = ({ collection }: { collection: CollectionWithNFTs }) => {
  const { nfts, ...collectionData } = collection;

  const { data: rules, isLoading } = useGetEvolutionRules(collectionData.collection_id);

  const evolvableNFTs = useMemo(() => {
    if (!rules) return undefined;

    return nfts.filter((nft) => rules.some((rule) => rule.mainToken === nft.name));
  }, [nfts, rules]);

  return (
    <div className="mb-8 pb-8 border-b border-b-gray-400">
      <p className="text-2xl font-semibold mb-4">{collectionData.collection_name}</p>
      {isLoading || !evolvableNFTs ? (
        <div className="">Loading...</div>
      ) : evolvableNFTs.length === 0 ? (
        <div className="">No Evolvable NFTs found</div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {evolvableNFTs.map((nft) => {
            const nftWithCollectionData = { ...nft, collection: collectionData };
            return <NFTItem key={nft.id} nft={nftWithCollectionData} isButton />;
          })}
        </div>
      )}
    </div>
  );
};
