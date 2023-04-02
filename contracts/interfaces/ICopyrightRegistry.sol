// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

interface ICopyrightRegistry {
  /**
   * @dev Emitted on registerWorkToken()
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   * @param workTokenID ID of the work
   * @param symbol Token's symbol
   * @param name Token's name
   * @param sender sender of the registry tx
   * @param totalSupply totalSupply
   **/
  event WorkTokenDeploy(
    uint256 indexed lv2ID,
    uint256 indexed id,
    address workTokenID,
    string symbol,
    string name,
    address sender,
    uint256 totalSupply
  );

  /**
   * @dev Emitted on claimWorkToken()
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   * @param workTokenID ID of the work
   * @param tokenAmount Token amount
   * @param beneficiary Allocate to this address
   **/
  event WorkTokenClaim(
    uint256 indexed lv2ID,
    uint256 indexed id,
    address workTokenID,
    uint256 tokenAmount,
    address beneficiary
  );

  /**
   * @dev Emitted on setServiceSignAddr()
   * @param addr Allocate to this address
   **/
  event SetServiceSignAddr(address addr);

  /**
   * @dev Emitted on turnoffIncreaseSupplySwitch
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   * @param workTokenID ID of the work
   **/
  event TurnoffIncreaseSupplySwitch(uint256 indexed lv2ID, uint256 indexed id, address workTokenID);

  /**
   * @dev Emitted in receive funciton for ether depositing
   * @param depositor depositor
   * @param amount amount
   **/
  event Received(address depositor, uint256 amount);

  /**
   * @dev register copyright token for work
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
  ) external returns (address);

  /**
   * @dev claim Work Token
   * @param signature signature to the parameters by protocol service
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   * @param workTokenID ID of the work
   * @param tokenAmount Token amount
   * @param beneficiary Allocate to this address
   */
  /*
  function claimWorkToken(
    string memory signature,
    uint256 lv2ID,
    uint256 id,
    address workTokenID,
    uint256 tokenAmount,
    address beneficiary
    ) external;
  */

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
  ) external;

  /**
   * @dev encode to get the message for registerWorkToken interface
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param id ID of the work
   * @param symbol Token's symbol
   * @param name Token's name
   * @param totalSupply totalSupply
   */
  /*
  function encodeRWT(
    uint256 lv2ID,
    uint256 id,
    string memory symbol,
    string memory name,
    uint256 totalSupply
    ) public pure returns (bytes memory);

  */
  /**
   * @dev encode to get the message for claimWorkToken interface
   * @param lv2ID aggregation ID of the work, 0 means no lv2ID
   * @param idArray chapter ID array
   * @param workTokenID ID of the work
   * @param amountArray Token amount array
   * @param beneficiary Allocate to this address
   */
  /*
  function encodeCWT(
    uint256 lv2ID,
    uint256[] memory idArray,
    address workTokenID,
    uint256[] memory amountArray,
    address beneficiary
    ) public pure returns (bytes memory);
  */
}
