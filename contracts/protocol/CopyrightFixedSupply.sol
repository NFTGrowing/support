// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title CopyrightFixedSupply
 * @dev ERC20
 */
contract CopyrightFixedSupply is ERC20 {
  uint8 private _decimals;
  mapping(address => uint256) public mintValues;

  /**
   * @dev Emitted on setWorkURL()
   * @param workURL URL to the work which this copyright token tracking
   **/
  event SetWorkURL(string workURL);

  /**
   * @dev Emitted on turnoffIncreaseSupplySwitch()
   **/
  event TurnoffIncreaseSupplySwitch();

  //false: can't increase supply; true: could use registry account to increase supply
  //would be turn tobe 0 after launching for a period
  bool public increaseSupplySwitch;

  address public registryAddress;
  string public workURL;

  constructor(
    string memory name,
    string memory symbol,
    uint8 decimals_,
    uint256 totalSupply_
  ) ERC20(name, symbol) {
    _setupDecimals(decimals_);
    _mint(msg.sender, totalSupply_);
    increaseSupplySwitch = true;
    registryAddress = msg.sender;
  }

  function _setupDecimals(uint8 decimals_) internal {
    _decimals = decimals_;
  }

  function decimals() public view virtual override returns (uint8) {
    return _decimals;
  }

  function setWorkURL(string calldata workURL_) public returns (bool) {
    require(msg.sender == registryAddress, "Should call from registry");
    workURL = workURL_;
    emit SetWorkURL(workURL_);
    return true;
  }

  function increaseSupply(uint256 value) public returns (bool) {
    require(increaseSupplySwitch, "Increase supply permission has been removed");
    require(msg.sender == registryAddress, "Should call from registry");

    _mint(registryAddress, value);
    return true;
  }

  function turnoffIncreaseSupplySwitch() public returns (bool) {
    require(msg.sender == registryAddress, "Should call from registry");
    increaseSupplySwitch = false;

    emit TurnoffIncreaseSupplySwitch();
    return true;
  }
}
