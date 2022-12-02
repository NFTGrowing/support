// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;


import {ISupport} from "../interfaces/ISupport.sol";


import {IStakingAddressesProvider} from "../interfaces/IStakingAddressesProvider.sol";

/*
import {NftConfiguration} from "../libraries/configuration/NftConfiguration.sol";
import {NftLogic} from "../libraries/logic/NftLogic.sol";
*/

import {DataTypes} from "../libraries/types/DataTypes.sol";
import {StakingStorageExt} from "./StakingStorageExt.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

/**
 * @title Support contract
 * @dev Main point of interaction with the support protocol - 
 *      TODO - determine whether to deploy one contract instance for each collection.
 * - Users can:
 *   # support
 *   # get support list
 * - To be covered by a proxy contract, owned by the StakingAddressesProvider? of the specific market
 * - ?All admin functions are callable by the admin defined also in the StakingAddressesProvider
 * @author CBP
 **/

// !!! For Upgradable: DO NOT ADJUST Inheritance Order !!!
// TODO - check whether to seperate the storage contract
contract Support is
  Initializable,
  ISupport,
  ContextUpgradeable,
  StakingStorageExt
{
  struct Balance{
    uint256 etherAmount;
    uint256 wethAmount;
    uint256 usdcAmount;
    uint256 usdtAmount;
    // Gap for upgrading, minus one while adding one new asset
    // asset number limit is 20
    // TODO - whether change all the members tobe arr members
    uint256[16] amountGap;
  }

  struct LongTermSupportTx{
    address supporter;
    uint256 supportedTimeStamp;
    SupportAssetType assetType;
    uint256 assetAmount;
  }

  struct CollectionSupport {
    
    //TODO - initial , update 
    bool supporting;
    uint256 startedTimeStamp;

    //TODO - check to determine whether this is necessary 
    // while there is indexed event 
    // https://ethereum.stackexchange.com/questions/8658/what-does-the-indexed-keyword-do

    //TODO - stack may overflow if array keep increasing?
    // LongTermSupportTx[] supportedList;

    Balance balance;
    Balance accumulateBalance;
  }

  uint constant AssetTypeLimit = 20;
  bool internal _paused;
  IStakingAddressesProvider internal _addressesProvider;

  //Flexiable length may overlap the memory when SupportAssetType extend on upgrading
  address[AssetTypeLimit] internal _assetAddr;
  // mapping(uint => address) internal _assetAddr;
  mapping(address => CollectionSupport) internal _nftSupport;
  

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

    // TODO - check this
    // By storing the original value once again, a refund is triggered (see
    // https://eips.ethereum.org/EIPS/eip-2200)
    _status = _NOT_ENTERED;
  }


  modifier whenNotPaused() {
    _whenNotPaused();
    _;
  }

  modifier onlySupportConfigurator() {
    _onlySupportConfigurator();
    _;
  }

  function _whenNotPaused() internal view {
    require(!_paused, Errors.LP_IS_PAUSED);
  }

  function _onlySupportConfigurator() internal view {
    //TODO - check to see whether create one new configurator 
    require(_addressesProvider.getPoolAdmin() == _msgSender(), Errors.LP_CALLER_NOT_SUPPORT_CONFIGURATOR);
  }

  /**
   * @dev Function is invoked by the proxy contract when the Support contract is added to the
   * AddressesProvider
   * - Caching the address of the AddressesProvider in order to reduce gas consumption
   *   on subsequent operations
   * @param provider The address of the AddressesProvider
   **/
  function initialize(IStakingAddressesProvider provider) public initializer {
    _addressesProvider = provider;
  }

  /**
   * @dev get CollectionSupport info
   * @param nftAsset The address of the collection
   **/
  function getCollectionSupport(address nftAsset) public view returns(CollectionSupport memory){
    return _nftSupport[nftAsset];
  }

  /**
   * @dev set asset address
   * @param addrList New addrList to cover the existing arr
   */
  function setAssetsAddr(address[] calldata addrList) external override nonReentrant onlySupportConfigurator{
    require(addrList.length <= _assetAddr.length, Errors.VL_INVALID_AMOUNT);
    
    for (uint i = 0; i < _assetAddr.length; i++){
      if (i < addrList.length){ 
        _assetAddr[i] = addrList[i];
      }
      else{
        _assetAddr[i] = address(0);
      }
    }
  }

  /**
   * @dev get asset address
   */
  function getAssetsAddr() external view override returns (address[] memory){
    address[] memory addrReturn = new address[](AssetTypeLimit);
    for (uint i = 0; i < AssetTypeLimit; i++){
      addrReturn[i] = _assetAddr[i];
    }  
    return addrReturn;
  }

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
  ) external payable override nonReentrant whenNotPaused{
    //require msg.value > 0 or supportAmount > 0
    //require(msg.value > 0 || supportAmount > 0, Errors.VL_INVALID_AMOUNT);
    //require(_nftSupport[nftAsset].supporting, Errors.VL_COLLECTION_NOT_LIST);

    //assetType(uint8) to SupportAssetType(Enum) check 
    SupportAssetType assetTypeEnum = SupportAssetType(assetType);
    uint256 actualSupportAmount = supportAmount;

    //转移相关资产到合约内
    if (assetTypeEnum == SupportAssetType.ETH){
        require(msg.value > 0, Errors.VL_INVALID_AMOUNT);

        //add balance, accumulate Balance
        _nftSupport[nftAsset].balance.etherAmount += msg.value;
        _nftSupport[nftAsset].accumulateBalance.etherAmount += msg.value;
        actualSupportAmount = msg.value;

    } else if(assetTypeEnum == SupportAssetType.WETH) {
        require(supportAmount > 0, Errors.VL_INVALID_AMOUNT);
        // transfer ERC20-WETH to this contract
        address assetAddr = _assetAddr[assetType];
        //TODO - safeTransferFrom
        IERC20Upgradeable(assetAddr).transferFrom(
          msg.sender,
          address(this),
          supportAmount
        );

        //add balance, accumulate Balance
        _nftSupport[nftAsset].balance.wethAmount += supportAmount;
        _nftSupport[nftAsset].accumulateBalance.wethAmount += supportAmount;

    } else if(assetTypeEnum == SupportAssetType.USDC) {
        require(supportAmount > 0, Errors.VL_INVALID_AMOUNT);

        // transfer ERC20-USDC to this contract
        address assetAddr = _assetAddr[assetType];
        IERC20Upgradeable(assetAddr).transferFrom(
          msg.sender,
          address(this),
          supportAmount
        );

        //add balance, accumulate Balance
        _nftSupport[nftAsset].balance.usdcAmount += supportAmount;
        _nftSupport[nftAsset].accumulateBalance.usdcAmount += supportAmount;
    } else if(assetTypeEnum == SupportAssetType.USDT) {
        require(supportAmount > 0, Errors.VL_INVALID_AMOUNT);

        // transfer ERC20-USDC to this contract
        address assetAddr = _assetAddr[assetType];
        IERC20Upgradeable(assetAddr).transferFrom(
          msg.sender,
          address(this),
          supportAmount
        );

        //add balance, accumulate Balance
        _nftSupport[nftAsset].balance.usdtAmount += supportAmount;
        _nftSupport[nftAsset].accumulateBalance.usdtAmount += supportAmount;
    } else {
        // revert
        revert("The assetType is not supported");
    }
    
    // TODO - tx 可能不需要用 storage 来维护
    
    emit LongTermSupport(_msgSender(), nftAsset, assetType, actualSupportAmount, block.timestamp);
    
  }

  /**
   * @dev Update the supporting status of collections
   * @param collections The addresses of the NFT to be updated
   * @param newStatus set the collections to this status
   **/
  function updateStatus(
    address[] calldata collections,
    bool newStatus
  ) external override nonReentrant onlySupportConfigurator{
    require(collections.length > 0, Errors.VL_INVALID_AMOUNT);
    
    for (uint i=0; i<collections.length; i++){
      _nftSupport[collections[i]].supporting = newStatus;

    }
  }

  //TODO - add address provide code 
  
}
