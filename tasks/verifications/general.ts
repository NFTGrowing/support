// import { ethers, waffle } from "hardhat";
import { task } from "hardhat/config";
// import {

// } from "../../helpers/contracts-deployments";
import { getParamPerNetwork } from "../../helpers/contracts-helpers";
import { eNetwork } from "../../helpers/types";

import { ConfigNames, getReserveFactorCollectorAddress, loadPoolConfig } from "../../helpers/configuration";

import { tEthereumAddress, CBPPools, eContractid } from "../../helpers/types";
import { waitForTx, filterMapBy, notFalsyOrZeroAddress } from "../../helpers/misc-utils";
import { getCopyrightRegistry, getServiceSigner, getDeploySigner } from "../../helpers/contracts-getters";
import { getAllTokenAddresses, getAllNftAddresses } from "../../helpers/mock-helpers";
import { ZERO_ADDRESS } from "../../helpers/constants";
import {
  getAllMockedTokens,
  getAllMockedNfts,
  getCBPAddressesProviderProxy,
  getSupport,
  getWETHMocked,
  getConfiguratorSigner,
  getSupporter,
} from "../../helpers/contracts-getters";
import { insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { Support } from "../../types/Support";

import { TokenContractId } from "../../helpers/types";
import { Address } from "ethereumjs-util";
import { createRandomAddress } from "../../helpers/misc-utils";
import { convertToCurrencyDecimals } from "../../helpers/contracts-helpers";
import { parseEther } from "ethers/lib/utils";
// import { ethers, waffle} from "hardhat";

const theme_1 = 1;
const theme_2 = 2;
const theme_3 = 3;

const enabled_theme = theme_2;

task("verify:mintApproveAsset", "mint and approve token for support").setAction(async ({}, localBRE) => {
  await localBRE.run("set-DRE");
  const network = <eNetwork>localBRE.network.name;

  const addressesProvider = await getCBPAddressesProviderProxy();
  // const admin = await addressesProvider.getConfigurator();
  const poolAdminSigner = await getConfiguratorSigner();
  const simulateSupporter = await getSupporter();

  //   testEnv.support = await getSupport();
  const support = await getSupport();

  const allTokens = await getAllMockedTokens();
  const weth = allTokens[TokenContractId.WETH];
  const usdc = allTokens[TokenContractId.USDC];
  const usdt = allTokens[TokenContractId.USDT];

  const assetAddr = await support.getAssetsAddr();
  console.log("assetAddr", assetAddr);
  // expect(assetAddr[0], "ETH is default as zero").to.be.eq(zeroAddr);
  // expect(assetAddr[1], "WETH addr is set as expected").to.be.eq(mockedAddrWETH);
  // expect(assetAddr[2], "Second addr is set as expected").to.be.eq(mockedAddrUSDC);
  // expect(assetAddr[3], "Third addr is set as expected").to.be.eq(mockedAddrUSDT);

  //-- Mint and approve token for test acount
  const supporterAddr = await simulateSupporter.getAddress();
  console.log("supporterAddr", supporterAddr);

  //comment because real weth has no mint function
  // await weth.connect(poolAdminSigner).mint(await convertToCurrencyDecimals(weth.address, "100"));
  // await weth.connect(poolAdminSigner).transfer(supporterAddr, await convertToCurrencyDecimals(weth.address, "10"))
  // await weth.connect(simulateSupporter).approve(support.address, await convertToCurrencyDecimals(weth.address, "10"));

  await usdc.connect(poolAdminSigner).mint(await convertToCurrencyDecimals(usdc.address, "10000"));
  //Delay for some time
  await new Promise((f) => setTimeout(f, 15000));
  await usdc.connect(poolAdminSigner).transfer(supporterAddr, await convertToCurrencyDecimals(usdc.address, "1000"));
  await usdc.connect(simulateSupporter).approve(support.address, await convertToCurrencyDecimals(usdc.address, "1000"));

  await usdt.connect(poolAdminSigner).mint(await convertToCurrencyDecimals(usdt.address, "10000"));
  // Delay for some time
  await new Promise((f) => setTimeout(f, 15000));
  await usdt.connect(poolAdminSigner).transfer(supporterAddr, await convertToCurrencyDecimals(usdt.address, "1000"));
  await usdt.connect(simulateSupporter).approve(support.address, await convertToCurrencyDecimals(usdt.address, "1000"));
});

task("verify:listNewTheme", "Initialize support.").setAction(async ({}, localBRE) => {
  await localBRE.run("set-DRE");
  const network = <eNetwork>localBRE.network.name;

  const addressesProvider = await getCBPAddressesProviderProxy();
  // const admin = await addressesProvider.getConfigurator();
  const poolAdminSigner = await getConfiguratorSigner();
  const simulateSupporter = await getSupporter();

  //   testEnv.support = await getSupport();
  const support = await getSupport();

  //Enable the mockedAddressActive
  const mockedAddressActive = createRandomAddress();
  console.log("the mocked addr is:", mockedAddressActive);
  console.log("Enable the mockedAddressActive");
  await waitForTx(await support.connect(poolAdminSigner).updateStatus([mockedAddressActive], true));

  //Enable --
  //-- updateThemeIssueSchedule
  // every two weeks' tuesday 0am is the starting point -
  // Date and time (GMT): Tuesday, December 13, 2022 12:00:00 AM
  // const baseStartTime = 1670889600;
  // Two weeks
  // const issueDurationTime = 1209600;

  // // Date and time (GMT): Tuesday, November 29, 2022 12:00:00 AM
  // const baseStartTime = 1669680000;
  // // Two weeks
  // const issueDurationTime = 1209600;

  // Date and time (GMT): Tuesday, November 15, 2022 12:00:00 AM
  const baseStartTime = 1668470400;
  // Two weeks
  const issueDurationTime = 1209600;

  //updateThemeIssueSchedule
  console.log("updateThemeIssueSchedule");
  await waitForTx(
    await support
      .connect(poolAdminSigner)
      .updateThemeIssueSchedule(mockedAddressActive, 1, baseStartTime, issueDurationTime)
  );
});

task("verify:longTermSupport", "longTermSupport").setAction(async ({}, localBRE) => {
  await localBRE.run("set-DRE");
  const network = <eNetwork>localBRE.network.name;

  const addressesProvider = await getCBPAddressesProviderProxy();
  // const admin = await addressesProvider.getConfigurator();
  const poolAdminSigner = await getConfiguratorSigner();
  const simulateSupporter = await getSupporter();

  //   testEnv.support = await getSupport();
  const support = await getSupport();

  const allTokens = await getAllMockedTokens();
  const weth = allTokens[TokenContractId.WETH];
  const usdc = allTokens[TokenContractId.USDC];
  const usdt = allTokens[TokenContractId.USDT];

  //-- support the active theme
  const depositSize = parseEther("0.015");
  const depositUSDCSize = await convertToCurrencyDecimals(usdc.address, "2.05");
  const depositUSDTSize = await convertToCurrencyDecimals(usdt.address, "3.05");
  const depositWETHSize = await convertToCurrencyDecimals(weth.address, "4.05");

  console.log("support the active one");

  const beforeSupport = await support.getThemeSupport(enabled_theme);
  console.log("ETH:", beforeSupport.balances.assetsArray[0]);
  console.log("WETH:", beforeSupport.balances.assetsArray[1]);
  console.log("USDC:", beforeSupport.balances.assetsArray[2]);
  console.log("USDT:", beforeSupport.balances.assetsArray[3]);

  const balanceOfWETH = await weth.balanceOf(support.address);
  const balanceOfUSDC = await usdc.balanceOf(support.address);
  const balanceOfUSDT = await usdt.balanceOf(support.address);

  //Support ETH
  await waitForTx(
    await support.connect(simulateSupporter).longTermSupport(enabled_theme, 0, 0, { value: depositSize })
  );

  //Support WETH
  // console.log("depositWETHSize: ", depositWETHSize);
  // await waitForTx(
  //     await support
  //     .connect(simulateSupporter)
  //     .longTermSupport(
  //         enabled_theme,
  //         1,
  //         depositWETHSize
  //     )
  // );

  //Support USDC
  await waitForTx(await support.connect(simulateSupporter).longTermSupport(enabled_theme, 2, depositUSDCSize));

  //Support USDT
  await waitForTx(await support.connect(simulateSupporter).longTermSupport(enabled_theme, 3, depositUSDTSize));

  const afterLongTermSupport = await support.getThemeSupport(enabled_theme);
  console.log("ETH:", afterLongTermSupport.balances.assetsArray[0]);
  console.log("WETH:", afterLongTermSupport.balances.assetsArray[1]);
  console.log("USDC:", afterLongTermSupport.balances.assetsArray[2]);
  console.log("USDT:", afterLongTermSupport.balances.assetsArray[3]);
});

task("verify:caseByCaseSupport", "caseByCaseSupport").setAction(async ({}, localBRE) => {
  await localBRE.run("set-DRE");
  // const network = <eNetwork>localBRE.network.name;

  // const addressesProvider = await getCBPAddressesProviderProxy();
  // const admin = await addressesProvider.getConfigurator();
  // const poolAdminSigner = await getConfiguratorSigner();
  const simulateSupporter = await getSupporter();

  //   testEnv.support = await getSupport();
  const support = await getSupport();

  // const allTokens = await getAllMockedTokens();
  // const weth = allTokens[TokenContractId.WETH];
  // const usdc = allTokens[TokenContractId.USDC];
  // const usdt = allTokens[TokenContractId.USDT];

  console.log("support the active one");

  const beforeSupport = await support.getThemeSupport(enabled_theme);
  console.log("ETH:", beforeSupport.balances.assetsArray[0]);
  console.log("WETH:", beforeSupport.balances.assetsArray[1]);
  console.log("USDC:", beforeSupport.balances.assetsArray[2]);
  console.log("USDT:", beforeSupport.balances.assetsArray[3]);

  // const balanceOfETHCase = await ethers.provider.getBalance(support.address);
  // const balanceOfWETH = await weth.balanceOf(support.address);
  // const balanceOfUSDC = await usdc.balanceOf(support.address);
  // const balanceOfUSDT = await usdt.balanceOf(support.address);

  //-- case by case support
  const depositSizeCase = parseEther("0.0016");
  // const depositWETHCase = await convertToCurrencyDecimals(weth.address, "7.05");
  // const depositUSDCCase = await convertToCurrencyDecimals(usdc.address, "5.05");
  // const depositUSDTCase = await convertToCurrencyDecimals(usdt.address, "6.05");

  const supportingIssueNo = 2;
  console.log("support the active one");
  //Support ETH
  const txResult = await waitForTx(
    await support.connect(simulateSupporter).caseByCaseSupport(2, 0, 0, 3, 2, { value: depositSizeCase })
    //.caseByCaseSupport(enabled_theme, 2, 100, supportingIssueNo, 1)
  );
  console.log(JSON.stringify(txResult.events));
  // if (txResult.events){
  //   for( const item in txResult.events){
  //     console.log("event:", item)
  //   }
  // }

  // const supportWithETHCase = await support.getThemeSupport(enabled_theme);
  // console.log("ETH:", supportWithETHCase.balances.assetsArray[0]);
  // console.log("WETH:", supportWithETHCase.balances.assetsArray[1]);
  // console.log("USDC:", supportWithETHCase.balances.assetsArray[2]);
  // console.log("USDT:", supportWithETHCase.balances.assetsArray[3]);

  //Support WETH
  // console.log("depositWETHSize: ", depositWETHCase);
  // await waitForTx(
  //     await support
  //     .connect(simulateSupporter)
  //     .caseByCaseSupport(
  //         enabled_theme,
  //         1,
  //         depositWETHCase,
  //         1,
  //         2
  //     )
  // );

  //Support USDC
  /*
    await waitForTx(
        await support
        .connect(simulateSupporter)
        .caseByCaseSupport(
            enabled_theme,
            2,
            depositUSDCCase,
            supportingIssueNo,
            3
        )
    );
    */

  //Support USDT
  /*
    await waitForTx(
        await support
        .connect(simulateSupporter)
        .caseByCaseSupport(
            enabled_theme,
            3,
            depositUSDTCase,
            supportingIssueNo,
            4
        )
    );
    */

  //-- get slot info for checking
  const themeIssueData = await support.getThemeIssuesData(enabled_theme, supportingIssueNo, supportingIssueNo);
  console.log(
    "issue inf ",
    themeIssueData[0].slotsView[0],
    themeIssueData[0].slotsView[1],
    themeIssueData[0].slotsView[2],
    themeIssueData[0].slotsView[3],
    themeIssueData[0].slotsView[4]
  );

  const afterLongTermSupport = await support.getThemeSupport(enabled_theme);
  console.log("After ETH:", afterLongTermSupport.balances.assetsArray[0]);
  console.log("After WETH:", afterLongTermSupport.balances.assetsArray[1]);
  console.log("After USDC:", afterLongTermSupport.balances.assetsArray[2]);
  console.log("After USDT:", afterLongTermSupport.balances.assetsArray[3]);
});

task("verify:getThemesIssueNo", "getThemesIssueNo").setAction(async ({}, localBRE) => {
  await localBRE.run("set-DRE");

  //   testEnv.support = await getSupport();
  const support = await getSupport();

  //Support ETH
  const getResult = await support.getThemesIssueNo([theme_1, theme_2]);
  console.log("IssueNo", getResult);
});

task("verify:tokenRegistry", "tokenRegistry").setAction(async ({}, localBRE) => {
  await localBRE.run("set-DRE");

  const copyrightRegistry = await getCopyrightRegistry();

  console.log("depoly copyright tracking token");
  const serviceSigner = await getServiceSigner();
  const registerTokenAcc = await getSupporter();

  const testSigStr =
    "0x6c6134aa31d480ff3711ecd1ad1f7d9701732af7e77640e6c1b9523cb7204fc13f9361c8c232ea5e28bcf952ccde2a0182bc547ac1ffff58c8a3a68c192d9df31c";

  // web3.utils.toBN("2000000000000000000000000")
  //  BigNumber.from("2000000000000000000000000")

  await waitForTx(
    await copyrightRegistry
      .connect(registerTokenAcc)
      .registerWorkToken(testSigStr, 0, 9, "L13", "only L1 3", "50000000000000000000000000")
  );
});

task("verify:tokenClaim", "tokenClaim").setAction(async ({}, localBRE) => {
  await localBRE.run("set-DRE");

  const copyrightRegistry = await getCopyrightRegistry();

  const supporterSigner = await getSupporter();

  const testSigStr =
    "0x9028dddbdbebb39c32b04a3cd1e8119bdad33ee2e32d84e7c5586ea2651899d0664ee282132a0c62dd51a231b1b2c2d27f1c1fb4dfc6138dafd41c5ccffbb99b1b";

  // web3.utils.toBN("2000000000000000000000000")
  //  BigNumber.from("2000000000000000000000000")

  await waitForTx(
    await copyrightRegistry
      .connect(supporterSigner)
      .claimWorkToken(
        testSigStr,
        0,
        [9],
        "0x5d919fb1583d50e6ec5bedbd705b1f75ef334173",
        ["25000000000000000000000000"],
        "0xbf6c5ecae8e092cecb7c058decde09e81098c153"
      )
  );
});
