// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {IStakingAddressesProvider} from "./IStakingAddressesProvider.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";

interface IStaking {
 
  /**
   * @dev Emitted on deposit()
   * @param user The address initiating the deposit
   * @param amount The amount deposited
   * @param reserve The address of the underlying asset of the reserve
   * @param onBehalfOf The beneficiary of the deposit, receiving the bTokens
   * @param referral The referral code used
   **/
  event Stake(
    address user,
    address indexed reserve,
    uint256 amount,
    address indexed onBehalfOf,
    uint16 indexed referral
  );

  /**
   * @dev Emitted on withdraw()
   * @param user The address initiating the withdrawal, owner of bTokens
   * @param reserve The address of the underlyng asset being withdrawn
   * @param amount The amount to be withdrawn
   * @param to Address that will receive the underlying
   **/
  event Withdraw(address indexed user, address indexed reserve, uint256 amount, address indexed to);

  /**
   * @dev Emitted when the pause is triggered.
   */
  event Paused();

  /**
   * @dev Emitted when the pause is lifted.
   */
  event Unpaused();

  /**
   * @dev Emitted when the pause time is updated.
   */
  event PausedTimeUpdated(uint256 startTime, uint256 durationTime);



  /**
   * @dev Stake NFT into the pool
   * @param nftAsset The address of the NFT to be staked
   * @param nftTokenId NFT id in nftAsset to be deposited
   **/
  function stake(
    address nftAsset,
    uint256 nftTokenId
  ) external;

  function getNftConfiguration(address asset) external view returns (DataTypes.NftConfigurationMap memory);

  function getNftsList() external view returns (address[] memory);
  
  function getNftData(address asset) external view returns (DataTypes.NftData memory);

  /**
   * @dev Set the _pause state of a reserve
   * - Only callable by the LendPool contract
   * @param val `true` to pause the reserve, `false` to un-pause it
   */
  function setPause(bool val) external;

  function setPausedTime(uint256 startTime, uint256 durationTime) external;

  /**
   * @dev Returns if the LendPool is paused
   */
  function paused() external view returns (bool);

  function getPausedTime() external view returns (uint256, uint256);

  function getAddressesProvider() external view returns (IStakingAddressesProvider);

  function initNft(address asset, address bNftAddress) external;

  function setNftConfiguration(address asset, uint256 configuration) external;

  function setNftMaxSupplyAndTokenId(
    address asset,
    uint256 maxSupply,
    uint256 maxTokenId
  ) external;

  function setMaxNumberOfNfts(uint256 val) external;

  function getMaxNumberOfNfts() external view returns (uint256);


}
