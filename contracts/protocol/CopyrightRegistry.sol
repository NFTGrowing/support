// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

// Prettier ignore to prevent buidler flatter bug
// prettier-ignore
import {ICopyrightRegistry} from "../interfaces/ICopyrightRegistry.sol";
import {CBUpgradeableProxy} from "../libraries/proxy/CBUpgradeableProxy.sol";
import {Errors} from "../libraries/helpers/Errors.sol";
import {CopyrightFixedSupply} from "./CopyrightFixedSupply.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title CopyrightRegistry contract
 * @dev Registry of copyright token, including permissioned roles
 * - Acting also as factory of proxies and admin of those, so with right to change its implementations
 * - Owned by the CBP Governance
 * @author CBP
 **/
contract CopyrightRegistry is Ownable, ICopyrightRegistry {
  using ECDSA for bytes32;

  //TODO: add iterate code?

  address public _serviceSignAddr;

  struct Lv1Register {
    uint256 lv1ID;
    bool isActive;
    string symbol;
    string name;
    address lv1TokenID;
    mapping(address => uint256) claimedTokens;
  }

  struct Lv2Register {
    uint256 lv2ID;
    bool isActive;
    string symbol;
    string name;
    address lv2TokenID;
    //lv1ID => lv1Register
    mapping(uint256 => Lv1Register) lv1Registry;
  }

  // lv2ID => lv2 registry info
  mapping(uint256 => Lv2Register) _lv2Registry;

  constructor() {}

  /**
   * @dev Allows to set the addr which sign the register or claim msg
   * @param addr new _serviceSignAddr
   */
  function setServiceSignAddr(address addr) external onlyOwner {
    _serviceSignAddr = addr;
    //TODO: emit event
    emit SetServiceSignAddr(addr);
  }

  /**
   * @dev register copyright token for work. if existed, failed.
   * @param signature signature to the parameters by protocol service
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   * @param symbol Token's symbol
   * @param name Token's name
   * @param totalSupply totalSupply
   */
  function registerWorkToken(
    bytes memory signature,
    uint256 lv2ID,
    uint256 id,
    string memory symbol,
    string memory name,
    uint256 totalSupply
  ) external override returns (address) {
    require(
      signature.length != 0 && bytes(symbol).length != 0 && bytes(name).length != 0,
      Errors.VL_INVALID_STRING_PARA
    );
    // require(sigs.length == sigNumber, "signature num error");

    // bytes memory message = abi.encode(lv2ID, id, symbol, name, totalSupply);
    bytes memory message = encodeRWT(lv2ID, id, symbol, name, totalSupply);
    bytes32 hash = keccak256(message).toEthSignedMessageHash();
    address addr = hash.recover(signature);
    require(addr == _serviceSignAddr, Errors.C_REGISTRY_SIGNATURE_ERROR);

    if (lv2ID != 0) {
      require(_lv2Registry[lv2ID].lv2TokenID == address(0), Errors.C_REGISTRY_LV2_REGISTERED);
      //deploy ERC20
      CopyrightFixedSupply copyrightFixedSupply = new CopyrightFixedSupply(name, symbol, 18, totalSupply);

      _lv2Registry[lv2ID].isActive = true;
      _lv2Registry[lv2ID].symbol = symbol;
      _lv2Registry[lv2ID].name = name;
      _lv2Registry[lv2ID].lv2TokenID = address(copyrightFixedSupply);

      //Emit event
      emit WorkTokenDeploy(lv2ID, id, address(copyrightFixedSupply), symbol, name, msg.sender, totalSupply);
      return address(copyrightFixedSupply);
    } else {
      require(id != 0, Errors.C_REGISTRY_INVALID_ID);
      require(_lv2Registry[0].lv1Registry[id].lv1TokenID == address(0), Errors.C_REGISTRY_LV1_REGISTERED);

      //deploy ERC20
      CopyrightFixedSupply copyrightFixedSupply = new CopyrightFixedSupply(name, symbol, 18, totalSupply);

      Lv1Register storage lv1Register = _lv2Registry[0].lv1Registry[id];

      lv1Register.isActive = true;
      lv1Register.symbol = symbol;
      lv1Register.name = name;
      lv1Register.lv1TokenID = address(copyrightFixedSupply);

      //Emit event
      emit WorkTokenDeploy(lv2ID, id, address(copyrightFixedSupply), symbol, name, msg.sender, totalSupply);
      return address(copyrightFixedSupply);
    }
  }

  /**
   * @dev getWorkTokenID -
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   */
  function getWorkTokenID(uint256 lv2ID, uint256 id) public view returns (address) {
    if (lv2ID != 0) {
      return _lv2Registry[lv2ID].lv2TokenID;
    } else {
      return _lv2Registry[0].lv1Registry[id].lv1TokenID;
    }
  }

  /**
   * @dev claim multiple chapters Token in one work
   * @param signature signature to the parameters by protocol service
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param idArray chapter ID array
   * @param workTokenID ID of the work
   * @param amountArray Token amount array
   * @param beneficiary Allocate to this address
   */
  function claimWorkToken(
    bytes memory signature,
    uint256 lv2ID,
    uint256[] memory idArray,
    address workTokenID,
    uint256[] memory amountArray,
    address beneficiary
  ) external override {
    require(signature.length != 0, Errors.VL_INVALID_STRING_PARA);
    require(beneficiary != address(0), Errors.C_REGISTRY_INVALID_BENEFICIARY);
    require(msg.sender == beneficiary, Errors.C_REGISTRY_BENEFICIARY_NE_SENDER);

    bytes memory message = encodeCWT(lv2ID, idArray, workTokenID, amountArray, beneficiary);
    bytes32 hash = keccak256(message).toEthSignedMessageHash();
    address addr = hash.recover(signature);
    require(addr == _serviceSignAddr, Errors.C_REGISTRY_SIGNATURE_ERROR);

    if (lv2ID != 0) {
      require(idArray.length > 0 && amountArray.length == idArray.length, Errors.C_REGISTRY_LENGTH_ERROR);
      Lv2Register storage lv2Register = _lv2Registry[lv2ID];
      require(lv2Register.isActive, Errors.C_REGISTRY_NOT_ACTIVE_WORK);
      require(workTokenID == lv2Register.lv2TokenID, Errors.C_REGISTRY_WRONG_LV2_TOKENID);
      for (uint256 i = 0; i < idArray.length; i++) {
        Lv1Register storage lv1Register = lv2Register.lv1Registry[idArray[i]];
        //not avaiable for claiming more than once for one address
        require(0 == lv1Register.claimedTokens[beneficiary], Errors.C_REGISTRY_CLAIMED_ALREADY);
        require(0 != amountArray[i], Errors.C_REGISTRY_AMOUNT_ERROR);
        lv1Register.claimedTokens[beneficiary] = amountArray[i];
        //transfer token
        CopyrightFixedSupply(lv2Register.lv2TokenID).transfer(beneficiary, amountArray[i]);

        //Emit event
        emit WorkTokenClaim(lv2ID, idArray[i], lv2Register.lv2TokenID, amountArray[i], beneficiary);
      }
    } else {
      require(idArray.length == 1 && amountArray.length == 1, Errors.C_REGISTRY_LENGTH_ERROR);

      Lv1Register storage lv1Register = _lv2Registry[0].lv1Registry[idArray[0]];

      require(lv1Register.isActive, Errors.C_REGISTRY_NOT_ACTIVE_WORK);
      require(workTokenID == lv1Register.lv1TokenID, Errors.C_REGISTRY_WRONG_LV1_TOKENID);

      //not avaiable for claiming more than once for one address
      require(0 == lv1Register.claimedTokens[beneficiary], Errors.C_REGISTRY_CLAIMED_ALREADY);
      require(0 != amountArray[0], Errors.C_REGISTRY_AMOUNT_ERROR);
      lv1Register.claimedTokens[beneficiary] = amountArray[0];
      //transfer token
      CopyrightFixedSupply(lv1Register.lv1TokenID).transfer(beneficiary, amountArray[0]);

      //Emit event
      emit WorkTokenClaim(lv2ID, idArray[0], lv1Register.lv1TokenID, amountArray[0], beneficiary);
    }
  }

  //shutdown increaseSupplySwitch
  // TODO: change to other admin account
  /**
   * @dev Emitted on turnoffIncreaseSupplySwitch
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   * @param workTokenID ID of the work
   **/
  function turnoffIncreaseSupplySwitch(
    uint256 lv2ID,
    uint256 id,
    address workTokenID
  ) public onlyOwner returns (bool) {
    require(workTokenID != address(0), Errors.C_REGISTRY_WRONG_LV2_TOKENID);
    if (lv2ID != 0) {
      require(workTokenID == _lv2Registry[lv2ID].lv2TokenID, Errors.C_REGISTRY_WRONG_LV2_TOKENID);
      CopyrightFixedSupply(_lv2Registry[lv2ID].lv2TokenID).turnoffIncreaseSupplySwitch();
    } else {
      address lv1TokenID = _lv2Registry[lv2ID].lv1Registry[id].lv1TokenID;
      require(workTokenID == lv1TokenID, Errors.C_REGISTRY_WRONG_LV1_TOKENID);
      CopyrightFixedSupply(lv1TokenID).turnoffIncreaseSupplySwitch();
    }
    emit TurnoffIncreaseSupplySwitch(lv2ID, id, workTokenID);
    return true;
  }

  /**
   * @dev encode to get the message for registerWorkToken interface
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   * @param symbol Token's symbol
   * @param name Token's name
   * @param totalSupply totalSupply
   */
  function encodeRWT(
    uint256 lv2ID,
    uint256 id,
    string memory symbol,
    string memory name,
    uint256 totalSupply
  ) public pure returns (bytes memory) {
    return abi.encodePacked(lv2ID, id, symbol, name, totalSupply);
  }

  function testInvite() public pure returns (string memory) {
    return "hello";
  }

  /**
   * @dev encode to get the message for claimWorkToken interface
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param idArray chapter ID array
   * @param workTokenID ID of the work
   * @param amountArray Token amount array
   * @param beneficiary Allocate to this address
   */
  function encodeCWT(
    uint256 lv2ID,
    uint256[] memory idArray,
    address workTokenID,
    uint256[] memory amountArray,
    address beneficiary
  ) public pure returns (bytes memory) {
    return abi.encodePacked(lv2ID, idArray, workTokenID, amountArray, beneficiary);
  }
}
