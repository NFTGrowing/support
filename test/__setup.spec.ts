import rawBRE from "hardhat";
import { MockContract } from "ethereum-waffle";
import "./helpers/utils/math";
import { insertContractAddressInDb, registerContractInJsonDb } from "../helpers/contracts-helpers";
import {
  deployAllMockTokens,
  deploySupport,
  deployCBPAddressesProviderImpl,
  deployCBUpgradeableProxy,
  deployAllMockNfts,
  deployCBProxyAdmin,
  deployCopyrightRegistry,
} from "../helpers/contracts-deployments";

import { Signer } from "ethers";
import { eContractid, tEthereumAddress, CBPPools } from "../helpers/types";
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
import CBPConfig from "../markets/cbp";
import {
  getSecondSigner,
  getDeploySigner,
  getAddressProviderProxyAdmin,
  getPoolAdminSigner,
  getEmergencyAdminSigner,
  getSupport,
  getCopyrightRegistry,
  getCBPAddressesProviderProxy,
} from "../helpers/contracts-getters";
import { getNftAddressFromSymbol } from "./helpers/utils/helpers";
import { ADDRESS_ID_PUNK_GATEWAY, ADDRESS_ID_WETH_GATEWAY } from "../helpers/constants";

const MOCK_USD_PRICE = CBPConfig.ProtocolGlobalParams.MockUsdPrice;
const ALL_ASSETS_INITIAL_PRICES = CBPConfig.Mocks.AllAssetsInitialPrices;
const USD_ADDRESS = CBPConfig.ProtocolGlobalParams.UsdAddress;
const ALL_NFTS_INITIAL_PRICES = CBPConfig.Mocks.AllNftsInitialPrices;

const buildTestEnv = async (deployer: Signer, secondaryWallet: Signer) => {
  console.time("setup");

  const poolAdmin = await (await getPoolAdminSigner()).getAddress();
  const emergencyAdmin = await (await getEmergencyAdminSigner()).getAddress();
  console.log("Admin accounts:", "poolAdmin:", poolAdmin, "emergencyAdmin:", emergencyAdmin);

  const config = loadPoolConfig(ConfigNames.CBP);

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

  console.log("-> Prepare proxy admin...");
  const cbpProxyAdmin = await deployCBProxyAdmin(eContractid.CBPProxyAdminTest);
  console.log("cbpProxyAdmin:", cbpProxyAdmin.address);

  console.log("-> Prepare address provider...");
  const addressesProviderImpl = await deployCBPAddressesProviderImpl();
  const initEncodedData = addressesProviderImpl.interface.encodeFunctionData("initialize", []);

  const cbUpgradeableProxy = await deployCBUpgradeableProxy(
    eContractid.CBPAddressesProviderProxy,
    await (await getAddressProviderProxyAdmin()).getAddress(),
    addressesProviderImpl.address,
    initEncodedData
  );

  const addressesProviderProxy = await getCBPAddressesProviderProxy(cbUpgradeableProxy.address);

  await waitForTx(await addressesProviderProxy.setPoolAdmin(poolAdmin));
  await waitForTx(await addressesProviderProxy.setEmergencyAdmin(emergencyAdmin));

  console.log("-> Prepare Support...");
  const SupportImpl = await deploySupport();
  // TODO: should report issue here
  await waitForTx(await addressesProviderProxy.setSupportImpl(SupportImpl.address, []));
  // configurator will create proxy for implement
  const SupportAddress = await addressesProviderProxy.getSupport();
  const supportProxy = await getSupport(SupportAddress);
  await insertContractAddressInDb(eContractid.Support, supportProxy.address);

  console.log("-> Prepare CopyrightRegistry...");
  const copyrightRegistryImpl = await deployCopyrightRegistry();
  await waitForTx(await addressesProviderProxy.setCopyrightRegistryImpl(copyrightRegistryImpl.address, []));
  // configurator will create proxy for implement
  const copyrightRegistry = await addressesProviderProxy.getCopyrightRegistry();
  const copyrightRegistryProxy = await getCopyrightRegistry(copyrightRegistry);
  await insertContractAddressInDb(eContractid.CopyrightRegistryProxy, copyrightRegistryProxy.address);

  console.timeEnd("setup");

  //todo - Mon search pool admin in cbp
};

before(async () => {
  await rawBRE.run("set-DRE");
  const deployer = await getDeploySigner();
  const secondaryWallet = await getSecondSigner();
  const FORK = process.env.FORK;

  if (FORK) {
    await rawBRE.run("cbp:mainnet", { skipRegistry: true });
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
