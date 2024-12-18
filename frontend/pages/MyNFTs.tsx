import { Header } from "@/components/Header";
import { PageTitle } from "@/components/PageTitle";
import { Container } from "@/components/Container";
import { useGetOwnedNFTsWithCollectionData } from "@/hooks/useGetOwnedNFTsWithCollectionData";
import { NFTModalContext, useNFTModal } from "@/hooks/useNFTModal";
import * as Dialog from "@radix-ui/react-dialog";
import { NFTItem } from "@/components/NFTItem";
import { Link } from "react-router-dom";
import { NETWORK } from "@/constants";

export function MyNFTs() {
  const { data, isLoading } = useGetOwnedNFTsWithCollectionData();

  const modalContext = useNFTModal();
  const { isModalOpen, nft } = modalContext;

  return (
    <>
      <Header />

      <NFTModalContext.Provider value={modalContext}>
        <Container>
          <PageTitle text={<>View Your NFTs</>} />
          {isLoading || !data ? (
            <div className="">Loading...</div>
          ) : data.length === 0 ? (
            <div className="">No NFTs found</div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {data.map((nft) => {
                return <NFTItem key={nft.id} nft={nft} isButton />;
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
                maxWidth: "600px",
                maxHeight: "80%",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                overflow: "auto",
              }}
            >
              {nft.state && (
                <>
                  <div className="px-8 max-w-xs mx-auto">
                    <NFTItem nft={nft.state} withoutName />
                  </div>

                  <div className="mt-4 py-2">
                    <p className="mb-2 text-blue-500">
                      <Link to={`/collection/${nft.state.collection_id}`}>{nft.state.collection.collection_name}</Link>
                    </p>
                    <Dialog.Title className="text-2xl font-medium">{nft.state.name}</Dialog.Title>
                    <Dialog.Description className="mt-2">{nft.state.description}</Dialog.Description>
                    <p className="text-sm break-all mt-1">
                      <Link
                        to={`https://explorer.aptoslabs.com/object/${nft.state.id}?network=${NETWORK}`}
                        target="_blank"
                        style={{ textDecoration: "underline" }}
                      >
                        {nft.state.id}
                      </Link>
                    </p>
                  </div>
                </>
              )}

              <div className="flex justify-between mt-6">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 bg-gray-500 text-white rounded">Cancel</button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </NFTModalContext.Provider>
    </>
  );
}
