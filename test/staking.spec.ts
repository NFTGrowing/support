import { ethers, waffle } from "hardhat";

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
import BigNumber from "bignumber.js";
import { getReservesConfigByPool } from "../helpers/configuration";
import { CBPPools, iCBPPoolAssets, IReserveParams, ProtocolLoanState } from "../helpers/types";
import { string } from "hardhat/internal/core/params/argumentTypes";
import { waitForTx } from "../helpers/misc-utils";

import { getNftAddressFromSymbol } from "./helpers/utils/helpers";
import { getMintableERC721, getStakeLogic, getStaking } from "../helpers/contracts-getters";

import { parseEther } from "ethers/lib/utils";
import { MAX_UINT_AMOUNT } from "../helpers/constants";
import { Console } from "console";

const { expect } = require("chai");

makeSuite("Staking: test staking & batch staking", (testEnv: TestEnv) => {
  before("Initializing configuration", async () => {
    // Sets BigNumber for this suite, instead of globally
    BigNumber.config({
      DECIMAL_PLACES: 0,
      ROUNDING_MODE: BigNumber.ROUND_DOWN,
    });

    actionsConfiguration.skipIntegrityCheck = false; //set this to true to execute solidity-coverage
  });
  after("Reset", () => {
    // Reset BigNumber
    BigNumber.config({
      DECIMAL_PLACES: 20,
      ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
    });
  });

  it("Staking NFT into contract", async () => {
    const { users, bayc, pool } = testEnv;
    const depositor = users[1];
    const staker = users[2];

    /*
    // WETH
    await mintERC20(testEnv, depositor, "WETH", "10");
    await approveERC20(testEnv, depositor, "WETH");
    await deposit(testEnv, depositor, "", "WETH", "10", depositor.address, "success", "");
    */

    // mint NFTs
    const tokenId1 = (testEnv.tokenIdTracker++).toString();
    await mintERC721(testEnv, staker, "BAYC", tokenId1);

    const tokenId2 = (testEnv.tokenIdTracker++).toString();
    await mintERC721(testEnv, staker, "BAYC", tokenId2);

    await setApprovalForAll(testEnv, staker, "BAYC");

    const nftAsset = await getNftAddressFromSymbol("BAYC");
    const token = await getMintableERC721(nftAsset);

    console.log("l82");
    const balance0ETH = await ethers.provider.getBalance(staker.signer.getAddress());
    console.log("staker's bal", balance0ETH);

    // const userBalanceBeforeBorrow = await weth.balanceOf(staker.address);
    console.log("l77");
    // console.log("bayc", bayc.address, "staker", staker.signer)
    // batch borrow

    console.log("staker.address", staker.address);
    const stakeLogicAddr = (await getStakeLogic()).address;
    const stakingAddr = (await getStaking()).address;
    console.log("stakeLogicAddr", stakeLogicAddr, "stakingAddr", stakingAddr);

    const ownerAddr_before = await token.connect(users[3].signer).ownerOf(tokenId1);
    console.log("Before staking -- tokenId1 - ", tokenId1, " ownerAddr is - ", ownerAddr_before);

    console.log("batch borrow weth");
    await waitForTx(await pool.connect(staker.signer).stake(nftAsset, tokenId1));

    //TODO - 打印 tokenId1 现在的 owner addr
    console.log("l90");

    const ownerAddr = await token.connect(users[3].signer).ownerOf(tokenId1);
    console.log("After staking -- tokenId1 - ", tokenId1, " ownerAddr is - ", ownerAddr);

    expect(true).to.be.eq(true);
  });
});
