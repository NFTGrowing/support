import {
  CBPPools,
  iMultiPoolsAssets,
  IReserveParams,
  iMultiPoolsNfts,
  INftParams,
  PoolConfiguration,
  ICommonConfiguration,
  eNetwork,
} from "./types";
import { getEthersSignersAddresses, getParamPerPool } from "./contracts-helpers";
import CBPConfig from "../markets/cbp";
import { CommonsConfig } from "../markets/cbp/commons";
import { DRE, notFalsyOrZeroAddress } from "./misc-utils";
import { tEthereumAddress } from "./types";
import { getParamPerNetwork } from "./contracts-helpers";
import { deployWETH9 } from "./contracts-deployments";
import { ZERO_ADDRESS } from "./constants";

export enum ConfigNames {
  Commons = "Commons",
  CBP = "CBP",
}

export const loadPoolConfig = (configName: ConfigNames): PoolConfiguration => {
  switch (configName) {
    case ConfigNames.CBP:
      return CBPConfig;
    case ConfigNames.Commons:
      return CommonsConfig;
    default:
      throw new Error(`Unsupported pool configuration: ${Object.values(ConfigNames)}`);
  }
};

// ----------------
// PROTOCOL PARAMS PER POOL
// ----------------

export const getReservesConfigByPool = (pool: CBPPools): iMultiPoolsAssets<IReserveParams> =>
  getParamPerPool<iMultiPoolsAssets<IReserveParams>>(
    {
      [CBPPools.proto]: {
        ...CBPConfig.ReservesConfig,
      },
    },
    pool
  );

export const getNftsConfigByPool = (pool: CBPPools): iMultiPoolsNfts<INftParams> =>
  getParamPerPool<iMultiPoolsNfts<INftParams>>(
    {
      [CBPPools.proto]: {
        ...CBPConfig.NftsConfig,
      },
    },
    pool
  );

export const getProviderRegistryAddress = async (config: ICommonConfiguration): Promise<tEthereumAddress> => {
  const currentNetwork = process.env.FORK ? process.env.FORK : DRE.network.name;
  const registryAddress = getParamPerNetwork(config.ProviderRegistry, <eNetwork>currentNetwork);
  if (registryAddress) {
    return registryAddress;
  }
  return ZERO_ADDRESS;
};

export const getGenesisPoolAdmin = async (config: ICommonConfiguration): Promise<tEthereumAddress> => {
  const currentNetwork = process.env.FORK ? process.env.FORK : DRE.network.name;
  const targetAddress = getParamPerNetwork(config.PoolAdmin, <eNetwork>currentNetwork);
  if (targetAddress) {
    return targetAddress;
  }
  const addressList = await getEthersSignersAddresses();
  const addressIndex = config.PoolAdminIndex;
  return addressList[addressIndex];
};

export const getReserveFactorCollectorAddress = async (config: ICommonConfiguration): Promise<tEthereumAddress> => {
  const currentNetwork = process.env.FORK ? process.env.FORK : DRE.network.name;
  return getParamPerNetwork(config.ReserveFactorCollectorAddress, <eNetwork>currentNetwork);
};

export const getWrappedNativeTokenAddress = async (config: ICommonConfiguration) => {
  const currentNetwork = process.env.MAINNET_FORK === "true" ? "main" : DRE.network.name;
  const wethAddress = getParamPerNetwork(config.WrappedNativeToken, <eNetwork>currentNetwork);
  if (wethAddress) {
    return wethAddress;
  }
  if (currentNetwork.includes("main")) {
    throw new Error("WETH not set at mainnet configuration.");
  }
  const weth = await deployWETH9();
  return weth.address;
};

// export const getWrappedPunkTokenAddress = async (config: ICommonConfiguration, punk: tEthereumAddress) => {
//   const currentNetwork = process.env.MAINNET_FORK === "true" ? "main" : DRE.network.name;
//   const wpunkAddress = getParamPerNetwork(config.WrappedPunkToken, <eNetwork>currentNetwork);
//   if (wpunkAddress) {
//     return wpunkAddress;
//   }
//   if (currentNetwork.includes("main")) {
//     throw new Error("WPUNKS not set at mainnet configuration.");
//   }
//   if (!notFalsyOrZeroAddress(punk)) {
//     throw new Error("PUNK not set at dev or testnet configuration.");
//   }
//   const wpunk = await deployWrappedPunk([punk]);
//   return wpunk.address;
// };

// export const getCryptoPunksMarketAddress = async (config: ICommonConfiguration) => {
//   const currentNetwork = process.env.MAINNET_FORK === "true" ? "main" : DRE.network.name;
//   const punkAddress = getParamPerNetwork(config.CryptoPunksMarket, <eNetwork>currentNetwork);
//   if (punkAddress) {
//     return punkAddress;
//   }
//   if (currentNetwork.includes("main")) {
//     throw new Error("CryptoPunksMarket not set at mainnet configuration.");
//   }
//   const punk = await deployCryptoPunksMarket([]);
//   return punk.address;
// };
