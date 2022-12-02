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
  event MarketIdSet(string newMarketId);
  event StakingUpdated(address indexed newAddress, bytes encodedCallData);
  event SupportUpdated(address indexed newAddress, bytes encodedCallData);
  event ConfigurationAdminUpdated(address indexed newAddress);
  event EmergencyAdminUpdated(address indexed newAddress);
  event StakingConfiguratorUpdated(address indexed newAddress, bytes encodedCallData);
  event ProxyCreated(bytes32 id, address indexed newAddress);
  event AddressSet(bytes32 id, address indexed newAddress, bool hasProxy, bytes encodedCallData);
  event BNFTRegistryUpdated(address indexed newAddress);

  function getMarketId() external view returns (string memory);

  function setMarketId(string calldata marketId) external;

  function setAddress(bytes32 id, address newAddress) external;

  function setAddressAsProxy(
    bytes32 id,
    address impl,
    bytes memory encodedCallData
  ) external;

  function getAddress(bytes32 id) external view returns (address);

  function getStaking() external view returns (address);

  function setStakingImpl(address staking, bytes memory encodedCallData) external;

  function getSupport() external view returns (address);

  function setSupportImpl(address support, bytes memory encodedCallData) external;

  function getStakingConfigurator() external view returns (address);

  function setStakingConfiguratorImpl(address configurator, bytes memory encodedCallData) external;

  function getPoolAdmin() external view returns (address);

  function setPoolAdmin(address admin) external;

  function getEmergencyAdmin() external view returns (address);

  function setEmergencyAdmin(address admin) external;

  function getBNFTRegistry() external view returns (address);

  function setBNFTRegistry(address factory) external;
}
