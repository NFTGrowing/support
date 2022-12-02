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

    //Setup the addr of the supported asset
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

    // get the WETH, USDT, USDC contract  
    // const allTokenAsset = getAllMockedTokens();
    // const contractUSDC = allTokenAsset[TokenContractId.USDC];
    // const contractUSDT = allTokenAsset[TokenContractId.USDT];

    // Mint and approve token for test acount
    // console.log("weth address: ", weth.address);
    // console.log("weth: ", weth );
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

    //check asset addr
    const assetAddr = await support.getAssetsAddr();
    expect(assetAddr[0], "ETH is default as zero").to.be.eq(zeroAddr);
    expect(assetAddr[1], "WETH addr is set as expected").to.be.eq(mockedAddrWETH);
    expect(assetAddr[2], "Second addr is set as expected").to.be.eq(mockedAddrUSDC);
    expect(assetAddr[3], "Third addr is set as expected").to.be.eq(mockedAddrUSDT);
    
    //TODO - Mock two addresses, active the first one
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
    
    
    //support the active one
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
    console.log("ETH:", supportWithETH.balance.etherAmount);
    console.log("USDC:", supportWithETH.balance.usdcAmount);
    console.log("USDT:", supportWithETH.balance.usdtAmount);
    console.log("WETH:", supportWithETH.balance.wethAmount);
    
    expect(supportWithETH.balance.etherAmount).to.be.eq(depositSize);


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
    console.log("ETH:", supportWithWETH.balance.etherAmount);
    console.log("USDC:", supportWithWETH.balance.usdcAmount);
    console.log("USDT:", supportWithWETH.balance.usdtAmount);
    console.log("WETH:", supportWithWETH.balance.wethAmount);
    
    expect(supportWithWETH.balance.wethAmount).to.be.eq(depositWETHSize);
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
    console.log("ETH:", supportWithUSDC.balance.etherAmount);
    console.log("USDC:", supportWithUSDC.balance.usdcAmount);
    console.log("USDT:", supportWithUSDC.balance.usdtAmount);
    console.log("WETH:", supportWithUSDC.balance.wethAmount);
    
    expect(supportWithUSDC.balance.usdcAmount).to.be.eq(depositUSDCSize);
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
    console.log("ETH:", supportWithUSDT.balance.etherAmount);
    console.log("USDC:", supportWithUSDT.balance.usdcAmount);
    console.log("USDT:", supportWithUSDT.balance.usdtAmount);
    console.log("WETH:", supportWithUSDT.balance.wethAmount);
    
    expect(supportWithUSDT.balance.usdtAmount).to.be.eq(depositUSDTSize);
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

  // console.log("l90");
  expect(true).to.be.eq(true);
  });
});
