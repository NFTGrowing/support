import { ethers, waffle } from "hardhat";
// import "@nomiclabs/hardhat-web3";
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

import { getNftAddressFromSymbol } from "./helpers/utils/helpers";
import {
  getPoolAdminSigner,
  getDeploySigner,
  getMintableERC721,
  getStakeLogic,
  getStaking,
  getSupport,
  getAllMockedTokens,
  getCopyrightRegistry,
  getCopyrightFixedSupply,
} from "../helpers/contracts-getters";

import { arrayify, parseEther } from "ethers/lib/utils";
import { MAX_UINT_AMOUNT } from "../helpers/constants";
import { Console } from "console";
import { Address, keccak256, keccakFromHexString } from "ethereumjs-util";
import { hrtime } from "process";
import { CopyrightFixedSupply } from "../types";

const { expect } = require("chai");

// https://hardhat.org/hardhat-runner/docs/advanced/hardhat-runtime-environment
const hre = require("hardhat");

makeSuite("CopyrightRegistry: test copyright token registry and claim ", (testEnv: TestEnv) => {
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

  it("test copyright token registry and claim ", async () => {
    const { users, bayc, weth, usdc, usdt } = testEnv;

    const poolAdminSigner = await getPoolAdminSigner();
    const depositor = await getDeploySigner();

    const serviceSignAddr = users[2];
    const regitsterAccount = users[6];
    const claimAccount = users[7];

    const copyrightRegistry = await getCopyrightRegistry();

    //setup serviceSignAddr to registry
    const ownerAddr = await copyrightRegistry.owner();
    console.log("ownerAddr", ownerAddr);
    console.log("depositor", depositor.getAddress());
    expect(ownerAddr, "currentServiceSignAddr check").to.be.equal(await depositor.getAddress());

    console.log("setup serviceSignAddr to registry", serviceSignAddr.address);
    await waitForTx(await copyrightRegistry.connect(depositor).setServiceSignAddr(serviceSignAddr.address));
    const currentServiceSignAddr = await copyrightRegistry._serviceSignAddr();
    console.log("current serviceSignAddr", currentServiceSignAddr);
    expect(currentServiceSignAddr, "currentServiceSignAddr check").to.be.equal(serviceSignAddr.address);
    // console.log(" serviceSignAddr", await copyrightRegistry._serviceSignAddr());

    //prepare signature and para
    const lv2ID = 1001;
    const id = 0;
    const symbol = "Token1 Symbol";
    const name_1 = "Token1";
    const totalSupply = 100000000;

    //Register Token
    console.log("encode RWT");
    // console.log("copyrightRegistry is", copyrightRegistry.address);

    console.log("paras: ", lv2ID, id, symbol, name_1, totalSupply);
    console.log("test invite");
    const testInviteReturn = await copyrightRegistry.testInvite();

    console.log("test invite result", testInviteReturn);

    // Approach 1
    const encodeRWT_result = await copyrightRegistry.encodeRWT(lv2ID, id, symbol, name_1, totalSupply);
    console.log("encode result: ", encodeRWT_result);
    // const encodeRWT_result_bytes = arrayify(encodeRWT_result);
    // console.log("encodeRWT_result_bytes", encodeRWT_result_bytes);
    const hashed_encodeRWT_result = keccakFromHexString(encodeRWT_result);
    console.log("hashed_encodeRWT_result", hashed_encodeRWT_result);

    // hre.web3.accounts.sign(encodeRWT_result, serviceSignAddr.signer.pri)
    // console.log("Sign msg");
    // const signature = await serviceSignAddr.signer.signMessage(encodeRWT_result_bytes);
    // console.log("signature: ", signature);

    // Approach 2
    const messageHash = ethers.utils.solidityKeccak256(
      ["uint256", "uint256", "string", "string", "uint256"],
      [lv2ID, id, symbol, name_1, totalSupply]
    );
    console.log("Message Hash: ", messageHash);
    const messageBytes = ethers.utils.arrayify(messageHash);
    console.log("messageBytes: ", messageBytes);
    const signature_new = await serviceSignAddr.signer.signMessage(messageBytes);
    console.log("signature_new: ", signature_new);

    console.log("registerWorkToken");
    const registeredAddr = await waitForTx(
      await copyrightRegistry
        .connect(regitsterAccount.signer)
        .registerWorkToken(signature_new, lv2ID, id, symbol, name_1, totalSupply)
    );

    console.log("Get work token ID");

    //Find Register Token
    const workTokenID = await copyrightRegistry.getWorkTokenID(lv2ID, id);
    console.log("lv2id, id, workTokenID, registeredAddr", lv2ID, id, workTokenID, registeredAddr);

    //prepare signature and para
    const lv2ID_2 = 0;
    const id_2 = 1;
    const symbol_2 = "Token2 Symbol";
    const name_2 = "Token2";
    const totalSupply_2 = 100000000;

    // Approach 2
    const messageHash_2 = ethers.utils.solidityKeccak256(
      ["uint256", "uint256", "string", "string", "uint256"],
      [lv2ID_2, id_2, symbol_2, name_2, totalSupply_2]
    );
    console.log("Message Hash 2: ", messageHash_2);
    const messageBytes_2 = ethers.utils.arrayify(messageHash_2);
    console.log("messageBytes 2: ", messageBytes_2);
    const signature_new_2 = await serviceSignAddr.signer.signMessage(messageBytes_2);
    console.log("signature_new_2: ", signature_new_2);
    console.log("registerWorkToken");

    const registeredAddr_2 = await waitForTx(
      await copyrightRegistry
        .connect(regitsterAccount.signer)
        .registerWorkToken(signature_new_2, lv2ID_2, id_2, symbol_2, name_2, totalSupply_2)
    );

    //Find Register Token
    const workTokenID_2 = await copyrightRegistry.getWorkTokenID(lv2ID_2, id_2);
    console.log("lv2id_2, id_2, workTokenID_2, registeredAddr_2", lv2ID_2, id_2, workTokenID_2, registeredAddr_2);

    // Claim Token
    const claimMsgHash_1 = ethers.utils.solidityKeccak256(
      ["uint256", "uint256[]", "address", "uint256[]", "address"],
      [lv2ID, [0, 1], workTokenID, [10000, 20000], claimAccount.address]
    );
    // console.log("claimMsgHash_1: ", claimMsgHash_1);
    const claimMessageBytes_1 = ethers.utils.arrayify(claimMsgHash_1);
    // console.log("messageBytes 2: ", claimMessageBytes_2)
    const claim_signature_1 = await serviceSignAddr.signer.signMessage(claimMessageBytes_1);
    console.log("claim_signature_1: ", claim_signature_1);
    console.log("claimWorkToken");
    const claimWorkTokenAddr = await waitForTx(
      await copyrightRegistry
        .connect(claimAccount.signer)
        .claimWorkToken(claim_signature_1, lv2ID, [0, 1], workTokenID, [10000, 20000], claimAccount.address)
    );
    const workToken = await getCopyrightFixedSupply(workTokenID);
    const claimWorkTokenBalance_1 = await workToken.balanceOf(claimAccount.address);
    console.log("claimWorkTokenBalance_1", claimWorkTokenBalance_1);
    expect(claimWorkTokenBalance_1, "Check work token 1 Balance").to.be.eq(30000);

    // work token 2 claim
    const claimMsgHash_2 = ethers.utils.solidityKeccak256(
      ["uint256", "uint256[]", "address", "uint256[]", "address"],
      [lv2ID_2, [id_2], workTokenID_2, [50000], claimAccount.address]
    );
    // console.log("claimMsgHash_1: ", claimMsgHash_1);
    const claimMessageBytes_2 = ethers.utils.arrayify(claimMsgHash_2);
    // console.log("messageBytes 2: ", claimMessageBytes_2)
    const claim_signature_2 = await serviceSignAddr.signer.signMessage(claimMessageBytes_2);
    console.log("signature_new_2: ", signature_new_2);
    console.log("claimWorkToken");
    const claimWorkTokenAddr_2 = await waitForTx(
      await copyrightRegistry
        .connect(claimAccount.signer)
        .claimWorkToken(claim_signature_2, lv2ID_2, [id_2], workTokenID_2, [50000], claimAccount.address)
    );
    const workToken_2 = await getCopyrightFixedSupply(workTokenID_2);
    const claimWorkTokenBalance_2 = await workToken_2.balanceOf(claimAccount.address);
    console.log("claimWorkTokenBalance_2", claimWorkTokenBalance_2);
    expect(claimWorkTokenBalance_2, "Check work token 1 Balance").to.be.eq(50000);
  });
});
