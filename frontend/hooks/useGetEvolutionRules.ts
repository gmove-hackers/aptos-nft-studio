import { aptosClient } from "@/utils/aptosClient";
import { useQuery } from "@tanstack/react-query";

const evolutionRulesType = `${import.meta.env.VITE_MODULE_ADDRESS}::launchpad::EvolutionRules` as const;

interface EvolutionRulesResource {
  results: {
    data: EvolutionRuleData[];
  };
}

interface EvolutionRuleData {
  key: {
    main_collection: {
      inner: string;
    };
    main_token: string;
  };
  value: string;
}

interface EvolutionRule {
  mainToken: string;
  resultToken: string;
}

export function useGetEvolutionRules(collectionAddr: string) {
  return useQuery({
    queryKey: ["evolutionRules", collectionAddr],
    queryFn: async () => {
      try {
        const data = await fetchEvolutionRules(collectionAddr);
        return parseEvolutionRules(data);
      } catch (error) {
        console.error("Error fetching EvolutionRules:", error);
        return null;
      }
    },
  });
}

/**
 * Fetches the EvolutionRules resource for a given collection.
 *
 * @param {string} collectionAddr - The address of the collection object.
 * @returns {Promise<EvolutionRuleData[]>} - Returns the EvolutionRules data.
 */
async function fetchEvolutionRules(collectionAddr: string): Promise<EvolutionRuleData[]> {
  const resource = await aptosClient().getAccountResource<EvolutionRulesResource>({
    accountAddress: collectionAddr,
    resourceType: evolutionRulesType,
  });
  return resource.results.data;
}

/**
 * Parses the EvolutionRules data.
 *
 * @param {EvolutionRuleData[]} data - The raw EvolutionRules data.
 * @returns {Array<EvolutionRule>} - Returns an array of evolution rules with main_token and result_token.
 */
function parseEvolutionRules(rulesMap: EvolutionRuleData[]): Array<EvolutionRule> {
  const rules: EvolutionRule[] = [];

  for (const rule of rulesMap) {
    rules.push({
      mainToken: rule.key.main_token,
      resultToken: rule.value,
    });
  }

  return rules;
}
