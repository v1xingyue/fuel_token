/* Autogenerated file. Do not edit manually. */

/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */

/*
  Fuels version: 0.94.9
*/

import { Contract, ContractFactory, decompressBytecode } from "fuels";
import type { Provider, Account, DeployContractOptions, DeployContractResult } from "fuels";

import { Mytoken } from "./Mytoken";

const bytecode = decompressBytecode("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");

export class MytokenFactory extends ContractFactory {

  static readonly bytecode = bytecode;

  constructor(accountOrProvider: Account | Provider) {
    super(bytecode, Mytoken.abi, accountOrProvider);
  }

  deploy<TContract extends Contract = Contract>(
    deployOptions?: DeployContractOptions
  ): Promise<DeployContractResult<TContract>> {
    return super.deploy({
      storageSlots: Mytoken.storageSlots,
      ...deployOptions,
    });
  }

  static async deploy (
    wallet: Account,
    options: DeployContractOptions = {}
  ): Promise<DeployContractResult<Mytoken>> {
    const factory = new MytokenFactory(wallet);
    return factory.deploy(options);
  }
}
