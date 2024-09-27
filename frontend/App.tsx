import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";

import { Mint } from "@/pages/Mint";
import { CreateCollection } from "@/pages/CreateCollection";
import { MyNFTs } from "@/pages/MyNFTs";
import { Collections } from "@/pages/Collections";
import { CraftNFT } from "./pages/CraftNFT";
import { CollectionDetail } from "./pages/CollectionDetail";
import { EquipNFT } from "./pages/EquipNFT";

function Layout() {
  return (
    <>
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Mint />,
      },
      {
        path: "create-collection",
        element: <CreateCollection />,
      },
      {
        path: "my-nfts",
        element: <MyNFTs />,
      },
      {
        path: "collections",
        element: <Collections />,
      },
      {
        path: "collection/:collection_id",
        element: <CollectionDetail />,
      },
      {
        path: "craft-nft",
        element: <CraftNFT />,
      },
      {
        path: "equip-nft",
        element: <EquipNFT />,
      },
    ],
  },
]);

function App() {
  return (
    <>
      <div className="bg-bg bg-cover bg-center min-h-screen text-primary-foreground">
        <RouterProvider router={router} />
      </div>
    </>
  );
}

export default App;
