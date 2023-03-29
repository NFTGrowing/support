// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

// Prettier ignore to prevent buidler flatter bug
// prettier-ignore
import {IStakingAddressesProvider} from "../interfaces/IStakingAddressesProvider.sol";
import {CBUpgradeableProxy} from "../libraries/proxy/CBUpgradeableProxy.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title StakingAddressesProvider contract
 * @dev Main registry of addresses part of or connected to the protocol, including permissioned roles
 * - Acting also as factory of proxies and admin of those, so with right to change its implementations
 * - Owned by the CBP Governance
 * @author CBP
 **/
contract StakingAddressesProvider is Ownable, IStakingAddressesProvider {
  string private _marketId;
  mapping(bytes32 => address) private _addresses;

  bytes32 private constant STAKING = "STAKING";
  bytes32 private constant SUPPORT = "SUPPORT";
  bytes32 private constant STAKING_CONFIGURATOR = "STAKING_CONFIGURATOR";
  bytes32 private constant POOL_ADMIN = "POOL_ADMIN";
  bytes32 private constant EMERGENCY_ADMIN = "EMERGENCY_ADMIN";
  bytes32 private constant RESERVE_ORACLE = "RESERVE_ORACLE";
  bytes32 private constant NFT_ORACLE = "NFT_ORACLE";
  bytes32 private constant CBP_ORACLE = "CBP_ORACLE";
  bytes32 private constant BNFT_REGISTRY = "BNFT_REGISTRY";
  bytes32 private constant INCENTIVES_CONTROLLER = "INCENTIVES_CONTROLLER";

  constructor(string memory marketId) {
    _setMarketId(marketId);
  }

  /**
   * @dev Returns the id of the fCBP market to which this contracts points to
   * @return The market id
   **/
  function getMarketId() external view override returns (string memory) {
    return _marketId;
  }

  /**
   * @dev Allows to set the market which this StakingAddressesProvider represents
   * @param marketId The market id
   */
  function setMarketId(string memory marketId) external override onlyOwner {
    _setMarketId(marketId);
  }

  /**
   * @dev General function to update the implementation of a proxy registered with
   * certain `id`. If there is no proxy registered, it will instantiate one and
   * set as implementation the `implementationAddress`
   * IMPORTANT Use this function carefully, only for ids that don't have an explicit
   * setter function, in order to avoid unexpected consequences
   * @param id The id
   * @param implementationAddress The address of the new implementation
   */
  function setAddressAsProxy(
    bytes32 id,
    address implementationAddress,
    bytes memory encodedCallData
  ) external override onlyOwner {
    _updateImpl(id, implementationAddress);
    emit AddressSet(id, implementationAddress, true, encodedCallData);

    if (encodedCallData.length > 0) {
      Address.functionCall(_addresses[id], encodedCallData);
    }
  }

  /**
   * @dev Sets an address for an id replacing the address saved in the addresses map
   * IMPORTANT Use this function carefully, as it will do a hard replacement
   * @param id The id
   * @param newAddress The address to set
   */
  function setAddress(bytes32 id, address newAddress) external override onlyOwner {
    _addresses[id] = newAddress;
    emit AddressSet(id, newAddress, false, new bytes(0));
  }

  /**
   * @dev Returns an address by id
   * @return The address
   */
  function getAddress(bytes32 id) public view override returns (address) {
    return _addresses[id];
  }

  /**
   * @dev Returns the address of the Staking proxy
   * @return The Staking proxy address
   **/
  function getStaking() external view override returns (address) {
    return getAddress(STAKING);
  }

  /**
   * @dev Updates the implementation of the Staking, or creates the proxy
   * setting the new `staking` implementation on the first time calling it
   * @param staking The new Staking implementation
   **/
  function setStakingImpl(address staking, bytes memory encodedCallData) external override onlyOwner {
    _updateImpl(STAKING, staking);
    emit StakingUpdated(staking, encodedCallData);

    if (encodedCallData.length > 0) {
      Address.functionCall(_addresses[STAKING], encodedCallData);
    }
  }

  /**
   * @dev Returns the address of the Support proxy
   * @return The Support proxy address
   **/
  function getSupport() external view override returns (address) {
    return getAddress(SUPPORT);
  }

  /**
   * @dev Updates the implementation of the Support, or creates the proxy
   * setting the new `support` implementation on the first time calling it
   * @param support The new Support implementation
   **/
  function setSupportImpl(address support, bytes memory encodedCallData) external override onlyOwner {
    _updateImpl(SUPPORT, support);
    emit SupportUpdated(support, encodedCallData);

    if (encodedCallData.length > 0) {
      Address.functionCall(_addresses[SUPPORT], encodedCallData);
    }
  }

  /**
   * @dev Returns the address of the StakingConfigurator proxy
   * @return The StakingConfigurator proxy address
   **/
  function getStakingConfigurator() external view override returns (address) {
    return getAddress(STAKING_CONFIGURATOR);
  }

  /**
   * @dev Updates the implementation of the StakingConfigurator, or creates the proxy
   * setting the new `configurator` implementation on the first time calling it
   * @param configurator The new StakingConfigurator implementation
   **/
  function setStakingConfiguratorImpl(address configurator, bytes memory encodedCallData) external override onlyOwner {
    _updateImpl(STAKING_CONFIGURATOR, configurator);
    emit StakingConfiguratorUpdated(configurator, encodedCallData);

    if (encodedCallData.length > 0) {
      Address.functionCall(_addresses[STAKING_CONFIGURATOR], encodedCallData);
    }
  }

  /**
   * @dev The functions below are getters/setters of addresses that are outside the context
   * of the protocol hence the upgradable proxy pattern is not used
   **/

  function getPoolAdmin() external view override returns (address) {
    return getAddress(POOL_ADMIN);
  }

  function setPoolAdmin(address admin) external override onlyOwner {
    _addresses[POOL_ADMIN] = admin;
    emit ConfigurationAdminUpdated(admin);
  }

  function getEmergencyAdmin() external view override returns (address) {
    return getAddress(EMERGENCY_ADMIN);
  }

  function setEmergencyAdmin(address emergencyAdmin) external override onlyOwner {
    _addresses[EMERGENCY_ADMIN] = emergencyAdmin;
    emit EmergencyAdminUpdated(emergencyAdmin);
  }

  function getBNFTRegistry() external view override returns (address) {
    return getAddress(BNFT_REGISTRY);
  }

  function setBNFTRegistry(address factory) external override onlyOwner {
    _addresses[BNFT_REGISTRY] = factory;
    emit BNFTRegistryUpdated(factory);
  }

  function getImplementation(address proxyAddress) external view onlyOwner returns (address) {
    CBUpgradeableProxy proxy = CBUpgradeableProxy(payable(proxyAddress));
    return proxy.getImplementation();
  }

  /**
   * @dev Internal function to update the implementation of a specific proxied component of the protocol
   * - If there is no proxy registered in the given `id`, it creates the proxy setting `newAdress`
   *   as implementation and calls the initialize() function on the proxy
   * - If there is already a proxy registered, it just updates the implementation to `newAddress` and
   *   calls the encoded method function via upgradeToAndCall() in the proxy
   * @param id The id of the proxy to be updated
   * @param newAddress The address of the new implementation
   **/
  function _updateImpl(bytes32 id, address newAddress) internal {
    address payable proxyAddress = payable(_addresses[id]);

    if (proxyAddress == address(0)) {
      bytes memory params = abi.encodeWithSignature("initialize(address)", address(this));

      // create proxy, then init proxy & implementation
      CBUpgradeableProxy proxy = new CBUpgradeableProxy(newAddress, address(this), params);

      _addresses[id] = address(proxy);
      emit ProxyCreated(id, address(proxy));
    } else {
      // upgrade implementation
      CBUpgradeableProxy proxy = CBUpgradeableProxy(proxyAddress);

      proxy.upgradeTo(newAddress);
    }
  }

  function _setMarketId(string memory marketId) internal {
    _marketId = marketId;
    emit MarketIdSet(marketId);
  }
}
