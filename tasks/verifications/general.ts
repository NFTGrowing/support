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


const collection_1 = "0x1bcCDA21c15dd7e20F4b89446936AadFE39e64A0";
const collection_2 = "0x7D62d11eC5E625566Ff501AAd1304878C6AB3b64";
const collection_3 = "0xbF15a45245a74Fc7e4Cc81b106CD369e81a6e9eD";

const enabled_collection = collection_2;

task("verify:mintApproveAsset", "mint and approve token for support")
  .setAction(async ({ }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = <eNetwork>localBRE.network.name;
    
    const addressesProvider = await getStakingAddressesProvider();
    // const admin = await addressesProvider.getPoolAdmin();
    const poolAdminSigner = await getPoolAdminSigner();
    const simulateSupporter = await getSupporter();
    

    //   testEnv.support = await getSupport(); 
    const support = await getSupport();
    
    const allTokens = await getAllMockedTokens();
    const weth = allTokens[TokenContractId.WETH];
    const usdc = allTokens[TokenContractId.USDC];
    const usdt = allTokens[TokenContractId.USDT];

    const assetAddr = await support.getAssetsAddr();
    console.log("assetAddr",assetAddr);
    // expect(assetAddr[0], "ETH is default as zero").to.be.eq(zeroAddr);
    // expect(assetAddr[1], "WETH addr is set as expected").to.be.eq(mockedAddrWETH);
    // expect(assetAddr[2], "Second addr is set as expected").to.be.eq(mockedAddrUSDC);
    // expect(assetAddr[3], "Third addr is set as expected").to.be.eq(mockedAddrUSDT);

    


    //-- Mint and approve token for test acount
    const supporterAddr = await simulateSupporter.getAddress();
    console.log( "supporterAddr", supporterAddr );
    
    //comment because real weth has no mint function
    // await weth.connect(poolAdminSigner).mint(await convertToCurrencyDecimals(weth.address, "100"));
    // await weth.connect(poolAdminSigner).transfer(supporterAddr, await convertToCurrencyDecimals(weth.address, "10"))
    // await weth.connect(simulateSupporter).approve(support.address, await convertToCurrencyDecimals(weth.address, "10"));

    await usdc.connect(poolAdminSigner).mint(await convertToCurrencyDecimals(usdc.address, "10000"));
    //Delay for some time 
    await new Promise(f => setTimeout(f, 15000));
    await usdc.connect(poolAdminSigner).transfer(supporterAddr, await convertToCurrencyDecimals(usdc.address, "1000"))
    await usdc.connect(simulateSupporter).approve(support.address, await convertToCurrencyDecimals(usdc.address, "1000"));

    await usdt.connect(poolAdminSigner).mint(await convertToCurrencyDecimals(usdt.address, "10000"));
    // Delay for some time 
    await new Promise(f => setTimeout(f, 15000));
    await usdt.connect(poolAdminSigner).transfer(supporterAddr, await convertToCurrencyDecimals(usdt.address, "1000"))
    await usdt.connect(simulateSupporter).approve(support.address, await convertToCurrencyDecimals(usdt.address, "1000"));


  });

task("verify:listNewCollection", "Initialize support.")
  .setAction(async ({ }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = <eNetwork>localBRE.network.name;
    
    const addressesProvider = await getStakingAddressesProvider();
    // const admin = await addressesProvider.getPoolAdmin();
    const poolAdminSigner = await getPoolAdminSigner();
    const simulateSupporter = await getSupporter();
    
    //   testEnv.support = await getSupport(); 
    const support = await getSupport();

    //Enable the mockedAddressActive
    const mockedAddressActive = createRandomAddress();
    console.log("the mocked addr is:", mockedAddressActive)
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

task("verify:longTermSupport", "longTermSupport")
  .setAction(async ({ }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = <eNetwork>localBRE.network.name;
    
    const addressesProvider = await getStakingAddressesProvider();
    // const admin = await addressesProvider.getPoolAdmin();
    const poolAdminSigner = await getPoolAdminSigner();
    const simulateSupporter = await getSupporter();
    

    //   testEnv.support = await getSupport(); 
    const support = await getSupport();
    
    const allTokens = await getAllMockedTokens();
    const weth = allTokens[TokenContractId.WETH];
    const usdc = allTokens[TokenContractId.USDC];
    const usdt = allTokens[TokenContractId.USDT];

    //-- support the active collection
    const depositSize = parseEther("0.015");
    const depositUSDCSize = await convertToCurrencyDecimals(usdc.address, "2.05")
    const depositUSDTSize = await convertToCurrencyDecimals(usdt.address, "3.05")
    const depositWETHSize = await convertToCurrencyDecimals(weth.address, "4.05")

    console.log("support the active one");

    const beforeSupport = await support.getCollectionSupport(enabled_collection);
    console.log("ETH:", beforeSupport.balances.assetsArray[0]);
    console.log("WETH:", beforeSupport.balances.assetsArray[1]);
    console.log("USDC:", beforeSupport.balances.assetsArray[2]);
    console.log("USDT:", beforeSupport.balances.assetsArray[3]);

    const balanceOfWETH = await weth.balanceOf(support.address);
    const balanceOfUSDC = await usdc.balanceOf(support.address);
    const balanceOfUSDT = await usdt.balanceOf(support.address);

    //Support ETH
    await waitForTx(
        await support
        .connect(simulateSupporter)
        .longTermSupport(
            enabled_collection,
            0,
            0,
            { value: depositSize }
        )
    );

    //Support WETH
    // console.log("depositWETHSize: ", depositWETHSize);
    // await waitForTx(
    //     await support
    //     .connect(simulateSupporter)
    //     .longTermSupport(
    //         enabled_collection,
    //         1,
    //         depositWETHSize
    //     )
    // );
    
    //Support USDC
    await waitForTx(
        await support
        .connect(simulateSupporter)
        .longTermSupport(
            enabled_collection,
            2,
            depositUSDCSize
        )
    );

    //Support USDT
    await waitForTx(
        await support
        .connect(simulateSupporter)
        .longTermSupport(
            enabled_collection,
            3,
            depositUSDTSize
        )
    );

    const afterLongTermSupport = await support.getCollectionSupport(enabled_collection);
    console.log("ETH:", afterLongTermSupport.balances.assetsArray[0]);
    console.log("WETH:", afterLongTermSupport.balances.assetsArray[1]);
    console.log("USDC:", afterLongTermSupport.balances.assetsArray[2]);
    console.log("USDT:", afterLongTermSupport.balances.assetsArray[3]);
    
  });



task("verify:caseByCaseSupport", "caseByCaseSupport")
  .setAction(async ({ }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = <eNetwork>localBRE.network.name;
    
    const addressesProvider = await getStakingAddressesProvider();
    // const admin = await addressesProvider.getPoolAdmin();
    const poolAdminSigner = await getPoolAdminSigner();
    const simulateSupporter = await getSupporter();
    

    //   testEnv.support = await getSupport(); 
    const support = await getSupport();
    
    const allTokens = await getAllMockedTokens();
    const weth = allTokens[TokenContractId.WETH];
    const usdc = allTokens[TokenContractId.USDC];
    const usdt = allTokens[TokenContractId.USDT];

    console.log("support the active one");

    const beforeSupport = await support.getCollectionSupport(enabled_collection);
    console.log("ETH:", beforeSupport.balances.assetsArray[0]);
    console.log("WETH:", beforeSupport.balances.assetsArray[1]);
    console.log("USDC:", beforeSupport.balances.assetsArray[2]);
    console.log("USDT:", beforeSupport.balances.assetsArray[3]);

    // const balanceOfETHCase = await ethers.provider.getBalance(support.address);
    const balanceOfWETH = await weth.balanceOf(support.address);
    const balanceOfUSDC = await usdc.balanceOf(support.address);
    const balanceOfUSDT = await usdt.balanceOf(support.address);

    //-- case by case support
    const depositSizeCase = parseEther("0.025");
    const depositWETHCase = await convertToCurrencyDecimals(weth.address, "7.05")
    const depositUSDCCase = await convertToCurrencyDecimals(usdc.address, "5.05")
    const depositUSDTCase = await convertToCurrencyDecimals(usdt.address, "6.05")


    const supportingIssueNo = 3;
    console.log("support the active one");
    //Support ETH
    await waitForTx(
        await support
        .connect(simulateSupporter)
        .caseByCaseSupport(
            enabled_collection,
            0,
            0,
            supportingIssueNo,
            1,
            { value: depositSizeCase }
        )
    );
    // const supportWithETHCase = await support.getCollectionSupport(enabled_collection);
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
    //         enabled_collection,
    //         1,
    //         depositWETHCase,
    //         1,
    //         2
    //     )
    // );
    
    //Support USDC
    await waitForTx(
        await support
        .connect(simulateSupporter)
        .caseByCaseSupport(
            enabled_collection,
            2,
            depositUSDCCase,
            supportingIssueNo,
            3
        )
    );

    //Support USDT
    await waitForTx(
        await support
        .connect(simulateSupporter)
        .caseByCaseSupport(
            enabled_collection,
            3,
            depositUSDTCase,
            supportingIssueNo,
            4
        )
    );


    //-- get slot info for checking
    const collectionIssueData = await support.getCollectionIssuesData(enabled_collection, supportingIssueNo, supportingIssueNo);
    console.log("issue inf ", 
    collectionIssueData[0].slotsView[0],
    collectionIssueData[0].slotsView[1],
    collectionIssueData[0].slotsView[2],
    collectionIssueData[0].slotsView[3],
    collectionIssueData[0].slotsView[4]
    );

    const afterLongTermSupport = await support.getCollectionSupport(enabled_collection);
    console.log("After ETH:", afterLongTermSupport.balances.assetsArray[0]);
    console.log("After WETH:", afterLongTermSupport.balances.assetsArray[1]);
    console.log("After USDC:", afterLongTermSupport.balances.assetsArray[2]);
    console.log("After USDT:", afterLongTermSupport.balances.assetsArray[3]);
  });