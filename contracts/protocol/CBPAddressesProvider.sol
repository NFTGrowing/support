// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

// Prettier ignore to prevent buidler flatter bug
// prettier-ignore
import {ICBPAddressesProvider} from "../interfaces/ICBPAddressesProvider.sol";
import {CBUpgradeableProxy} from "../libraries/proxy/CBUpgradeableProxy.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title CBPAddressesProvider contract
 * @dev Main registry of addresses part of or connected to the protocol, including permissioned roles
 * - Acting also as factory of proxies and admin of those, so with right to change its implementations
 * - Owned by the CBP Governance
 * @author CBP
 **/
contract CBPAddressesProvider is ICBPAddressesProvider, Initializable, OwnableUpgradeable {
  mapping(bytes32 => address) private _addresses;

  //Feature Contract proxy
  bytes32 private constant SUPPORT = "SUPPORT";
  bytes32 private constant COPYRIGHT_REGISTRY = "COPYRIGHT_REGISTRY";

  //Configurator
  bytes32 private constant CONFIGURATOR = "CONFIGURATOR";
  bytes32 private constant OPERATOR = "OPERATOR";

  // constructor() {}
  function initialize() external initializer {
    __Ownable_init();
    emit Initialized();
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
   * @dev Returns the address of the CopyrightRegistry proxy
   * @return The CopyrightRegistry proxy address
   **/
  function getCopyrightRegistry() external view override returns (address) {
    return getAddress(COPYRIGHT_REGISTRY);
  }

  /**
   * @dev Updates the implementation of the CopyrightRegistry, or creates the proxy
   * setting the new `copyrightRegistry` implementation on the first time calling it
   * @param copyrightRegistry The new CopyrightRegistry implementation
   **/
  function setCopyrightRegistryImpl(address copyrightRegistry, bytes memory encodedCallData)
    external
    override
    onlyOwner
  {
    _updateImpl(COPYRIGHT_REGISTRY, copyrightRegistry);
    emit CopyrightRegistryUpdated(copyrightRegistry, encodedCallData);

    if (encodedCallData.length > 0) {
      Address.functionCall(_addresses[COPYRIGHT_REGISTRY], encodedCallData);
    }
  }

  /**
   * @dev The functions below are getters/setters of addresses that are outside the context
   * of the protocol hence the upgradable proxy pattern is not used
   **/

  function getConfigurator() external view override returns (address) {
    return getAddress(CONFIGURATOR);
  }

  function setConfigurator(address configurator) external override onlyOwner {
    _addresses[CONFIGURATOR] = configurator;
    emit ConfigurationAdminUpdated(configurator);
  }

  function getOperator() external view override returns (address) {
    return getAddress(OPERATOR);
  }

  function setOperator(address operator) external override onlyOwner {
    _addresses[OPERATOR] = operator;
    emit OperatorUpdated(operator);
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
}
