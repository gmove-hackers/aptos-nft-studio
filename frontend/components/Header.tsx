import { Link, useLocation } from "react-router-dom";
import { WalletSelector } from "./WalletSelector";
import { buttonVariants } from "@/components/ui/button";
import Logo from "@/assets/img/logo.png";

const NavList = [
  {
    name: "Home",
    link: "/",
  },
  {
    name: "Collections",
    link: "/collections",
  },
  {
    name: "Create Collection",
    link: "/create-collection",
  },
  {
    name: "My NFTs",
    link: "/my-nfts",
  },
  {
    name: "Craft NFT",
    link: "/craft-nft",
  },
  {
    name: "Evolve NFT",
    link: "/evolve-nft",
  },
];

export function Header() {
  const location = useLocation();

  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-4 max-w-screen-xl mx-auto w-full flex-wrap">
      <h1 className="display pt-3 pb-2">
        <Link to="/">
          <img src={Logo} alt="Move NFT Studio" width={250} />
        </Link>
      </h1>

      <div className="flex gap-2 items-center flex-wrap">
        {NavList.map((item, i) => {
          return (
            <Link
              key={i}
              className={`${buttonVariants({ variant: "link" })} ${item.link === location.pathname ? "underline" : ""} font-semibold`}
              to={item.link}
            >
              {item.name.toUpperCase()}
            </Link>
          );
        })}
        <WalletSelector />
      </div>
    </div>
  );
}
