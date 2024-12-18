import { NFTModalContext, NFTWithCollectionData } from "@/hooks/useNFTModal";
import { useContext } from "react";
import { IpfsImage } from "./IpfsImage";

interface NFTItemProps {
  nft: NFTWithCollectionData;
  isButton?: boolean;
  withoutName?: boolean;
}

export const NFTItem: React.FC<NFTItemProps> = ({ nft, isButton, withoutName }) => {
  const modalContext = useContext(NFTModalContext);

  const onClick = () => {
    if (isButton) {
      modalContext.isModalOpen?.dispatch(true);
      modalContext.nft?.dispatch(nft);
    }
  };

  return (
    <div onClick={onClick} className={`${isButton ? "cursor-pointer" : ""}`}>
      <div className={`relative p-2 border `}>
        <div className={`w-full h-full object-cover `}>
          <IpfsImage ipfsUri={nft.image} />
        </div>
      </div>
      {!withoutName && <p className={`text-center pt-2 `}>{nft.name}</p>}
    </div>
  );
};
