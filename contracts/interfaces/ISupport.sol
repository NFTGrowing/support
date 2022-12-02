// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

interface ISupport {


  
  // important: limit is 20 kind of assets, check _assetAddr in Support.sol
  enum SupportAssetType{
    ETH,
    WETH,
    USDC,
    USDT
  }

  /**
   * @dev set asset address
   * @param addrList New addrList to cover the existing arr
   */
  function setAssetsAddr(address[] calldata addrList) external;

  /**
   * @dev get asset address
   */
  function getAssetsAddr() external view returns (address[] memory);


  /**
   * @dev Emitted on longTermSupport()
   * @param supporter The address supporting
   * @param nftAsset address of the collection being supported
   * @param assetType asset using to support; 
   * @param supportAmount The amount of the above asset
   * @param supportedTimeStamp //TODO - is his duplicated with the system's log?
   **/
  event LongTermSupport(
    address indexed supporter,
    address indexed nftAsset,
    uint8 assetType,
    uint256 supportAmount,
    uint256 indexed supportedTimeStamp
  );


  /**
   * @dev Depositor support the collection by ether, usdc, or usdt
   * @param nftAsset The address of the NFT to be supported
   * @param assetType asset using to support; 
   * @param supportAmount The amount of the above asset
   **/
  function longTermSupport(
    address nftAsset,
    uint8 assetType,
    uint256 supportAmount
  ) external payable;


  /**
   * @dev Update the supporting status of collections
   * @param collections The addresses of the NFT to be updated
   * @param newStatus set the collections to this status
   **/
  function updateStatus(
    address[] calldata collections,
    bool newStatus
  ) external;

}