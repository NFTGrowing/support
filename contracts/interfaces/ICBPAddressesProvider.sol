// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

/**
 * @title CBPAddressesProvider contract
 * @dev Main registry of addresses part of or connected to the protocol, including permissioned roles
 * - Acting also as factory of proxies and admin of those, so with right to change its implementations
 * - Owned by the  Governance
 * @author CBP
 **/
interface ICBPAddressesProvider {
  event Initialized();
  event SupportUpdated(address indexed newAddress, bytes encodedCallData);
  event CopyrightRegistryUpdated(address indexed newAddress, bytes encodedCallData);
  event ConfigurationAdminUpdated(address indexed newAddress);
  event OperatorUpdated(address indexed newAddress);
  event ProxyCreated(bytes32 id, address indexed newAddress);
  event AddressSet(bytes32 id, address indexed newAddress, bool hasProxy, bytes encodedCallData);

  function initialize() external;

  function setAddress(bytes32 id, address newAddress) external;

  function setAddressAsProxy(
    bytes32 id,
    address impl,
    bytes memory encodedCallData
  ) external;

  function getAddress(bytes32 id) external view returns (address);

  function getSupport() external view returns (address);

  function setSupportImpl(address support, bytes memory encodedCallData) external;

  function getCopyrightRegistry() external view returns (address);

  function setCopyrightRegistryImpl(address support, bytes memory encodedCallData) external;

  function getConfigurator() external view returns (address);

  function setConfigurator(address configurator) external;

  function getOperator() external view returns (address);

  function setOperator(address operator) external;
}
