import { task } from "hardhat/config";
// import {
  
// } from "../../helpers/contracts-deployments";
import { getParamPerNetwork } from "../../helpers/contracts-helpers";
import { eNetwork } from "../../helpers/types";
import { ConfigNames, getReserveFactorCollectorAddress, loadPoolConfig } from "../../helpers/configuration";

import { tEthereumAddress, BendPools, eContractid } from "../../helpers/types";
import { waitForTx, filterMapBy, notFalsyOrZeroAddress } from "../../helpers/misc-utils";
import { getAllTokenAddresses, getAllNftAddresses } from "../../helpers/mock-helpers";
import { ZERO_ADDRESS } from "../../helpers/constants";
import {
  getAllMockedTokens,
  getAllMockedNfts,
  getStakingAddressesProvider,
  getSupport,
  getWETHMocked,
  getPoolAdminSigner,
} from "../../helpers/contracts-getters";
import { insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { Support } from "../../types/Support";

import { TokenContractId } from "../../helpers/types";
import { Address } from "ethereumjs-util";
import { createRandomAddress } from "../../helpers/misc-utils";


task("dev:initialize-support", "Initialize support.")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = <eNetwork>localBRE.network.name;
    
    const addressesProvider = await getStakingAddressesProvider();
    // const admin = await addressesProvider.getPoolAdmin();
    const poolAdminSigner = await getPoolAdminSigner();

    //   testEnv.support = await getSupport(); 
    const support = await getSupport();
    
    const allTokens = await getAllMockedTokens();
    const weth = allTokens[TokenContractId.WETH];
    const usdc = allTokens[TokenContractId.USDC];
    const usdt = allTokens[TokenContractId.USDT];

    const zeroAddr = Address.zero().toString();
    const mockedAddrUSDC = usdc.address;
    const mockedAddrUSDT = usdt.address;
    const mockedAddrWETH = weth.address;

    console.log("Setup the addr of the supported asset");
    await waitForTx(
        await support
          .connect(poolAdminSigner)
          .setAssetsAddr(
            [zeroAddr, mockedAddrWETH, mockedAddrUSDC, mockedAddrUSDT]
          )
      );
      

    //Enable the mockedAddressActive
    const mockedAddressActive = createRandomAddress();
    console.log("Enable the mockedAddressActive");
    await waitForTx(
        await support
            .connect(poolAdminSigner)
            .updateStatus(
            [mockedAddressActive],
            true
            )
        );
    
    //Enable -- 
    //-- updateCollectionIssueSchedule
    // every two weeks' tuesday 0am is the starting point - 
    // Date and time (GMT): Tuesday, December 13, 2022 12:00:00 AM
    const baseStartTime = 1670889600;
    // Two weeks
    const issueDurationTime = 1209600;

    //updateCollectionIssueSchedule
    console.log("updateCollectionIssueSchedule");
    await waitForTx(
        await support
          .connect(poolAdminSigner)
          .updateCollectionIssueSchedule(
            mockedAddressActive,
            1,
            baseStartTime,
            issueDurationTime
          )
      );
  });
