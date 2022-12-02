// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {IStakingAddressesProvider} from "../interfaces/IStakingAddressesProvider.sol";
import {NftLogic} from "../libraries/logic/NftLogic.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";

contract StakingStorage {
  using NftLogic for DataTypes.NftData;

  IStakingAddressesProvider internal _addressesProvider;
  mapping(address => DataTypes.NftData) internal _nfts;

  mapping(uint256 => address) internal _nftsList;
  uint256 internal _nftsCount;

  bool internal _paused;
  uint256 internal _maxNumberOfNfts;

  // TODO - check whether to seperate the logic and data here
  // !!! Never add new variable at here, because this contract is inherited by LendPool !!!
  // !!! Add new variable at LendPool directly !!!
}
