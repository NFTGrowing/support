import { task } from "hardhat/config";
// import {

// } from "../../helpers/contracts-deployments";
import { getParamPerNetwork } from "../../helpers/contracts-helpers";
import { eNetwork } from "../../helpers/types";
import { ConfigNames, getReserveFactorCollectorAddress, loadPoolConfig } from "../../helpers/configuration";

import { tEthereumAddress, CBPPools, eContractid } from "../../helpers/types";
import { waitForTx, filterMapBy, notFalsyOrZeroAddress } from "../../helpers/misc-utils";
import { getAllTokenAddresses, getAllNftAddresses } from "../../helpers/mock-helpers";
import { ZERO_ADDRESS } from "../../helpers/constants";
import {
  getAllMockedTokens,
  getAllMockedNfts,
  getCBPAddressesProviderProxy,
  getSupport,
  getWETHMocked,
  getConfiguratorSigner,
  getOperatorSigner,
} from "../../helpers/contracts-getters";
import { insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { Support } from "../../types/Support";

import { TokenContractId } from "../../helpers/types";
import { Address } from "ethereumjs-util";
import { createRandomAddress } from "../../helpers/misc-utils";

task("dev:initialize-support", "Initialize support.")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({}, localBRE) => {
    await localBRE.run("set-DRE");
    const network = <eNetwork>localBRE.network.name;

    // const addressesProvider = await getCBPAddressesProviderProxy();
    // const admin = await addressesProvider.getConfigurator();
    const configuratorSigner = await getConfiguratorSigner();
    // const configuratorSigner = await getOperatorSigner();

    //   testEnv.support = await getSupport();
    const support = await getSupport();
    console.log("get support result is:", support.address);

    // const allTokens = await getAllMockedTokens();
    // const weth = allTokens[TokenContractId.WETH];
    // const usdc = allTokens[TokenContractId.USDC];
    // const usdt = allTokens[TokenContractId.USDT];

    const zeroAddr = Address.zero().toString();
    // const mockedAddrUSDC = usdc.address;
    // const mockedAddrUSDT = usdt.address;
    // const mockedAddrWETH = weth.address;

    console.log("Setup the addr of the supported asset");
    await waitForTx(await support.connect(configuratorSigner).setAssetsAddr([zeroAddr, zeroAddr, zeroAddr, zeroAddr]));

    //Enable the mockedAddressActive
    // const mockedAddressActive = createRandomAddress();
    // console.log("the mocked addr is:", mockedAddressActive)
    console.log("Enable the theme 1, 2");
    await waitForTx(await support.connect(configuratorSigner).updateStatus([1, 2], true));

    //Enable --
    //-- updateThemeIssueSchedule
    // https://www.epochconverter.com/
    // Date and time (GMT): Thursday, August 31, 2023 0:00:00
    const baseStartTime = 1693440000;

    // https://www.epochconverter.com/
    // Date and time (GMT): Thursday, August 31, 2023 0:00:00
    const baseStartTime2 = 1693440000;

    // Two weeks
    const issueDurationTime = 172800;

    //updateCollectionIssueSchedule
    console.log("updateCollectionIssueSchedule to theme 1");
    await waitForTx(
      await support.connect(configuratorSigner).updateThemeIssueSchedule(1, 1, baseStartTime, issueDurationTime)
    );

    console.log("updateCollectionIssueSchedule to theme 2");
    await waitForTx(
      await support.connect(configuratorSigner).updateThemeIssueSchedule(2, 1, baseStartTime2, issueDurationTime)
    );
  });

task("dev:setup-themeschedule", "setup theme schedulesupport")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({}, localBRE) => {
    await localBRE.run("set-DRE");
    const network = <eNetwork>localBRE.network.name;

    const addressesProvider = await getCBPAddressesProviderProxy();
    // const admin = await addressesProvider.getConfigurator();
    const poolAdminSigner = await getConfiguratorSigner();

    //   testEnv.support = await getSupport();
    const support = await getSupport();

    //Enable --
    //-- updateThemeIssueSchedule
    // https://www.epochconverter.com/
    // Date and time (GMT): Tuesday, January 17, 2023 12:00:00 AM

    // Epoch timestamp: 1676332800
    // Date and time (GMT): Tuesday, February 14, 2023 0:00:00
    const baseStartTimeNew = 1676332800;
    const theme1_new_issue = 3;
    const theme2_new_issue = 2;

    // https://www.epochconverter.com/
    // Date and time (GMT): Tuesday, January 31, 2023 12:00:00 AM
    // const baseStartTime2 = 1675123200;

    // Two weeks
    // const issueDurationTime = 1209600;
    // Two days
    const issueDurationTimeTest = 172800;

    //updateCollectionIssueSchedule
    console.log("updateCollectionIssueSchedule to theme 1");
    await waitForTx(
      await support
        .connect(poolAdminSigner)
        .updateThemeIssueSchedule(1, theme1_new_issue, baseStartTimeNew, issueDurationTimeTest)
    );

    console.log("updateCollectionIssueSchedule to theme 2");
    await waitForTx(
      await support
        .connect(poolAdminSigner)
        .updateThemeIssueSchedule(2, theme2_new_issue, baseStartTimeNew, issueDurationTimeTest)
    );
  });

task("dev:set-assetaddress", "Initialize support.")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({}, localBRE) => {
    await localBRE.run("set-DRE");

    // const admin = await addressesProvider.getConfigurator();
    const configuratorSigner = await getConfiguratorSigner();

    const support = await getSupport();
    console.log("get support result is:", support.address);

    const zeroAddr = Address.zero().toString();
    // const mockedAddrUSDC = usdc.address;
    // const mockedAddrUSDT = usdt.address;
    // const mockedAddrWETH = weth.address;

    console.log("Setup the addr of the supported asset");
    await waitForTx(
      await support
        .connect(configuratorSigner)
        .setAssetsAddr([zeroAddr, zeroAddr, "0x4aCEe2AEb2848456a478A6CdBddd8E62113012AB", zeroAddr])
    );
  });
