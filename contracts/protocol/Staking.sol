// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {IStaking} from "../interfaces/IStaking.sol";
import {IStakingAddressesProvider} from "../interfaces/IStakingAddressesProvider.sol";

import {NftConfiguration} from "../libraries/configuration/NftConfiguration.sol";
import {NftLogic} from "../libraries/logic/NftLogic.sol";

import {DataTypes} from "../libraries/types/DataTypes.sol";
import {StakingStorage} from "./StakingStorage.sol";
import {StakingStorageExt} from "./StakingStorageExt.sol";
import {StakeLogic} from "../libraries/logic/StakeLogic.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

/**
 * @title Staking contract
 * @dev Main point of interaction with an Staking protocol's market
 * - Users can:
 *   # Deposit
 *   # Withdraw
 *   # Borrow
 *   # Repay
 *   # Auction
 *   # Liquidate
 * - To be covered by a proxy contract, owned by the StakingAddressesProvider of the specific market
 * - All admin functions are callable by the StakingConfigurator contract defined also in the
 *   StakingAddressesProvider
 * @author CBP
 **/
// !!! For Upgradable: DO NOT ADJUST Inheritance Order !!!
contract Staking is
  Initializable,
  IStaking,
  StakingStorage,
  ContextUpgradeable,
  IERC721ReceiverUpgradeable,
  StakingStorageExt
{
  using NftConfiguration for DataTypes.NftConfigurationMap;
  using NftLogic for DataTypes.NftData;

  /**
   * @dev Prevents a contract from calling itself, directly or indirectly.
   * Calling a `nonReentrant` function from another `nonReentrant`
   * function is not supported. It is possible to prevent this from happening
   * by making the `nonReentrant` function external, and making it call a
   * `private` function that does the actual work.
   */
  modifier nonReentrant() {
    // On the first call to nonReentrant, _notEntered will be true
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

    // Any calls to nonReentrant after this point will fail
    _status = _ENTERED;

    _;

    // By storing the original value once again, a refund is triggered (see
    // https://eips.ethereum.org/EIPS/eip-2200)
    _status = _NOT_ENTERED;
  }

  modifier whenNotPaused() {
    _whenNotPaused();
    _;
  }

  modifier onlyStakingConfigurator() {
    _onlyStakingConfigurator();
    _;
  }

  function _whenNotPaused() internal view {
    require(!_paused, Errors.LP_IS_PAUSED);
  }

  function _onlyStakingConfigurator() internal view {
    require(_addressesProvider.getPoolAdmin() == _msgSender(), Errors.LP_CALLER_NOT_SUPPORT_CONFIGURATOR);
  }

  /**
   * @dev Function is invoked by the proxy contract when the Staking contract is added to the
   * StakingAddressesProvider of the market.
   * - Caching the address of the StakingAddressesProvider in order to reduce gas consumption
   *   on subsequent operations
   * @param provider The address of the StakingAddressesProvider
   **/
  function initialize(IStakingAddressesProvider provider) public initializer {
    _maxNumberOfNfts = 1024;
    _addressesProvider = provider;
  }

  /**
   * @dev Stake NFT into the pool
   * @param nftAsset The address of the NFT to be staked
   * @param nftTokenId NFT id in nftAsset to be deposited
   **/
  function stake(address nftAsset, uint256 nftTokenId) external override nonReentrant whenNotPaused {
    StakeLogic.executeStake(
      _addressesProvider,
      _nfts,
      DataTypes.ExecuteStakeParams({
        initiator: _msgSender(),
        nftAsset: nftAsset,
        nftTokenId: nftTokenId,
        onBehalfOf: _msgSender()
      })
    );
  }

  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes calldata data
  ) external pure override returns (bytes4) {
    operator;
    from;
    tokenId;
    data;
    return IERC721ReceiverUpgradeable.onERC721Received.selector;
  }

  /**
   * @dev Returns the configuration of the NFT
   * @param asset The address of the asset of the NFT
   * @return The configuration of the NFT
   **/
  function getNftConfiguration(address asset) external view override returns (DataTypes.NftConfigurationMap memory) {
    return _nfts[asset].configuration;
  }

  /**
   * @dev Returns the state and configuration of the nft
   * @param asset The address of the underlying asset of the nft
   * @return The state of the nft
   **/
  function getNftData(address asset) external view override returns (DataTypes.NftData memory) {
    return _nfts[asset];
  }

  /**
   * @dev Returns the list of the initialized nfts
   **/
  function getNftsList() external view override returns (address[] memory) {
    address[] memory _activeNfts = new address[](_nftsCount);

    for (uint256 i = 0; i < _nftsCount; i++) {
      _activeNfts[i] = _nftsList[i];
    }
    return _activeNfts;
  }

  /**
   * @dev Set the _pause state of the pool
   * - Only callable by the StakingConfigurator contract
   * @param val `true` to pause the pool, `false` to un-pause it
   */
  function setPause(bool val) external override onlyStakingConfigurator {
    if (_paused != val) {
      _paused = val;
      if (_paused) {
        _pauseStartTime = block.timestamp;
        emit Paused();
      } else {
        _pauseDurationTime = block.timestamp - _pauseStartTime;
        emit Unpaused();
      }
    }
  }

  /**
   * @dev Returns if the Staking is paused
   */
  function paused() external view override returns (bool) {
    return _paused;
  }

  function setPausedTime(uint256 startTime, uint256 durationTime) external override onlyStakingConfigurator {
    _pauseStartTime = startTime;
    _pauseDurationTime = durationTime;
    emit PausedTimeUpdated(startTime, durationTime);
  }

  function getPausedTime() external view override returns (uint256, uint256) {
    return (_pauseStartTime, _pauseDurationTime);
  }

  /**
   * @dev Returns the cached StakingAddressesProvider connected to this contract
   **/
  function getAddressesProvider() external view override returns (IStakingAddressesProvider) {
    return _addressesProvider;
  }

  function setMaxNumberOfNfts(uint256 val) external override onlyStakingConfigurator {
    _maxNumberOfNfts = val;
  }

  /**
   * @dev Returns the maximum number of nfts supported to be listed in this Staking
   */
  function getMaxNumberOfNfts() public view override returns (uint256) {
    return _maxNumberOfNfts;
  }

  /**
   * @dev Initializes a nft, activating it, assigning nft loan and an
   * interest rate strategy
   * - Only callable by the StakingConfigurator contract
   * @param asset The address of the underlying asset of the nft
   **/
  function initNft(address asset, address bNftAddress) external override onlyStakingConfigurator {
    require(AddressUpgradeable.isContract(asset), Errors.LP_NOT_CONTRACT);

    _nfts[asset].init(bNftAddress);
    _addNftToList(asset);

    //The asset belongs to this contract now
    // require(_addressesProvider.getStakingLoan() != address(0), Errors.LPC_INVALIED_LOAN_ADDRESS);
    IERC721Upgradeable(asset).setApprovalForAll(address(this), true);
  }

  /**
   * @dev Sets the configuration bitmap of the NFT as a whole
   * - Only callable by the StakingConfigurator contract
   * @param asset The address of the asset of the NFT
   * @param configuration The new configuration bitmap
   **/
  function setNftConfiguration(address asset, uint256 configuration) external override onlyStakingConfigurator {
    _nfts[asset].configuration.data = configuration;
  }

  function setNftMaxSupplyAndTokenId(
    address asset,
    uint256 maxSupply,
    uint256 maxTokenId
  ) external override onlyStakingConfigurator {
    _nfts[asset].maxSupply = maxSupply;
    _nfts[asset].maxTokenId = maxTokenId;
  }

  function _addNftToList(address asset) internal {
    uint256 nftsCount = _nftsCount;

    require(nftsCount < _maxNumberOfNfts, Errors.LP_NO_MORE_NFTS_ALLOWED);

    _nfts[asset].id = uint8(nftsCount);
    _nftsList[nftsCount] = asset;
    _nftsCount = nftsCount + 1;
  }

  function _verifyCallResult(
    bool success,
    bytes memory returndata,
    string memory errorMessage
  ) internal pure returns (bytes memory) {
    if (success) {
      return returndata;
    } else {
      // Look for revert reason and bubble it up if present
      if (returndata.length > 0) {
        // The easiest way to bubble the revert reason is using memory via assembly
        assembly {
          let returndata_size := mload(returndata)
          revert(add(32, returndata), returndata_size)
        }
      } else {
        revert(errorMessage);
      }
    }
  }
}
