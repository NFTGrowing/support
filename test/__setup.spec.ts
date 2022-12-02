import rawBRE from "hardhat";
import { MockContract } from "ethereum-waffle";
import "./helpers/utils/math";
import { insertContractAddressInDb, registerContractInJsonDb } from "../helpers/contracts-helpers";
import {
  deployAllMockTokens,
  deployBNFTRegistry,
  deployStaking,
  deploySupport,
  deployStakingAddressesProvider,
  deployGenericBNFTImpl,
  deployBNFTImplementations,
  deployCBUpgradeableProxy,
  deployAllMockNfts,
  deployCBProxyAdmin,
  deployCBLibraries,
} from "../helpers/contracts-deployments";

import { Signer } from "ethers";
import { eContractid, tEthereumAddress, BendPools } from "../helpers/types";
import { MintableERC20 } from "../types/MintableERC20";
import { MintableERC721 } from "../types/MintableERC721";
import { WETH9Mocked } from "../types/WETH9Mocked";
import { WETH9 } from "../types/WETH9";

import { ConfigNames, getReserveFactorCollectorAddress, loadPoolConfig } from "../helpers/configuration";
import { initializeMakeSuite } from "./helpers/make-suite";

import {
  setAggregatorsInReserveOracle,
  addAssetsInNFTOracle,
  setPricesInNFTOracle,
  deployAllChainlinkMockAggregators,
  deployChainlinkMockAggregator,
} from "../helpers/oracles-helpers";
import { DRE, waitForTx } from "../helpers/misc-utils";
import {
  initReservesByHelper,
  configureReservesByHelper,
  initNftsByHelper,
  configureNftsByHelper,
} from "../helpers/init-helpers";
import BendConfig from "../markets/bend";
import {
  getSecondSigner,
  getDeploySigner,
  getPoolAdminSigner,
  getEmergencyAdminSigner,
  getStaking,
  getSupport,
  getBNFTRegistryProxy,
} from "../helpers/contracts-getters";
import { getNftAddressFromSymbol } from "./helpers/utils/helpers";
import { ADDRESS_ID_PUNK_GATEWAY, ADDRESS_ID_WETH_GATEWAY } from "../helpers/constants";

const MOCK_USD_PRICE = BendConfig.ProtocolGlobalParams.MockUsdPrice;
const ALL_ASSETS_INITIAL_PRICES = BendConfig.Mocks.AllAssetsInitialPrices;
const USD_ADDRESS = BendConfig.ProtocolGlobalParams.UsdAddress;
const ALL_NFTS_INITIAL_PRICES = BendConfig.Mocks.AllNftsInitialPrices;


const buildTestEnv = async (deployer: Signer, secondaryWallet: Signer) => {
  console.time("setup");

  const poolAdmin = await (await getPoolAdminSigner()).getAddress();
  const emergencyAdmin = await (await getEmergencyAdminSigner()).getAddress();
  console.log("Admin accounts:", "poolAdmin:", poolAdmin, "emergencyAdmin:", emergencyAdmin);

  const config = loadPoolConfig(ConfigNames.Bend);

  //////////////////////////////////////////////////////////////////////////////
  console.log("-> Prepare mock external ERC20 Tokens, such as WETH, DAI...");
  const mockTokens: {
    [symbol: string]: MockContract | MintableERC20 | WETH9Mocked | WETH9;
  } = {
    ...(await deployAllMockTokens(true)),
  };

  console.log("-> Prepare mock external ERC721 NFTs, such as WPUNKS, BAYC...");
  const mockNfts: {
    [symbol: string]: MockContract | MintableERC721;
  } = {
    ...(await deployAllMockNfts(false)),
  };

/*
  const cryptoPunksMarket = await getCryptoPunksMarket();
  await waitForTx(await cryptoPunksMarket.allInitialOwnersAssigned());
  const wrappedPunk = await getWrappedPunk();
*/

/*
  console.log("-> Prepare mock external IncentivesController...");
  const mockIncentivesController = await deployMockIncentivesController();
  const incentivesControllerAddress = mockIncentivesController.address;
*/

  //////////////////////////////////////////////////////////////////////////////
  console.log("-> Prepare proxy admin...");
  const bendProxyAdmin = await deployCBProxyAdmin(eContractid.BendProxyAdminTest);
  console.log("bendProxyAdmin:", bendProxyAdmin.address);


  //////////////////////////////////////////////////////////////////////////////
  // !!! MUST BEFORE LendPoolConfigurator which will getBNFTRegistry from address provider when init
  console.log("-> Prepare mock bnft registry...");
  const bnftGenericImpl = await deployGenericBNFTImpl(false);

  const bnftRegistryImpl = await deployBNFTRegistry();
  const initEncodedData = bnftRegistryImpl.interface.encodeFunctionData("initialize", [
    bnftGenericImpl.address,
    config.Mocks.BNftNamePrefix,
    config.Mocks.BNftSymbolPrefix,
  ]);

  const bnftRegistryProxy = await deployCBUpgradeableProxy(
    eContractid.BNFTRegistry,
    bendProxyAdmin.address,
    bnftRegistryImpl.address,
    initEncodedData
  );

  const bnftRegistry = await getBNFTRegistryProxy(bnftRegistryProxy.address);

  await waitForTx(await bnftRegistry.transferOwnership(poolAdmin));

  //////////////////////////////////////////////////////////////////////////////
  console.log("-> Prepare mock bnft tokens...");
  for (const [nftSymbol, mockedNft] of Object.entries(mockNfts) as [string, MintableERC721][]) {
    await waitForTx(await bnftRegistry.createBNFT(mockedNft.address));
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(mockedNft.address);
    console.log("createBNFT:", nftSymbol, bnftAddresses.bNftProxy, bnftAddresses.bNftImpl);
  }

  //////////////////////////////////////////////////////////////////////////////
  console.log("-> Prepare address provider...");
  //const addressesProviderRegistry = await deployStakingAddressesProviderRegistry();

  const addressesProvider = await deployStakingAddressesProvider(BendConfig.MarketId);
  await waitForTx(await addressesProvider.setPoolAdmin(poolAdmin));
  await waitForTx(await addressesProvider.setEmergencyAdmin(emergencyAdmin));

  /*
  await waitForTx(
    await addressesProviderRegistry.registerAddressesProvider(addressesProvider.address, BendConfig.ProviderId)
  );
  */

  //////////////////////////////////////////////////////////////////////////////
  // !!! MUST BEFORE LendPoolConfigurator which will getBNFTRegistry from address provider when init
  await waitForTx(await addressesProvider.setBNFTRegistry(bnftRegistry.address));
  // await waitForTx(await addressesProvider.setIncentivesController(incentivesControllerAddress));

  //////////////////////////////////////////////////////////////////////////////
  console.log("-> Prepare CB libraries...");
  await deployCBLibraries();

  console.log("-> Prepare Staking...");
  const StakingImpl = await deployStaking();
  await waitForTx(await addressesProvider.setStakingImpl(StakingImpl.address, []));
  // configurator will create proxy for implement
  const StakingAddress = await addressesProvider.getStaking();
  const stakingProxy = await getStaking(StakingAddress);
  await insertContractAddressInDb(eContractid.Staking, stakingProxy.address);  

  console.log("-> Prepare Support...");
  const SupportImpl = await deploySupport();
  await waitForTx(await addressesProvider.setSupportImpl(SupportImpl.address, []));
  // configurator will create proxy for implement
  const SupportAddress = await addressesProvider.getSupport();
  const supportProxy = await getSupport(SupportAddress);
  await insertContractAddressInDb(eContractid.Support, supportProxy.address);  


  console.timeEnd("setup");

//todo - Mon search pool admin in bend


};

before(async () => {
  await rawBRE.run("set-DRE");
  const deployer = await getDeploySigner();
  const secondaryWallet = await getSecondSigner();
  const FORK = process.env.FORK;

  if (FORK) {
    await rawBRE.run("bend:mainnet", { skipRegistry: true });
  } else {
    console.log("-> Deploying test environment...");
    await buildTestEnv(deployer, secondaryWallet);
  }

  console.log("-> Initialize make suite...");
  await initializeMakeSuite();

  console.log("\n***************");
  console.log("Setup and snapshot finished");
  console.log("***************\n");
});
