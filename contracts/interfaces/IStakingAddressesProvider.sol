// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

/**
 * @title StakingAddressesProvider contract
 * @dev Main registry of addresses part of or connected to the protocol, including permissioned roles
 * - Acting also as factory of proxies and admin of those, so with right to change its implementations
 * - Owned by the  Governance
 * @author
 **/
interface IStakingAddressesProvider {
  event SupportUpdated(address indexed newAddress, bytes encodedCallData);
  event ConfigurationAdminUpdated(address indexed newAddress);
  event EmergencyAdminUpdated(address indexed newAddress);
  event ProxyCreated(bytes32 id, address indexed newAddress);
  event AddressSet(bytes32 id, address indexed newAddress, bool hasProxy, bytes encodedCallData);

  function setAddress(bytes32 id, address newAddress) external;

  function setAddressAsProxy(
    bytes32 id,
    address impl,
    bytes memory encodedCallData
  ) external;

  function getAddress(bytes32 id) external view returns (address);

  function getSupport() external view returns (address);

  function setSupportImpl(address support, bytes memory encodedCallData) external;

  function getPoolAdmin() external view returns (address);

  function setPoolAdmin(address admin) external;

  function getEmergencyAdmin() external view returns (address);

  function setEmergencyAdmin(address admin) external;
}
