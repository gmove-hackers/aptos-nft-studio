import { AccountAddress } from "@aptos-labs/ts-sdk";

import { aptosClient } from "@/utils/aptosClient";
import { useQuery } from "@tanstack/react-query";

/**
 * A react hook to get all collections under the current contract.
 *
 * This call can be pretty expensive when fetching a big number of collections,
 * therefore it is not recommended to use it in production
 *
 */
export function useGetCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      try {
        // fetch the contract registry address
        const registry = await getRegistry();
        // fetch collections objects created under that contract registry address
        const objects = await getObjects(registry);
        // get each collection object data
        const collections = await getCollections(objects);
        return collections;
      } catch (error) {
        console.error("Error fetching collections:", error);
        return null;
      }
    },
  });
}

const getRegistry = async () => {
  const registry = await aptosClient().view<[[{ inner: string }]]>({
    payload: {
      function: `${AccountAddress.from(import.meta.env.VITE_MODULE_ADDRESS)}::launchpad::get_registry`,
    },
  });
  return registry[0];
};

const getObjects = async (registry: [{ inner: string }]) => {
  const objects = await Promise.all(
    registry.map(async (register: { inner: string }) => {
      const formattedRegistry = AccountAddress.from(register.inner).toString();
      const object = await aptosClient().getAccountResource({
        accountAddress: formattedRegistry,
        resourceType: "0x1::object::ObjectCore",
      });

      return object.owner;
    }),
  );
  return objects;
};

const getCollections = async (objects: Array<string>) => {
  const collections = await Promise.all(
    objects.map(async (object: string) => {
      const formattedObjectAddress = AccountAddress.from(object).toString();

      const collection = await aptosClient().getCollectionDataByCreatorAddress({
        creatorAddress: formattedObjectAddress,
      });

      return collection;
    }),
  );
  return collections;
};
