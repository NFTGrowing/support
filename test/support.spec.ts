import { ethers, waffle } from "hardhat";
import { createRandomAddress } from "../helpers/misc-utils";
import { TestEnv, makeSuite } from "./helpers/make-suite";

import { convertToCurrencyDecimals } from "../helpers/contracts-helpers";
import BigNumber from "bignumber.js";
import { BigNumber as BN } from "ethers";
import { getReservesConfigByPool } from "../helpers/configuration";
import { MintableERC20 } from "../types/MintableERC20";
import { string } from "hardhat/internal/core/params/argumentTypes";
import { waitForTx } from "../helpers/misc-utils";
import { getConfiguratorSigner, getOperatorSigner, getSupport } from "../helpers/contracts-getters";

import { parseEther } from "ethers/lib/utils";
import { MAX_UINT_AMOUNT } from "../helpers/constants";
import { Console } from "console";
import { Address } from "ethereumjs-util";

const { expect } = require("chai");

makeSuite("Support: test support", (testEnv: TestEnv) => {
  before("Initializing configuration", async () => {
    // Sets BigNumber for this suite, instead of globally
    BigNumber.config({
      DECIMAL_PLACES: 0,
      ROUNDING_MODE: BigNumber.ROUND_DOWN,
    });

    // actionsConfiguration.skipIntegrityCheck = false; //set this to true to execute solidity-coverage
  });
  after("Reset", () => {
    // Reset BigNumber
    BigNumber.config({
      DECIMAL_PLACES: 20,
      ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
    });
  });

  it("Support the theme", async () => {
    const { users, bayc, support, weth, usdc, usdt } = testEnv;

    const poolAdminSigner = await getConfiguratorSigner();
    const operatorSigner = await getOperatorSigner();

    const depositor = users[0];
    const themeSupporter = users[2];

    const settleOperator = users[6];

    /*
    // WETH
    await mintERC20(testEnv, depositor, "WETH", "10");
    await approveERC20(testEnv, depositor, "WETH");
    await deposit(testEnv, depositor, "", "WETH", "10", depositor.address, "success", "");
    */

    const userBalanceBeforeSupport = await ethers.provider.getBalance(themeSupporter.signer.getAddress());
    console.log("supporter's bal", userBalanceBeforeSupport);
    console.log("supporter.address", themeSupporter.address);
    const supportAddr = (await getSupport()).address;
    console.log("stakingAddr", supportAddr);

    //-- Setup the addr of the supported asset
    const zeroAddr = Address.zero().toString();
    // const mockedAddrUSDC = createRandomAddress();
    // const mockedAddrUSDT = createRandomAddress();
    // const mockedAddrWETH = createRandomAddress();
    const mockedAddrUSDC = usdc.address;
    const mockedAddrUSDT = usdt.address;
    const mockedAddrWETH = weth.address;

    // console.log("Four assets addr:", zeroAddr, mockedAddrUSDC, mockedAddrUSDT, mockedAddrWETH);
    console.log("Setup the addr of the supported asset");
    await waitForTx(
      await support.connect(poolAdminSigner).setAssetsAddr([zeroAddr, mockedAddrWETH, mockedAddrUSDC, mockedAddrUSDT])
    );

    //-- check asset addr
    const assetAddr = await support.getAssetsAddr();
    expect(assetAddr[0], "ETH is default as zero").to.be.eq(zeroAddr);
    expect(assetAddr[1], "WETH addr is set as expected").to.be.eq(mockedAddrWETH);
    expect(assetAddr[2], "Second addr is set as expected").to.be.eq(mockedAddrUSDC);
    expect(assetAddr[3], "Third addr is set as expected").to.be.eq(mockedAddrUSDT);

    //-- Mint and approve token for test acount
    await weth.connect(depositor.signer).mint(await convertToCurrencyDecimals(weth.address, "100"));
    await weth
      .connect(depositor.signer)
      .transfer(themeSupporter.address, await convertToCurrencyDecimals(weth.address, "10"));
    await weth
      .connect(themeSupporter.signer)
      .approve(support.address, await convertToCurrencyDecimals(weth.address, "10"));

    await usdc.connect(depositor.signer).mint(await convertToCurrencyDecimals(usdc.address, "100"));
    await usdc
      .connect(depositor.signer)
      .transfer(themeSupporter.address, await convertToCurrencyDecimals(usdc.address, "10"));
    await usdc
      .connect(themeSupporter.signer)
      .approve(support.address, await convertToCurrencyDecimals(usdc.address, "10"));
    console.log("usdc allowance: ", await usdc.allowance(themeSupporter.address, support.address));

    await usdt.connect(depositor.signer).mint(await convertToCurrencyDecimals(usdt.address, "100"));
    await usdt
      .connect(depositor.signer)
      .transfer(themeSupporter.address, await convertToCurrencyDecimals(usdt.address, "10"));
    await usdt
      .connect(themeSupporter.signer)
      .approve(support.address, await convertToCurrencyDecimals(usdt.address, "10"));
    console.log("usdt allowance: ", await usdt.allowance(themeSupporter.address, support.address));

    //-- Mock two addresses, active the first one
    const themeIDActive = 1;
    const themeIDNotActive = 2;
    const themeIDActiveSec = 3;
    // expect(themeIDActive, "Two mocked addr is different").to.not.be.eq(themeIDNotActive);

    //Enable the mockedAddressActive
    console.log("Enable the mockedAddressActive");

    await waitForTx(await support.connect(poolAdminSigner).updateStatus([themeIDActive], true));

    const SupportActive = await support.getThemeSupport(themeIDActive);
    const SupportNotActive = await support.getThemeSupport(themeIDNotActive);
    expect(SupportActive.supporting, "SupportActive Enabled").to.be.eq(true);
    expect(SupportNotActive.supporting, "SupportNotActive not Enabled").to.be.eq(false);
    //console.log("themeSupportActive", SupportActive.supporting);
    //console.log("themeSupportNotActive", SupportNotActive.supporting);

    //-- support the active theme
    const depositSize = parseEther("1.05");
    const depositUSDCSize = await convertToCurrencyDecimals(usdc.address, "2.05");
    const depositUSDTSize = await convertToCurrencyDecimals(usdt.address, "3.05");
    const depositWETHSize = await convertToCurrencyDecimals(weth.address, "4.05");

    console.log("support the active one");
    // Support ETH
    // await waitForTx(
    //   await support.connect(themeSupporter.signer).longTermSupport(themeIDActive, 0, 0, { value: depositSize })
    // );

    /*
    //Long Support before init 
    console.log("Long Support before open");
    await waitForTx(
      await support.connect(themeSupporter.signer).longTermSupport(themeIDNotActive, 0, 0, { value: depositSize })
    );
    */

    // const supportWithETH = await support.getThemeSupport(themeIDActive);
    // console.log("ETH:", supportWithETH.balances.assetsArray[0]);
    // console.log("WETH:", supportWithETH.balances.assetsArray[1]);
    // console.log("USDC:", supportWithETH.balances.assetsArray[2]);
    // console.log("USDT:", supportWithETH.balances.assetsArray[3]);

    // console.log("183");

    // expect(supportWithETH.balances.assetsArray[0]).to.be.eq(depositSize);

    // //Support WETH
    // console.log("depositWETHSize: ", depositWETHSize);
    // await waitForTx(await support.connect(themeSupporter.signer).longTermSupport(themeIDActive, 1, depositWETHSize));

    // const supportWithWETH = await support.getThemeSupport(themeIDActive);
    // console.log("ETH:", supportWithWETH.balances.assetsArray[0]);
    // console.log("WETH:", supportWithWETH.balances.assetsArray[1]);
    // console.log("USDC:", supportWithWETH.balances.assetsArray[2]);
    // console.log("USDT:", supportWithWETH.balances.assetsArray[3]);

    // expect(supportWithWETH.balances.assetsArray[1]).to.be.eq(depositWETHSize);
    // const balanceOfWETH = await weth.balanceOf(support.address);
    // expect(balanceOfWETH).to.be.eq(depositWETHSize);

    // //Support USDC
    // await waitForTx(await support.connect(themeSupporter.signer).longTermSupport(themeIDActive, 2, depositUSDCSize));

    // const supportWithUSDC = await support.getThemeSupport(themeIDActive);
    // console.log("ETH:", supportWithUSDC.balances.assetsArray[0]);
    // console.log("WETH:", supportWithUSDC.balances.assetsArray[1]);
    // console.log("USDC:", supportWithUSDC.balances.assetsArray[2]);
    // console.log("USDT:", supportWithUSDC.balances.assetsArray[3]);

    // expect(supportWithUSDC.balances.assetsArray[2]).to.be.eq(depositUSDCSize);
    // const balanceOfUSDC = await usdc.balanceOf(support.address);
    // expect(balanceOfUSDC).to.be.eq(depositUSDCSize);

    // //Support USDT
    // await waitForTx(await support.connect(themeSupporter.signer).longTermSupport(themeIDActive, 3, depositUSDTSize));

    // const supportWithUSDT = await support.getThemeSupport(themeIDActive);
    // console.log("ETH:", supportWithUSDT.balances.assetsArray[0]);
    // console.log("WETH:", supportWithUSDT.balances.assetsArray[1]);
    // console.log("USDC:", supportWithUSDT.balances.assetsArray[2]);
    // console.log("USDT:", supportWithUSDT.balances.assetsArray[3]);

    // expect(supportWithUSDT.balances.assetsArray[3]).to.be.eq(depositUSDTSize);
    // const balanceOfUSDT = await usdt.balanceOf(support.address);
    // expect(balanceOfUSDT).to.be.eq(depositUSDTSize);

    // /*

    // //support the not active one
    // console.log("support the not active one");
    // await waitForTx(
    //   await support
    //     .connect(supporter.signer)
    //     .longTermSupport(
    //         mockedAddressNotActive,
    //         0,
    //         0
    //     )
    // );

    // */

    //-- updateThemeIssueSchedule
    // https://www.epochconverter.com/
    // Date and time (GMT): Friday, June 2, 2023 0:00:00
    const baseStartTime = 1685664000;
    // Two weeks
    const issueDurationTime = 1209600;

    //updateThemeIssueSchedule
    console.log("updateThemeIssueSchedule");
    await waitForTx(
      await support
        .connect(poolAdminSigner)
        .updateThemeIssueSchedule(themeIDActive, 1, baseStartTime, issueDurationTime)
    );

    /*
    //test updateThemeIssueSchedule with non admin account
    console.log("updateThemeIssueSchedule");
    await waitForTx(
      await support
        .connect(themeSupporter.signer)
        .updateThemeIssueSchedule(themeIDActive, 1, baseStartTime, issueDurationTime)
    );
    */

    //Get and print the issue schedule
    const themesIssueSchedule = await support.getThemesIssueSchedule([themeIDActive]);
    console.log(themesIssueSchedule);

    // //-- case by case support
    const depositSizeCase = parseEther("3.05");
    const depositUSDCCase = await convertToCurrencyDecimals(usdc.address, "2.05");
    const depositUSDTCase = await convertToCurrencyDecimals(usdt.address, "3.05");
    const depositWETHCase = await convertToCurrencyDecimals(weth.address, "4.05");

    // /*
    // console.log("Case by case support before open");
    // //Support ETH
    // await waitForTx(
    //   await support
    //     .connect(themeSupporter.signer)
    //     .caseByCaseSupport(themeIDNotActive, 0, 0, 1, 1, { value: depositSizeCase })
    // );
    // */

    // /*
    // await waitForTx(await support.connect(poolAdminSigner).updateStatus([themeIDActive], false));
    // */

    console.log("support the active one");
    //Support ETH
    await waitForTx(
      await support
        .connect(themeSupporter.signer)
        .caseByCaseSupport(themeIDActive, 0, 0, 1, 1, { value: depositSizeCase })
    );

    const supportWithETHCase = await support.getThemeSupport(themeIDActive);
    console.log("ETH:", supportWithETHCase.balances.assetsArray[0]);
    // console.log("WETH:", supportWithETHCase.balances.assetsArray[1]);
    // console.log("USDC:", supportWithETHCase.balances.assetsArray[2]);
    // console.log("USDT:", supportWithETHCase.balances.assetsArray[3]);

    expect(supportWithETHCase.balances.assetsArray[0]).to.be.eq(depositSizeCase);

    const balanceOfETHCase = await ethers.provider.getBalance(support.address);
    expect(balanceOfETHCase).to.be.eq(depositSizeCase);

    // Support WETH
    // console.log("depositWETHSize: ", depositWETHSize);
    // await waitForTx(
    //   await support.connect(themeSupporter.signer).caseByCaseSupport(themeIDActive, 1, depositWETHCase, 1, 2)
    // );

    //   const supportWithWETHCase = await support.getThemeSupport(themeIDActive);
    //   console.log("ETH:", supportWithWETHCase.balances.assetsArray[0]);
    //   console.log("WETH:", supportWithWETHCase.balances.assetsArray[1]);
    //   console.log("USDC:", supportWithWETHCase.balances.assetsArray[2]);
    //   console.log("USDT:", supportWithWETHCase.balances.assetsArray[3]);

    //   expect(supportWithWETHCase.balances.assetsArray[1]).to.be.eq(depositWETHSize.add(depositWETHCase));
    //   const balanceOfWETHCase = await weth.balanceOf(support.address);
    //   expect(balanceOfWETHCase).to.be.eq(depositWETHSize.add(depositWETHCase));

    //Support USDC
    // await waitForTx(
    //   await support.connect(themeSupporter.signer).caseByCaseSupport(themeIDActive, 2, depositUSDCCase, 1, 3)
    // );

    //   const supportWithUSDCCase = await support.getThemeSupport(themeIDActive);
    //   console.log("ETH:", supportWithUSDCCase.balances.assetsArray[0]);
    //   console.log("WETH:", supportWithUSDCCase.balances.assetsArray[1]);
    //   console.log("USDC:", supportWithUSDCCase.balances.assetsArray[2]);
    //   console.log("USDT:", supportWithUSDCCase.balances.assetsArray[3]);

    //   expect(supportWithUSDCCase.balances.assetsArray[2]).to.be.eq(depositUSDCSize.add(depositUSDCCase));
    //   const balanceOfUSDCCase = await usdc.balanceOf(support.address);
    //   expect(balanceOfUSDCCase).to.be.eq(depositUSDCSize.add(depositUSDCCase));

    //Support USDT
    // await waitForTx(
    //   await support.connect(themeSupporter.signer).caseByCaseSupport(themeIDActive, 3, depositUSDTCase, 1, 4)
    // );

    //   const supportWithUSDTCase = await support.getThemeSupport(themeIDActive);
    //   console.log("ETH:", supportWithUSDTCase.balances.assetsArray[0]);
    //   console.log("WETH:", supportWithUSDTCase.balances.assetsArray[1]);
    //   console.log("USDC:", supportWithUSDTCase.balances.assetsArray[2]);
    //   console.log("USDT:", supportWithUSDTCase.balances.assetsArray[3]);

    //   expect(supportWithUSDTCase.balances.assetsArray[3]).to.be.eq(depositUSDTSize.add(depositUSDTCase));
    //   const balanceOfUSDTCase = await usdt.balanceOf(support.address);
    //   expect(balanceOfUSDTCase).to.be.eq(depositUSDTSize.add(depositUSDTCase));

    //   //-- get slot info for checking
    //   const themeIssueData = await support.getThemeIssuesData(themeIDActive, 1, 1);
    //   console.log(
    //     "issue inf ",
    //     themeIssueData[0].slotsView[0],
    //     themeIssueData[0].slotsView[1],
    //     themeIssueData[0].slotsView[2],
    //     themeIssueData[0].slotsView[3],
    //     themeIssueData[0].slotsView[4]
    //   );

    //-- withdrawForOneIssue
    // settleOperator
    const withdrawSize = parseEther("0.5");
    const withdrawWETHSize = await convertToCurrencyDecimals(weth.address, "0");
    const withdrawUSDCSize = await convertToCurrencyDecimals(usdc.address, "0");
    const withdrawUSDTSize = await convertToCurrencyDecimals(usdt.address, "0");

    await waitForTx(
      await support
        .connect(operatorSigner)
        .withdrawForOneIssue(themeIDActive, 1, settleOperator.address, [
          withdrawSize,
          withdrawWETHSize,
          withdrawUSDCSize,
          withdrawUSDTSize,
        ])
    );

    const withdrawForIssueResult = await support.getThemeSupport(themeIDActive);
    // check balance
    // expect(supportWithETHCase.balances.assetsArray[0]).to.be.eq(depositSize.add(depositSizeCase));
    //eth
    const ethWithdrawResultExpec = balanceOfETHCase.sub(withdrawSize);
    const actualAfterWithdrawETH = await ethers.provider.getBalance(support.address);
    const recordAfterWithdrawETH = withdrawForIssueResult.balances.assetsArray[0];
    const actualOperatorETH = await ethers.provider.getBalance(settleOperator.address);

    console.log(
      "ETH expec, actual, record, actualOperator",
      ethWithdrawResultExpec,
      actualAfterWithdrawETH,
      recordAfterWithdrawETH,
      actualOperatorETH
    );
    expect(ethWithdrawResultExpec).to.be.eq(actualAfterWithdrawETH);
    expect(ethWithdrawResultExpec).to.be.eq(recordAfterWithdrawETH);

    //   //weth
    //   const wethWithdrawResultExpec = balanceOfWETHCase.sub(withdrawWETHSize);
    //   const actualAfterWithdrawWETH = await weth.balanceOf(support.address);
    //   const recordAfterWithdrawWETH = withdrawForIssueResult.balances.assetsArray[1];
    //   const actualOperatorWETH = await weth.balanceOf(settleOperator.address);

    //   expect(wethWithdrawResultExpec).to.be.eq(actualAfterWithdrawWETH);
    //   expect(wethWithdrawResultExpec).to.be.eq(recordAfterWithdrawWETH);
    //   console.log(
    //     "WETH expec, actual, record, actualOperator",
    //     wethWithdrawResultExpec,
    //     actualAfterWithdrawWETH,
    //     recordAfterWithdrawWETH,
    //     actualOperatorWETH
    //   );

    //   //usdc
    //   const usdcWithdrawResultExpec = balanceOfUSDCCase.sub(withdrawUSDCSize);
    //   const actualAfterWithdrawUSDC = await usdc.balanceOf(support.address);
    //   const recordAfterWithdrawUSDC = withdrawForIssueResult.balances.assetsArray[2];
    //   const actualOperatorUSDC = await usdc.balanceOf(settleOperator.address);

    //   expect(usdcWithdrawResultExpec).to.be.eq(actualAfterWithdrawUSDC);
    //   expect(usdcWithdrawResultExpec).to.be.eq(recordAfterWithdrawUSDC);
    //   console.log(
    //     "USDC expec, actual, record, actualOperator",
    //     usdcWithdrawResultExpec,
    //     actualAfterWithdrawUSDC,
    //     recordAfterWithdrawUSDC,
    //     actualOperatorUSDC
    //   );

    //   //usdt
    //   const usdtWithdrawResultExpec = balanceOfUSDTCase.sub(withdrawUSDTSize);
    //   const actualAfterWithdrawUSDT = await usdt.balanceOf(support.address);
    //   const recordAfterWithdrawUSDT = withdrawForIssueResult.balances.assetsArray[3];
    //   const actualOperatorUSDT = await usdt.balanceOf(settleOperator.address);

    //   expect(usdtWithdrawResultExpec).to.be.eq(actualAfterWithdrawUSDT);
    //   expect(usdtWithdrawResultExpec).to.be.eq(recordAfterWithdrawUSDT);
    //   console.log(
    //     "USDT expec, actual, record, actualOperator",
    //     usdtWithdrawResultExpec,
    //     actualAfterWithdrawUSDT,
    //     recordAfterWithdrawUSDT,
    //     actualOperatorUSDT
    //   );

    //   /*
    //   console.log("Test paused function")
    //   await waitForTx(
    //     await support
    //       .connect(poolAdminSigner)
    //       .setPauseStatus(true)
    //   );

    //   //Support ETH
    //   await waitForTx(
    //     await support
    //       .connect(themeSupporter.signer)
    //       .caseByCaseSupport(themeIDActive, 0, 0, 1, 1, { value: depositSizeCase })
    //   );
    //   */
    // });

    // /*
    // it("Theme Status", async () => {
    //   const { users, bayc, support, weth, usdc, usdt } = testEnv;

    //   const poolAdminSigner = await getConfiguratorSigner();
    //   const operatorSigner = await getOperatorSigner();

    //   const depositor = users[0];
    //   const themeSupporter = users[2];

    //   const settleOperator = users[6];

    //   const themeIDActive = 1;
    //   const depositSize = 1;

    //   //init
    //   console.log("support while init");
    //   //Support ETH
    //   await waitForTx(
    //     await support.connect(themeSupporter.signer).longTermSupport(themeIDActive, 0, 0, { value: depositSize })
    //   );

    //   console.log("support while open")
    //   await waitForTx(await support.connect(poolAdminSigner).updateStatus([themeIDActive], true));

    //pause

    //batchWithdrawETH
    //active another theme
    await waitForTx(await support.connect(poolAdminSigner).updateStatus([themeIDActiveSec], true));

    //updateThemeIssueSchedule
    console.log("updateThemeIssueSchedule");
    await waitForTx(
      await support
        .connect(poolAdminSigner)
        .updateThemeIssueSchedule(themeIDActiveSec, 1, baseStartTime, issueDurationTime)
    );

    //Support ETH
    await waitForTx(
      await support
        .connect(themeSupporter.signer)
        .caseByCaseSupport(themeIDActiveSec, 0, 0, 1, 1, { value: depositSizeCase })
    );

    const batchWithdrawSize = parseEther("0.8");

    await waitForTx(
      await support
        .connect(operatorSigner)
        .batchWithdrawETH([themeIDActive, themeIDActiveSec], [1, 1], settleOperator.address, [
          batchWithdrawSize,
          batchWithdrawSize,
        ])
    );

    const batchFirstExpec = ethWithdrawResultExpec.sub(batchWithdrawSize);
    const batchSecExpec = depositSizeCase.sub(batchWithdrawSize);

    const batchFirstResult = await support.getThemeSupport(themeIDActive);
    const batchSecResult = await support.getThemeSupport(themeIDActiveSec);
    const actualAfterBatchWithdraw = await ethers.provider.getBalance(support.address);
    const actualOpETHAfterBatchWithdraw = await ethers.provider.getBalance(settleOperator.address);

    console.log("batchFirstResult ETH", batchFirstResult.balances.assetsArray[0]);
    console.log("batchSecResult ETH", batchSecResult.balances.assetsArray[0]);
    console.log("actualOpETHAfterBatchWithdraw", actualOpETHAfterBatchWithdraw);
    console.log("actualAfterBatchWithdraw", actualAfterBatchWithdraw);

    expect(batchFirstResult.balances.assetsArray[0]).to.be.eq(batchFirstExpec);
    expect(batchSecResult.balances.assetsArray[0]).to.be.eq(batchSecExpec);
    expect(actualOpETHAfterBatchWithdraw).to.be.eq(actualOperatorETH.add(batchWithdrawSize.add(batchWithdrawSize)));
    expect(actualAfterBatchWithdraw).to.be.eq(
      actualAfterWithdrawETH.add(depositSizeCase).sub(batchWithdrawSize.add(batchWithdrawSize))
    );

    const rawWithdrawSize = parseEther("0.9");
    await waitForTx(
      await support
        .connect(poolAdminSigner)
        .rawWithdraw([rawWithdrawSize], settleOperator.address, "RawWithdraw 4 June No1 Theme 1,3 Issue 1,1 ")
    );

    const rawFirstExpec = ethWithdrawResultExpec.sub(rawWithdrawSize);
    const rawSecExpec = depositSizeCase.sub(rawWithdrawSize);

    const rawFirstResult = await support.getThemeSupport(themeIDActive);
    const rawSecResult = await support.getThemeSupport(themeIDActiveSec);
    const actualAfterRawWithdraw = await ethers.provider.getBalance(support.address);
    const actualOpETHAfterRawWithdraw = await ethers.provider.getBalance(settleOperator.address);

    console.log("rawFirstResult ETH", rawFirstResult.balances.assetsArray[0]);
    console.log("rawSecResult ETH", rawSecResult.balances.assetsArray[0]);
    console.log("actualOpETHAfterRawWithdraw", actualOpETHAfterRawWithdraw);
    console.log("actualAfterRawWithdraw", actualAfterRawWithdraw);

    // expect(rawFirstResult.balances.assetsArray[0]).to.be.eq(rawFirstExpec);
    // expect(rawSecResult.balances.assetsArray[0]).to.be.eq(rawSecExpec);
    expect(actualOpETHAfterRawWithdraw).to.be.eq(actualOpETHAfterBatchWithdraw.add(rawWithdrawSize));
    expect(actualAfterRawWithdraw).to.be.eq(actualAfterBatchWithdraw.sub(rawWithdrawSize));
  });
  //*/
});
