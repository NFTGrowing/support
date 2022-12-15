// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

interface ISupport {

  // important: limit is 20 kind of assets, check _assetAddr in Support.sol
  enum SupportAssetType{
    ETH,
    WETH,
    USDC,
    USDT,
    Last //this indicates the length of this enum, not a valid type
  }

  /**
   * @dev Emitted on longTermSupport()
   * @param supporter The address supporting
   * @param nftAsset address of the collection being supported
   * @param issueNo current issue no
   * @param assetType asset using to support; 
   * @param supportAmount The amount of the above asset
   * @param supportedTimeStamp //TODO - is his duplicated with the system's log?
   **/
  event LongTermSupport(
    address indexed supporter,
    address indexed nftAsset,
    uint256 indexed issueNo,
    uint8 assetType,
    uint256 supportAmount,
    uint256 supportedTimeStamp
  );

  /**
   * @dev Emitted in receive funciton for ether depositing
   * @param depositor depositor
   * @param amount amount
   **/
  event Received(address depositor, uint256 amount);

  /**
   * @dev Emitted on caseByCaseSupport()
   * @param supporter The address supporting
   * @param nftAsset address of the collection being supported
   * @param issueNo current issue no
   * @param assetType asset using to support; 
   * @param supportAmount The amount of the above asset
   * @param supportedTimeStamp //TODO - is his duplicated with the system's log?
   **/
  event CaseByCaseSupport(
    address indexed supporter,
    address indexed nftAsset,
    uint256 indexed issueNo,
    uint32 slotId,
    uint8 assetType,
    uint256 supportAmount,
    uint256 supportedTimeStamp
  );

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
   * @dev set _slotUpperLimit
   * @param slotUpperLimit New slotUpperLimit to cover the existing
   */
  function setSlotUpperLimit(uint256 slotUpperLimit) external;

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

  /**
   * @dev Update the supporting issue info of collection
   * @param collection The addresses of the NFT to be updated
   * @param baseIssueNo baseIssueNo of the Issue Data
   * @param baseStartTime baseStartTime of the Issue Data
   * @param issueDurationTime issueDurationTime of the Issue Data
  **/
  function updateCollectionIssueSchedule(
    address collection, 
    uint256 baseIssueNo,
    uint256 baseStartTime,
    uint256 issueDurationTime) external;


  // Case by case support 
  /**
   * @dev Depositor support the collection case by case by ether, usdc, or usdt
   * @param nftAsset The address of the NFT to be supported
   * @param assetType asset using to support; 
   * @param supportAmount The amount of the above asset
   * @param issueNo only the current issue or the previous one is supportable 
   * @param slotId The slotid of the supported item in this issue [0,30]
   **/
  function caseByCaseSupport(
    address nftAsset,  
    uint8 assetType,
    uint256 supportAmount,
    uint32 issueNo,
    uint32 slotId
  ) external payable;

}