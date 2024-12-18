import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

export type AddEvolutionRuleArguments = {
  main_collection: string;
  main_token: string;
  result_token: string;
};

export const addEvolutionRule = (args: AddEvolutionRuleArguments): InputTransactionData => {
  const { main_collection, main_token, result_token } = args;
  return {
    data: {
      function: `${import.meta.env.VITE_MODULE_ADDRESS}::launchpad::add_evolution_rule`,
      typeArguments: [],
      functionArguments: [main_collection, main_token, result_token],
    },
  };
};
