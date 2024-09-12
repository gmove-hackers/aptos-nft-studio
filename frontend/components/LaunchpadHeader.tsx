import { Link, useLocation } from "react-router-dom";
import { FC } from "react";

import { WalletSelector } from "@/components/WalletSelector";
import { buttonVariants } from "@/components/ui/button";

interface LaunchpadHeaderProps {
  title: string;
}

export const LaunchpadHeader: FC<LaunchpadHeaderProps> = ({ title }) => {
  const location = useLocation();

  return (
    <div className="flex items-center justify-between pt-2 pb-4 px-4 mx-auto w-full max-w-screen-xl flex-wrap">
      <h2 className="display">{title}</h2>

      <div className="flex gap-2 items-center">
        <Link className={buttonVariants({ variant: "link" })} to={"/"}>
          Home
        </Link>
        {location.pathname !== "/collections" && (
          <Link className={buttonVariants({ variant: "link" })} to={"/collections"}>
            Collections
          </Link>
        )}
        {location.pathname !== "/create-collection" && (
          <Link className={buttonVariants({ variant: "link" })} to={"/create-collection"}>
            Create Collection
          </Link>
        )}
        {location.pathname !== "/my-nfts" && (
          <Link className={buttonVariants({ variant: "link" })} to={"/my-nfts"}>
            My NFTs
          </Link>
        )}
        {location.pathname !== "/craft-nft" && (
          <Link className={buttonVariants({ variant: "link" })} to={"/craft-nft"}>
            Craft NFT
          </Link>
        )}

        <WalletSelector />
      </div>
    </div>
  );
};
