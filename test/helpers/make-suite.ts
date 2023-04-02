import { evmRevert, evmSnapshot, DRE, getNowTimeInSeconds } from "../../helpers/misc-utils";
import { Signer } from "ethers";
import {
  getCBPAddressesProvider,
  getMintableERC20,
  getMintableERC721,
  getSupport,
  getAllMockedTokens,
  getWETHMocked,
  getCopyrightRegistry,
} from "../../helpers/contracts-getters";
import { eEthereumNetwork, eNetwork, tEthereumAddress, TokenContractId } from "../../helpers/types";
import { Support } from "../../types/Support";
import { CopyrightRegistry } from "../../types/CopyrightRegistry";

import { MintableERC20 } from "../../types/MintableERC20";
import { MintableERC721 } from "../../types/MintableERC721";
import { WETH9Mocked } from "../../types/WETH9Mocked";

import { BNFT } from "../../types/BNFT";

import chai from "chai";
// @ts-ignore
import bignumberChai from "chai-bignumber";
import { almostEqual } from "./almost-equal";
import { CBPAddressesProvider } from "../../types/CBPAddressesProvider";
import { getEthersSigners } from "../../helpers/contracts-helpers";
import { getParamPerNetwork } from "../../helpers/contracts-helpers";
import { solidity } from "ethereum-waffle";
import { CBPConfig } from "../../markets/cbp";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { USD_ADDRESS } from "../../helpers/constants";
import { SupportInfo } from "prettier";

chai.use(bignumberChai());
chai.use(almostEqual());
chai.use(solidity);

export interface SignerWithAddress {
  signer: Signer;
  address: tEthereumAddress;
}
export interface TestEnv {
  deployer: SignerWithAddress;
  users: SignerWithAddress[];
  support: Support;
  copyrightRegistry: CopyrightRegistry;

  weth: WETH9Mocked;
  dai: MintableERC20;
  usdc: MintableERC20;
  usdt: MintableERC20;

  //wpunks: WPUNKSMocked;
  bPUNK: BNFT;
  bayc: MintableERC721;
  bBAYC: BNFT;
  addressesProvider: CBPAddressesProvider;

  tokenIdTracker: number;

  roundIdTracker: number;
  nowTimeTracker: number;
}

let buidlerevmSnapshotId: string = "0x1";
const setBuidlerevmSnapshotId = (id: string) => {
  buidlerevmSnapshotId = id;
};

const testEnv: TestEnv = {
  deployer: {} as SignerWithAddress,
  users: [] as SignerWithAddress[],
  support: {} as Support,
  copyrightRegistry: {} as CopyrightRegistry,

  weth: {} as WETH9Mocked,
  dai: {} as MintableERC20,
  usdc: {} as MintableERC20,
  usdt: {} as MintableERC20,

  bPUNK: {} as BNFT,
  bayc: {} as MintableERC721,
  bBAYC: {} as BNFT,
  addressesProvider: {} as CBPAddressesProvider,

  tokenIdTracker: {} as number,
  roundIdTracker: {} as number,
  nowTimeTracker: {} as number,
} as TestEnv;

export async function initializeMakeSuite() {
  const [_deployer, ...restSigners] = await getEthersSigners();
  const deployer: SignerWithAddress = {
    address: await _deployer.getAddress(),
    signer: _deployer,
  };

  for (const signer of restSigners) {
    testEnv.users.push({
      signer,
      address: await signer.getAddress(),
    });
  }

  testEnv.deployer = deployer;
  testEnv.support = await getSupport();
  testEnv.copyrightRegistry = await getCopyrightRegistry();
  testEnv.addressesProvider = await getCBPAddressesProvider();

  // Tokens
  const allTokens = await getAllMockedTokens();
  testEnv.dai = allTokens[TokenContractId.DAI];
  testEnv.usdc = allTokens[TokenContractId.USDC];
  testEnv.usdt = allTokens[TokenContractId.USDT];
  testEnv.weth = await getWETHMocked();

  testEnv.tokenIdTracker = 100;
  testEnv.roundIdTracker = 1;
  testEnv.nowTimeTracker = Number(await getNowTimeInSeconds());
}

const setSnapshot = async () => {
  const hre = DRE as HardhatRuntimeEnvironment;
  setBuidlerevmSnapshotId(await evmSnapshot());
};

const revertHead = async () => {
  const hre = DRE as HardhatRuntimeEnvironment;
  await evmRevert(buidlerevmSnapshotId);
};

export function makeSuite(name: string, tests: (testEnv: TestEnv) => void) {
  describe(name, () => {
    before(async () => {
      await setSnapshot();
    });
    tests(testEnv);
    after(async () => {
      await revertHead();
    });
  });
}
