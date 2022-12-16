import { ethers, waffle} from "hardhat";
import { createRandomAddress } from "../helpers/misc-utils";
import { TestEnv, makeSuite } from "./helpers/make-suite";
import {
  mintERC20,
  mintERC721,
  approveERC20,
  approveERC721,
  setApprovalForAll,
  deposit,
  borrow,
  withdraw,
  repay,
  delegateBorrowAllowance,
} from "./helpers/actions";

import { configuration as actionsConfiguration } from "./helpers/actions";
import { configuration as calculationsConfiguration } from "./helpers/utils/calculations";
import { convertToCurrencyDecimals } from "../helpers/contracts-helpers";
import BigNumber from "bignumber.js";
import { BigNumber as BN } from "ethers";
import { getReservesConfigByPool } from "../helpers/configuration";
import { 
  BendPools, 
  eContractid, 
  iBendPoolAssets, 
  IReserveParams, 
  ProtocolLoanState, 
  TokenContractId, 
} from "../helpers/types";
import { MintableERC20 } from "../types/MintableERC20";
import { string } from "hardhat/internal/core/params/argumentTypes";
import { waitForTx } from "../helpers/misc-utils";

import { getNftAddressFromSymbol } from "./helpers/utils/helpers"
import { getPoolAdminSigner, getMintableERC721, getStakeLogic, getStaking, getSupport, getAllMockedTokens } from "../helpers/contracts-getters"

import { parseEther } from "ethers/lib/utils";
import { MAX_UINT_AMOUNT } from "../helpers/constants";
import { Console } from "console";
import { Address } from "ethereumjs-util";

const { expect } = require("chai");

makeSuite("Support: test long-term support", (testEnv: TestEnv) => {
  before("Initializing configuration", async () => {
    // Sets BigNumber for this suite, instead of globally
    BigNumber.config({
      DECIMAL_PLACES: 0,
      ROUNDING_MODE: BigNumber.ROUND_DOWN,
    });

    actionsConfiguration.skipIntegrityCheck = false; //set this to true to execute solidity-coverage

    /*
    calculationsConfiguration.reservesParams = <iBendPoolAssets<IReserveParams>>(
      getReservesConfigByPool(BendPools.proto)
    );
    */
  });
  after("Reset", () => {
    // Reset BigNumber
    BigNumber.config({
      DECIMAL_PLACES: 20,
      ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
    });
  });

  it("Support NFT collection", async () => {
    const { users, bayc, support, weth, usdc, usdt } = testEnv;

    const poolAdminSigner = await getPoolAdminSigner();
    const depositor = users[0];
    const collectionSupporter = users[2];

    const settleOperator = users[6];

    /*
    // WETH
    await mintERC20(testEnv, depositor, "WETH", "10");
    await approveERC20(testEnv, depositor, "WETH");
    await deposit(testEnv, depositor, "", "WETH", "10", depositor.address, "success", "");
    */

    const userBalanceBeforeSupport = await ethers.provider.getBalance(collectionSupporter.signer.getAddress());
    console.log("supporter's bal", userBalanceBeforeSupport);
    console.log("supporter.address", collectionSupporter.address);
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
        await support
          .connect(poolAdminSigner)
          .setAssetsAddr(
            [zeroAddr, mockedAddrWETH, mockedAddrUSDC, mockedAddrUSDT]
          )
      );


    //-- check asset addr
    const assetAddr = await support.getAssetsAddr();
    expect(assetAddr[0], "ETH is default as zero").to.be.eq(zeroAddr);
    expect(assetAddr[1], "WETH addr is set as expected").to.be.eq(mockedAddrWETH);
    expect(assetAddr[2], "Second addr is set as expected").to.be.eq(mockedAddrUSDC);
    expect(assetAddr[3], "Third addr is set as expected").to.be.eq(mockedAddrUSDT);


    //-- Mint and approve token for test acount
    await weth.connect(depositor.signer).mint(await convertToCurrencyDecimals(weth.address, "100"));
    await weth.connect(depositor.signer).transfer(collectionSupporter.address, await convertToCurrencyDecimals(weth.address, "10"))
    await weth.connect(collectionSupporter.signer).approve(support.address, await convertToCurrencyDecimals(weth.address, "10"));

    await usdc.connect(depositor.signer).mint(await convertToCurrencyDecimals(usdc.address, "100"));
    await usdc.connect(depositor.signer).transfer(collectionSupporter.address, await convertToCurrencyDecimals(usdc.address, "10"))
    await usdc.connect(collectionSupporter.signer).approve(support.address, await convertToCurrencyDecimals(usdc.address, "10"));
    console.log("usdc allowance: ", await usdc.allowance(collectionSupporter.address, support.address));

    await usdt.connect(depositor.signer).mint(await convertToCurrencyDecimals(usdt.address, "100"));
    await usdt.connect(depositor.signer).transfer(collectionSupporter.address, await convertToCurrencyDecimals(usdt.address, "10"))
    await usdt.connect(collectionSupporter.signer).approve(support.address, await convertToCurrencyDecimals(usdt.address, "10"));
    console.log("usdt allowance: ", await usdt.allowance(collectionSupporter.address, support.address));

    
    //-- Mock two addresses, active the first one
    const mockedAddressActive = createRandomAddress();
    const mockedAddressNotActive = createRandomAddress();
    expect(mockedAddressActive, "Two mocked addr is different").to.not.be.eq(mockedAddressNotActive);
    
    //Enable the mockedAddressActive
    console.log("Enable the mockedAddressActive");
    await waitForTx(
        await support
          .connect(poolAdminSigner)
          .updateStatus(
            [mockedAddressActive],
            true
          )
      );
    
    const SupportActive = await support.getCollectionSupport(mockedAddressActive);
    const SupportNotActive = await support.getCollectionSupport(mockedAddressNotActive);
    expect(SupportActive.supporting, "SupportActive Enabled").to.be.eq(true);
    expect(SupportNotActive.supporting, "SupportNotActive not Enabled").to.be.eq(false);
    //console.log("collectionSupportActive", SupportActive.supporting);
    //console.log("collectionSupportNotActive", SupportNotActive.supporting);
    
    
    //-- support the active collection
    const depositSize = parseEther("1.05");
    const depositUSDCSize = await convertToCurrencyDecimals(usdc.address, "2.05")
    const depositUSDTSize = await convertToCurrencyDecimals(usdt.address, "3.05")
    const depositWETHSize = await convertToCurrencyDecimals(weth.address, "4.05")

    console.log("support the active one");
    //Support ETH
    await waitForTx(
      await support
        .connect(collectionSupporter.signer)
        .longTermSupport(
            mockedAddressActive,
            0,
            0,
            { value: depositSize }
        )
    );

    const supportWithETH = await support.getCollectionSupport(mockedAddressActive);
    console.log("ETH:", supportWithETH.balances.assetsArray[0]);
    console.log("WETH:", supportWithETH.balances.assetsArray[1]);
    console.log("USDC:", supportWithETH.balances.assetsArray[2]);
    console.log("USDT:", supportWithETH.balances.assetsArray[3]);

    console.log("183");
    
    expect(supportWithETH.balances.assetsArray[0]).to.be.eq(depositSize);


    //Support WETH
    console.log("depositWETHSize: ", depositWETHSize);
    await waitForTx(
      await support
        .connect(collectionSupporter.signer)
        .longTermSupport(
            mockedAddressActive,
            1,
            depositWETHSize
        )
    );

    const supportWithWETH = await support.getCollectionSupport(mockedAddressActive);
    console.log("ETH:", supportWithWETH.balances.assetsArray[0]);
    console.log("WETH:", supportWithWETH.balances.assetsArray[1]);
    console.log("USDC:", supportWithWETH.balances.assetsArray[2]);
    console.log("USDT:", supportWithWETH.balances.assetsArray[3]);
    
    expect(supportWithWETH.balances.assetsArray[1]).to.be.eq(depositWETHSize);
    const balanceOfWETH = await weth.balanceOf(support.address);
    expect(balanceOfWETH).to.be.eq(depositWETHSize);
 
    //Support USDC
    await waitForTx(
      await support
        .connect(collectionSupporter.signer)
        .longTermSupport(
            mockedAddressActive,
            2,
            depositUSDCSize
        )
    );

    const supportWithUSDC = await support.getCollectionSupport(mockedAddressActive);
    console.log("ETH:", supportWithUSDC.balances.assetsArray[0]);
    console.log("WETH:", supportWithUSDC.balances.assetsArray[1]);
    console.log("USDC:", supportWithUSDC.balances.assetsArray[2]);
    console.log("USDT:", supportWithUSDC.balances.assetsArray[3]);
    
    expect(supportWithUSDC.balances.assetsArray[2]).to.be.eq(depositUSDCSize);
    const balanceOfUSDC = await usdc.balanceOf(support.address);
    expect(balanceOfUSDC).to.be.eq(depositUSDCSize);

    //Support USDT
    await waitForTx(
      await support
        .connect(collectionSupporter.signer)
        .longTermSupport(
            mockedAddressActive,
            3,
            depositUSDTSize
        )
    );

    const supportWithUSDT = await support.getCollectionSupport(mockedAddressActive);
    console.log("ETH:", supportWithUSDT.balances.assetsArray[0]);
    console.log("WETH:", supportWithUSDT.balances.assetsArray[1]);
    console.log("USDC:", supportWithUSDT.balances.assetsArray[2]);
    console.log("USDT:", supportWithUSDT.balances.assetsArray[3]);
    
    expect(supportWithUSDT.balances.assetsArray[3]).to.be.eq(depositUSDTSize);
    const balanceOfUSDT = await usdt.balanceOf(support.address);
    expect(balanceOfUSDT).to.be.eq(depositUSDTSize);

    /*
   
    //TODO - support the not active one
    //support the active one
    console.log("support the not active one");
    await waitForTx(
      await support
        .connect(supporter.signer)
        .longTermSupport(
            mockedAddressNotActive,
            0,
            0
        )
    );

    */

  
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
    
    //Get and print the issue schedule
    const collectionsIssueSchedule = await support.getCollectionsIssueSchedule([mockedAddressActive]);
    console.log(collectionsIssueSchedule);


    //-- case by case support
    const depositSizeCase = parseEther("1.05");
    const depositUSDCCase = await convertToCurrencyDecimals(usdc.address, "2.05")
    const depositUSDTCase = await convertToCurrencyDecimals(usdt.address, "3.05")
    const depositWETHCase = await convertToCurrencyDecimals(weth.address, "4.05")

    console.log("support the active one");
    //Support ETH
    await waitForTx(
      await support
        .connect(collectionSupporter.signer)
        .caseByCaseSupport(
            mockedAddressActive,
            0,
            0,
            1,
            1,
            { value: depositSizeCase }
        )
    );
    const supportWithETHCase = await support.getCollectionSupport(mockedAddressActive);
    console.log("ETH:", supportWithETHCase.balances.assetsArray[0]);
    console.log("WETH:", supportWithETHCase.balances.assetsArray[1]);
    console.log("USDC:", supportWithETHCase.balances.assetsArray[2]);
    console.log("USDT:", supportWithETHCase.balances.assetsArray[3]);

    expect(supportWithETHCase.balances.assetsArray[0]).to.be.eq(depositSize.add(depositSizeCase));
    const balanceOfETHCase = await ethers.provider.getBalance(support.address);
    expect(balanceOfETHCase).to.be.eq(depositSize.add(depositSizeCase));
    
    //Support WETH
    console.log("depositWETHSize: ", depositWETHSize);
    await waitForTx(
      await support
        .connect(collectionSupporter.signer)
        .caseByCaseSupport(
            mockedAddressActive,
            1,
            depositWETHCase,
            1,
            2
        )
    );

    const supportWithWETHCase = await support.getCollectionSupport(mockedAddressActive);
    console.log("ETH:", supportWithWETHCase.balances.assetsArray[0]);
    console.log("WETH:", supportWithWETHCase.balances.assetsArray[1]);
    console.log("USDC:", supportWithWETHCase.balances.assetsArray[2]);
    console.log("USDT:", supportWithWETHCase.balances.assetsArray[3]);
    
    expect(supportWithWETHCase.balances.assetsArray[1]).to.be.eq(depositWETHSize.add(depositWETHCase));
    const balanceOfWETHCase = await weth.balanceOf(support.address);
    expect(balanceOfWETHCase).to.be.eq(depositWETHSize.add(depositWETHCase));
 
    //Support USDC
    await waitForTx(
      await support
        .connect(collectionSupporter.signer)
        .caseByCaseSupport(
            mockedAddressActive,
            2,
            depositUSDCCase,
            1,
            3
        )
    );

    const supportWithUSDCCase = await support.getCollectionSupport(mockedAddressActive);
    console.log("ETH:", supportWithUSDCCase.balances.assetsArray[0]);
    console.log("WETH:", supportWithUSDCCase.balances.assetsArray[1]);
    console.log("USDC:", supportWithUSDCCase.balances.assetsArray[2]);
    console.log("USDT:", supportWithUSDCCase.balances.assetsArray[3]);
    
    expect(supportWithUSDCCase.balances.assetsArray[2]).to.be.eq(depositUSDCSize.add(depositUSDCCase));
    const balanceOfUSDCCase = await usdc.balanceOf(support.address);
    expect(balanceOfUSDCCase).to.be.eq(depositUSDCSize.add(depositUSDCCase));

    //Support USDT
    await waitForTx(
      await support
        .connect(collectionSupporter.signer)
        .caseByCaseSupport(
            mockedAddressActive,
            3,
            depositUSDTCase,
            1,
            4
        )
    );

    const supportWithUSDTCase = await support.getCollectionSupport(mockedAddressActive);
    console.log("ETH:", supportWithUSDTCase.balances.assetsArray[0]);
    console.log("WETH:", supportWithUSDTCase.balances.assetsArray[1]);
    console.log("USDC:", supportWithUSDTCase.balances.assetsArray[2]);
    console.log("USDT:", supportWithUSDTCase.balances.assetsArray[3]);
    
    expect(supportWithUSDTCase.balances.assetsArray[3]).to.be.eq(depositUSDTSize.add(depositUSDTCase));
    const balanceOfUSDTCase = await usdt.balanceOf(support.address);
    expect(balanceOfUSDTCase).to.be.eq(depositUSDTSize.add(depositUSDTCase));



    //-- get slot info for checking
    const collectionIssueData = await support.getCollectionIssuesData(mockedAddressActive, 1, 1);
    console.log("issue inf ", 
    collectionIssueData[0].slotsView[0],
    collectionIssueData[0].slotsView[1],
    collectionIssueData[0].slotsView[2],
    collectionIssueData[0].slotsView[3],
    collectionIssueData[0].slotsView[4]
    );

    
    //-- withdrawForOneIssue
    // settleOperator
    const withdrawSize = parseEther("1.2");
    const withdrawWETHSize = await convertToCurrencyDecimals(weth.address, "1.3");
    const withdrawUSDCSize = await convertToCurrencyDecimals(usdc.address, "1.4");
    const withdrawUSDTSize = await convertToCurrencyDecimals(usdt.address, "1.5");

    await waitForTx(
      await support
        .connect(poolAdminSigner)
        .withdrawForOneIssue(
          mockedAddressActive,
          1,
          settleOperator.address,
          [withdrawSize, withdrawWETHSize, withdrawUSDCSize, withdrawUSDTSize]
        )
    );

    const withdrawForIssueResult = await support.getCollectionSupport(mockedAddressActive);
    // check balance
    // expect(supportWithETHCase.balances.assetsArray[0]).to.be.eq(depositSize.add(depositSizeCase));
    //eth
    const ethWithdrawResultExpec = balanceOfETHCase.sub(withdrawSize);
    const actualAfterWithdrawETH = await ethers.provider.getBalance(support.address);
    const recordAfterWithdrawETH = withdrawForIssueResult.balances.assetsArray[0];
    const actualOperatorETH = await ethers.provider.getBalance(settleOperator.address);

    expect(ethWithdrawResultExpec).to.be.eq(actualAfterWithdrawETH);
    expect(ethWithdrawResultExpec).to.be.eq(recordAfterWithdrawETH);
    console.log("ETH expec, actual, record, actualOperator", 
        ethWithdrawResultExpec, actualAfterWithdrawETH, recordAfterWithdrawETH, actualOperatorETH)

    //weth
    const wethWithdrawResultExpec = balanceOfWETHCase.sub(withdrawWETHSize);
    const actualAfterWithdrawWETH = await weth.balanceOf(support.address);
    const recordAfterWithdrawWETH = withdrawForIssueResult.balances.assetsArray[1];
    const actualOperatorWETH = await weth.balanceOf(settleOperator.address);

    expect(wethWithdrawResultExpec).to.be.eq(actualAfterWithdrawWETH);
    expect(wethWithdrawResultExpec).to.be.eq(recordAfterWithdrawWETH);
    console.log("WETH expec, actual, record, actualOperator", 
      wethWithdrawResultExpec, actualAfterWithdrawWETH, recordAfterWithdrawWETH, actualOperatorWETH)

    //usdc
    const usdcWithdrawResultExpec = balanceOfUSDCCase.sub(withdrawUSDCSize);
    const actualAfterWithdrawUSDC = await usdc.balanceOf(support.address);
    const recordAfterWithdrawUSDC = withdrawForIssueResult.balances.assetsArray[2];
    const actualOperatorUSDC = await usdc.balanceOf(settleOperator.address);

    expect(usdcWithdrawResultExpec).to.be.eq(actualAfterWithdrawUSDC);
    expect(usdcWithdrawResultExpec).to.be.eq(recordAfterWithdrawUSDC);
    console.log("USDC expec, actual, record, actualOperator", 
      usdcWithdrawResultExpec, actualAfterWithdrawUSDC, recordAfterWithdrawUSDC, actualOperatorUSDC)
    
    //usdt
    const usdtWithdrawResultExpec = balanceOfUSDTCase.sub(withdrawUSDTSize);
    const actualAfterWithdrawUSDT = await usdt.balanceOf(support.address);
    const recordAfterWithdrawUSDT = withdrawForIssueResult.balances.assetsArray[3];
    const actualOperatorUSDT = await usdt.balanceOf(settleOperator.address);

    expect(usdtWithdrawResultExpec).to.be.eq(actualAfterWithdrawUSDT);
    expect(usdtWithdrawResultExpec).to.be.eq(recordAfterWithdrawUSDT);
    console.log("USDT expec, actual, record, actualOperator", 
      usdtWithdrawResultExpec, actualAfterWithdrawUSDT, recordAfterWithdrawUSDT, actualOperatorUSDT)
  });
});
