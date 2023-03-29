import { Contract } from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { DRE, getDb, notFalsyOrZeroAddress } from "./misc-utils";
import {
  tEthereumAddress,
  eContractid,
  CBPPools,
  TokenContractId,
  NftContractId,
  IReserveParams,
  INftParams,
} from "./types";
import { MockContract } from "ethereum-waffle";
import { ConfigNames, getReservesConfigByPool, getNftsConfigByPool, loadPoolConfig } from "./configuration";
import { getDeploySigner } from "./contracts-getters";
import {
  MintableERC20,
  MintableERC20Factory,
  MintableERC721,
  MintableERC721Factory,
  BNFTFactory,
  BNFTRegistryFactory,
  StakingFactory,
  SupportFactory,
  StakingAddressesProviderFactory,
  CBUpgradeableProxyFactory,
  CBProxyAdminFactory,
  StakeLogicFactory,
  WETH9MockedFactory,
  WETH9Factory,
  CopyrightRegistryFactory,
  WETH9Mocked,
  WETH9,
} from "../types";

import {
  withSaveAndVerify,
  registerContractInJsonDb,
  linkBytecode,
  insertContractAddressInDb,
  getOptionalParamAddressPerNetwork,
  getContractAddressInDb,
} from "./contracts-helpers";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { StakingLibraryAddresses } from "../types/StakingFactory";
import { eNetwork } from "./types";

const readArtifact = async (id: string) => {
  return (DRE as HardhatRuntimeEnvironment).artifacts.readArtifact(id);
};

/*
export const deployStakingAddressesProviderRegistry = async (verify?: boolean) =>
  withSaveAndVerify(
    await new StakingAddressesProviderRegistryFactory(await getDeploySigner()).deploy(),
    eContractid.LendPoolAddressesProviderRegistry,
    [],
    verify
  );
*/

export const deployCBLibraries = async (verify?: boolean) => {
  await deployStakingLibraries(verify);
  // await deployConfiguratorLibraries(verify);
};

export const deployStakingLibraries = async (verify?: boolean) => {
  // const genericLogic = await deployGenericLogic(verify);
  // const reserveLogic = await deployReserveLogicLibrary(verify);
  const nftLogic = await deployNftLogicLibrary(verify);
  // const validationLogic = await deployValidationLogic(reserveLogic, genericLogic, verify);

  // const supplyLogic = await deploySupplyLogicLibrary(verify);
  const borrowLogic = await deployStakeLogicLibrary(verify);
  // const liquidateLogic = await deployLiquidateLogicLibrary(verify);
};

export const getStakingLibraries = async (verify?: boolean): Promise<StakingLibraryAddresses> => {
  // const reserveLogicAddress = await getContractAddressInDb(eContractid.ReserveLogic);
  const nftLogicAddress = await getContractAddressInDb(eContractid.NftLogic);
  // const validationLogicAddress = await getContractAddressInDb(eContractid.ValidationLogic);
  // const genericLogicAddress = await getContractAddressInDb(eContractid.GenericLogic);
  // const supplyLogicAddress = await getContractAddressInDb(eContractid.SupplyLogic);
  const stakeLogicAddress = await getContractAddressInDb(eContractid.StakeLogic);
  // const liquidateLogicAddress = await getContractAddressInDb(eContractid.LiquidateLogic);

  // Hardcoded solidity placeholders, if any library changes path this will fail.
  // The '__$PLACEHOLDER$__ can be calculated via solidity keccak, but the LendPoolLibraryAddresses Type seems to
  // require a hardcoded string.
  //
  //  how-to:
  //  1. PLACEHOLDER = solidity Keccak256(['string'], `${libPath}:${libName}`).slice(2, 36)
  //  2. LIB_PLACEHOLDER = `__$${PLACEHOLDER}$__`
  // or grab placeholdes from LendPoolLibraryAddresses at Typechain generation.
  //
  // libPath example: contracts/libraries/logic/GenericLogic.sol
  // libName example: GenericLogic
  return {
    //[PLACEHOLDER_GENERIC_LOGIC]: genericLogic.address,
    //[PLACEHOLDER_VALIDATION_LOGIC]: validationLogicAddress,
    // [PLACEHOLDER_RESERVE_LOGIC]: reserveLogicAddress,
    [PLACEHOLDER_NFT_LOGIC]: nftLogicAddress,
    // [PLACEHOLDER_SUPPLY_LOGIC]: supplyLogicAddress,
    [PLACEHOLDER_BORROW_LOGIC]: stakeLogicAddress,
    // [PLACEHOLDER_LIQUIDATE_LOGIC]: liquidateLogicAddress,
  };
};

const PLACEHOLDER_GENERIC_LOGIC = "__$4c26be947d349222af871a3168b3fe584b$__";
const PLACEHOLDER_VALIDATION_LOGIC = "__$5201a97c05ba6aa659e2f36a933dd51801$__";
const PLACEHOLDER_RESERVE_LOGIC = "__$d3b4366daeb9cadc7528af6145b50b2183$__";
const PLACEHOLDER_NFT_LOGIC = "__$eceb79063fab52ea3826f3ee75ecd7f36d$__";
const PLACEHOLDER_SUPPLY_LOGIC = "__$2f7c76ee15bdc1d8f3b34a04b86951fc56$__";
// const PLACEHOLDER_BORROW_LOGIC = "__$77c5a84c43428e206d5bf08427df63fefa$__";
const PLACEHOLDER_BORROW_LOGIC = "__$b77bd822e3d83798efedd92c87b87b691d$__";
const PLACEHOLDER_LIQUIDATE_LOGIC = "__$ce70b23849b5cbed90e6e2f622d8887206$__";
const PLACEHOLDER_CONFIGURATOR_LOGIC = "__$3b2ad8f1ea56cc7a60e9a93596bbfe9178$__";

export const deployStaking = async (verify?: boolean) => {
  const libraries = await getStakingLibraries(verify);
  const stakingImpl = await new StakingFactory(libraries, await getDeploySigner()).deploy();
  await insertContractAddressInDb(eContractid.StakingImpl, stakingImpl.address);
  return withSaveAndVerify(stakingImpl, eContractid.Staking, [], verify);
};

export const deploySupport = async (verify?: boolean) => {
  const supportImpl = await new SupportFactory(await getDeploySigner()).deploy();
  await insertContractAddressInDb(eContractid.SupportImpl, supportImpl.address);
  return withSaveAndVerify(supportImpl, eContractid.Support, [], verify);
};

export const deployCopyrightRegistry = async (verify?: boolean) => {
  const copyrightRegistryImpl = await new CopyrightRegistryFactory(await getDeploySigner()).deploy();
  await insertContractAddressInDb(eContractid.CopyrightRegistryImpl, copyrightRegistryImpl.address);
  return withSaveAndVerify(copyrightRegistryImpl, eContractid.CopyrightRegistryImpl, [], verify);
};

export const deployStakingAddressesProvider = async (marketId: string, verify?: boolean) =>
  withSaveAndVerify(
    await new StakingAddressesProviderFactory(await getDeploySigner()).deploy(marketId),
    eContractid.StakingAddressesProvider,
    [marketId],
    verify
  );

/*
export const deployStakingConfigurator = async (verify?: boolean) => {
  const cfgLogicAddress = await getContractAddressInDb(eContractid.ConfiguratorLogic);

  const libraries = {
    [PLACEHOLDER_CONFIGURATOR_LOGIC]: cfgLogicAddress,
  };

  const lendPoolConfiguratorImpl = await new StakingConfiguratorFactory(libraries, await getDeploySigner()).deploy();
  await insertContractAddressInDb(eContractid.LendPoolConfiguratorImpl, lendPoolConfiguratorImpl.address);
  return withSaveAndVerify(lendPoolConfiguratorImpl, eContractid.LendPoolConfigurator, [], verify);
};
*/

/*
export const deployLendPoolLoan = async (verify?: boolean) => {
  const lendPoolLoanImpl = await new LendPoolLoanFactory(await getDeploySigner()).deploy();
  await insertContractAddressInDb(eContractid.LendPoolLoanImpl, lendPoolLoanImpl.address);
  return withSaveAndVerify(lendPoolLoanImpl, eContractid.LendPoolLoan, [], verify);
};
*/

export const deployBNFTRegistry = async (verify?: boolean) => {
  const bnftRegistryImpl = await new BNFTRegistryFactory(await getDeploySigner()).deploy();
  await insertContractAddressInDb(eContractid.BNFTRegistryImpl, bnftRegistryImpl.address);
  return withSaveAndVerify(bnftRegistryImpl, eContractid.BNFTRegistry, [], verify);
};

export const deployNftLogicLibrary = async (verify?: boolean) => {
  const nftLogicArtifact = await readArtifact(eContractid.NftLogic);
  const linkedNftLogicByteCode = linkBytecode(nftLogicArtifact, {
    //[eContractid.ReserveLogic]: reserveLogic.address,
  });

  const nftLogicFactory = await DRE.ethers.getContractFactory(nftLogicArtifact.abi, linkedNftLogicByteCode);

  const nftLogic = await (await nftLogicFactory.connect(await getDeploySigner()).deploy()).deployed();

  return withSaveAndVerify(nftLogic, eContractid.NftLogic, [], verify);
};

export const deployStakeLogicLibrary = async (verify?: boolean) => {
  /*
  const validateLogicAddress = await getContractAddressInDb(eContractid.ValidationLogic);
  const libraries = {
    [PLACEHOLDER_VALIDATION_LOGIC]: validateLogicAddress,
  };
  */

  return withSaveAndVerify(
    await new StakeLogicFactory(await getDeploySigner()).deploy(),
    eContractid.StakeLogic,
    [],
    verify
  );
};

export const deployGenericBNFTImpl = async (verify: boolean) =>
  withSaveAndVerify(await new BNFTFactory(await getDeploySigner()).deploy(), eContractid.BNFT, [], verify);

export const deployMintableERC20 = async (args: [string, string, string], verify?: boolean): Promise<MintableERC20> =>
  withSaveAndVerify(
    await new MintableERC20Factory(await getDeploySigner()).deploy(...args),
    eContractid.MintableERC20,
    args,
    verify
  );

export const deployWETHMocked = async (verify?: boolean) =>
  withSaveAndVerify(await new WETH9MockedFactory(await getDeploySigner()).deploy(), eContractid.WETHMocked, [], verify);

export const deployWETH9 = async (verify?: boolean) =>
  withSaveAndVerify(await new WETH9Factory(await getDeploySigner()).deploy(), eContractid.WETH, [], verify);

export const deployAllMockTokens = async (forTestCases: boolean, verify?: boolean) => {
  const tokens: { [symbol: string]: MockContract | MintableERC20 | WETH9Mocked | WETH9 } = {};

  const protoConfigData = getReservesConfigByPool(CBPPools.proto);

  for (const tokenSymbol of Object.keys(TokenContractId)) {
    const tokenName = "CBP Mock " + tokenSymbol;

    if (tokenSymbol === "WETH") {
      if (forTestCases) {
        tokens[tokenSymbol] = await deployWETHMocked();
      } else {
        tokens[tokenSymbol] = await deployWETH9();
      }
      await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
      continue;
    }

    let decimals = "18";

    let configData = (<any>protoConfigData)[tokenSymbol];

    tokens[tokenSymbol] = await deployMintableERC20(
      [tokenName, tokenSymbol, configData ? configData.reserveDecimals : decimals],
      verify
    );
    await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
  }
  return tokens;
};

export const deployMintableERC721 = async (args: [string, string], verify?: boolean): Promise<MintableERC721> =>
  withSaveAndVerify(
    await new MintableERC721Factory(await getDeploySigner()).deploy(...args),
    eContractid.MintableERC721,
    args,
    verify
  );

export const deployAllMockNfts = async (verify?: boolean) => {
  const tokens: { [symbol: string]: MockContract | MintableERC721 } = {};

  for (const tokenSymbol of Object.keys(NftContractId)) {
    const tokenName = "Bend Mock " + tokenSymbol;

    /*
    if (tokenSymbol === "WPUNKS") {
      const cryptoPunksMarket = await deployCryptoPunksMarket([], verify);
      const wrappedPunk = await deployWrappedPunk([cryptoPunksMarket.address], verify);
      tokens[tokenSymbol] = wrappedPunk;
      await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
      continue;
    }
    */

    tokens[tokenSymbol] = await deployMintableERC721([tokenName, tokenSymbol], verify);
    await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
  }
  return tokens;
};

export const chooseBNFTDeployment = (id: eContractid) => {
  switch (id) {
    case eContractid.BNFT:
      return deployGenericBNFTImpl;
    //case eContractid.DelegationAwareBNFT:
    //  return deployDelegationAwareBNFTImpl;
    default:
      throw Error(`Missing bNFT implementation deployment script for: ${id}`);
  }
};

export const deployBNFTImplementations = async (
  pool: ConfigNames,
  NftsConfig: { [key: string]: INftParams },
  verify = false
) => {
  const poolConfig = loadPoolConfig(pool);
  const network = <eNetwork>DRE.network.name;

  // Obtain the different BNFT implementations of all nfts inside the Market config
  const bNftImplementations = [
    ...Object.entries(NftsConfig).reduce<Set<eContractid>>((acc, [, entry]) => {
      acc.add(entry.bNftImpl);
      return acc;
    }, new Set<eContractid>()),
  ];

  for (let x = 0; x < bNftImplementations.length; x++) {
    const bNftAddress = getOptionalParamAddressPerNetwork(poolConfig[bNftImplementations[x].toString()], network);
    if (!notFalsyOrZeroAddress(bNftAddress)) {
      const deployImplementationMethod = chooseBNFTDeployment(bNftImplementations[x]);
      console.log(`Deploying BNFT implementation`, bNftImplementations[x]);
      await deployImplementationMethod(verify);
    }
  }
};

export const deployCBUpgradeableProxy = async (
  id: string,
  admin: tEthereumAddress,
  logic: tEthereumAddress,
  data: BytesLike,
  verify?: boolean
) =>
  withSaveAndVerify(
    await new CBUpgradeableProxyFactory(await getDeploySigner()).deploy(logic, admin, data),
    id,
    [logic, admin, DRE.ethers.utils.hexlify(data)],
    verify
  );

export const deployCBProxyAdmin = async (id: string, verify?: boolean) =>
  withSaveAndVerify(await new CBProxyAdminFactory(await getDeploySigner()).deploy(), id, [], verify);
