import { Signer, ethers } from "ethers";
import {
  StakeLogicFactory,
  BNFTFactory,
  BNFTRegistryFactory,
  StakingAddressesProviderFactory,
  StakingFactory,
  SupportFactory,
  MintableERC20Factory,
  MintableERC721Factory,
  CBProxyAdminFactory,
  CBUpgradeableProxyFactory,
  WETH9MockedFactory,
  //NftLogicFactory,
} from "../types";
import { IERC20DetailedFactory } from "../types/IERC20DetailedFactory";
//import { IERC721DetailedFactory } from "../types/IERC721DetailedFactory";
import { getEthersSigners, MockTokenMap, MockNftMap } from "./contracts-helpers";
import { DRE, getDb, notFalsyOrZeroAddress } from "./misc-utils";
import { eContractid, PoolConfiguration, tEthereumAddress, TokenContractId, NftContractId } from "./types";

export const getFirstSigner = async () => (await getEthersSigners())[0];

export const getSecondSigner = async () => (await getEthersSigners())[1];

export const getThirdSigner = async () => (await getEthersSigners())[2];

export const getDeploySigner = async () => (await getEthersSigners())[0];

export const getPoolAdminSigner = async () => (await getEthersSigners())[0];

export const getPoolOwnerSigner = async () => (await getEthersSigners())[0];

export const getEmergencyAdminSigner = async () => (await getEthersSigners())[1];

export const getProxyAdminSigner = async () => (await getEthersSigners())[2];

export const getStakingAddressesProvider = async (address?: tEthereumAddress) => {
  return await StakingAddressesProviderFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.StakingAddressesProvider}`).value()).address,
    await getDeploySigner()
  );
};

export const getBNFTRegistryProxy = async (address?: tEthereumAddress) => {
  return await BNFTRegistryFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.BNFTRegistry}`).value()).address,
    await getDeploySigner()
  );
};

export const getStaking = async (address?: tEthereumAddress) =>
  await StakingFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.Staking}`).value()).address,
    await getDeploySigner()
  );

export const getSupport = async (address?: tEthereumAddress) =>
  await SupportFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.Support}`).value()).address,
    await getDeploySigner()
  );

export const getBNFT = async (address?: tEthereumAddress) =>
  await BNFTFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.BNFT}`).value()).address,
    await getDeploySigner()
  );

export const getMintableERC20 = async (address: tEthereumAddress) =>
  await MintableERC20Factory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.MintableERC20}`).value()).address,
    await getDeploySigner()
  );

export const getMintableERC721 = async (address: tEthereumAddress) =>
  await MintableERC721Factory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.MintableERC721}`).value()).address,
    await getDeploySigner()
  );

export const getMockedTokens = async (config: PoolConfiguration) => {
  const tokenSymbols = Object.keys(config.ReservesConfig);
  const db = getDb(DRE.network.name);
  const tokens: MockTokenMap = await tokenSymbols.reduce<Promise<MockTokenMap>>(async (acc, tokenSymbol) => {
    const accumulator = await acc;
    const address = db.get(`${tokenSymbol.toUpperCase()}`).value().address;
    accumulator[tokenSymbol] = await getMintableERC20(address);
    return Promise.resolve(acc);
  }, Promise.resolve({}));
  return tokens;
};

export const getAllMockedTokens = async () => {
  const db = getDb(DRE.network.name);
  const tokens: MockTokenMap = await Object.keys(TokenContractId).reduce<Promise<MockTokenMap>>(
    async (acc, tokenSymbol) => {
      const accumulator = await acc;
      const address = db.get(`${tokenSymbol.toUpperCase()}`).value().address;
      accumulator[tokenSymbol] = await getMintableERC20(address);
      return Promise.resolve(acc);
    },
    Promise.resolve({})
  );
  return tokens;
};

export const getWETHMocked = async (address?: tEthereumAddress) =>
  await WETH9MockedFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.WETHMocked}`).value()).address,
    await getDeploySigner()
    );

export const getConfigMockedNfts = async (config: PoolConfiguration) => {
  const tokenSymbols = Object.keys(config.NftsConfig);
  const db = getDb(DRE.network.name);
  const tokens: MockNftMap = await tokenSymbols.reduce<Promise<MockNftMap>>(async (acc, tokenSymbol) => {
    const accumulator = await acc;
    const address = db.get(`${tokenSymbol.toUpperCase()}`).value().address;
    accumulator[tokenSymbol] = await getMintableERC721(address);
    return Promise.resolve(acc);
  }, Promise.resolve({}));
  return tokens;
};

export const getAllMockedNfts = async () => {
  const db = getDb(DRE.network.name);
  const tokens: MockNftMap = await Object.keys(NftContractId).reduce<Promise<MockNftMap>>(async (acc, tokenSymbol) => {
    const accumulator = await acc;
    const address = db.get(`${tokenSymbol.toUpperCase()}`).value().address;
    accumulator[tokenSymbol] = await getMintableERC721(address);
    return Promise.resolve(acc);
  }, Promise.resolve({}));
  return tokens;
};

export const getQuoteCurrencies = (oracleQuoteCurrency: string): string[] => {
  switch (oracleQuoteCurrency) {
    case "ETH":
    case "WETH":
    default:
      return ["ETH", "WETH"];
  }
};

// export const getPairsTokenAggregator = (
//   allAssetsAddresses: {
//     [tokenSymbol: string]: tEthereumAddress;
//   },
//   aggregatorsAddresses: { [tokenSymbol: string]: tEthereumAddress },
//   oracleQuoteCurrency: string
// ): [string[], string[]] => {
//   const assetsWithoutQuoteCurrency = omit(allAssetsAddresses, getQuoteCurrencies(oracleQuoteCurrency));

//   const pairs = Object.entries(assetsWithoutQuoteCurrency).map(([tokenSymbol, tokenAddress]) => {
//     //if (true/*tokenSymbol !== 'WETH' && tokenSymbol !== 'ETH' && tokenSymbol !== 'LpWETH'*/) {
//     const aggregatorAddressIndex = Object.keys(aggregatorsAddresses).findIndex((value) => value === tokenSymbol);
//     if (aggregatorAddressIndex < 0) {
//       throw Error(`can not find aggregator for ${tokenSymbol}`);
//     }
//     const [, aggregatorAddress] = (Object.entries(aggregatorsAddresses) as [string, tEthereumAddress][])[
//       aggregatorAddressIndex
//     ];
//     return [tokenAddress, aggregatorAddress];
//     //}
//   }) as [string, string][];

//   const mappedPairs = pairs.map(([asset]) => asset);
//   const mappedAggregators = pairs.map(([, source]) => source);

//   return [mappedPairs, mappedAggregators];
// };

/*
export const getNftLogic = async (address?: tEthereumAddress) =>
  await NftLogicFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.NftLogic}`).value()).address,
    await getDeploySigner()
  );
*/

export const getStakeLogic = async (address?: tEthereumAddress) =>
  await StakeLogicFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.StakeLogic}`).value()).address,
    await getDeploySigner()
  );

export const getBendUpgradeableProxy = async (address: tEthereumAddress) =>
  await CBUpgradeableProxyFactory.connect(address, await getDeploySigner());

export const getBendProxyAdminByAddress = async (address: tEthereumAddress) =>
  await CBProxyAdminFactory.connect(address, await getDeploySigner());

export const getCBProxyAdminById = async (id: string) =>
  await CBProxyAdminFactory.connect(
    (
      await getDb(DRE.network.name).get(`${id}`).value()
    ).address,
    await getDeploySigner()
  );

export const getLendPoolImpl = async (address?: tEthereumAddress) =>
  await StakingFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.StakingImpl}`).value()).address,
    await getDeploySigner()
  );

export const getBNFTRegistryImpl = async (address?: tEthereumAddress) => {
  return await BNFTRegistryFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.BNFTRegistryImpl}`).value()).address,
    await getDeploySigner()
  );
};

export const getAddressById = async (id: string): Promise<tEthereumAddress | undefined> =>
  (await getDb(DRE.network.name).get(`${id}`).value())?.address || undefined;


export const getIErc20Detailed = async (address: tEthereumAddress) =>
  await IERC20DetailedFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.IERC20Detailed}`).value()).address,
    await getDeploySigner()
  );