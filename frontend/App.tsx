import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";

import { Mint } from "@/pages/Mint";
import { CreateCollection } from "@/pages/CreateCollection";
import { MyNFTs } from "@/pages/MyNFTs";
import { Collections } from "@/pages/Collections";
import { CraftNFT } from "./pages/CraftNFT";
import { CollectionDetail } from "./pages/CollectionDetail";
import { EvolveNFT } from "./pages/EvolveNFT";

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
        path: "evolve-nft",
        element: <EvolveNFT />,
      },
    ],
  },
]);

function App() {
  return (
    <>
      <div className="min-h-screen text-primary-foreground">
        <div className="fixed w-full h-full pointer-events-none bg-bg bg-cover bg-center"></div>
        <div className="relative">
          <RouterProvider router={router} />
        </div>
      </div>
    </>
  );
}

export default App;
