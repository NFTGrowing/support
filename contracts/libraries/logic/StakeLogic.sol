// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {IBNFT} from "../../interfaces/IBNFT.sol";
import {IStakingAddressesProvider} from "../../interfaces/IStakingAddressesProvider.sol";
import {DataTypes} from "../types/DataTypes.sol";
import {Errors} from "../helpers/Errors.sol";

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";


/**
 * @title StakeLogic library
 * @author CBP
 * @notice Implements the logic to stake feature
 */
library StakeLogic {
  using SafeERC20Upgradeable for IERC20Upgradeable;

  /**
   * @dev Emitted on borrow() when loan needs to be opened
   * @param user The address of the user initiating the borrow(), receiving the funds
   * @param nftAsset The address of the underlying NFT used as collateral
   * @param nftTokenId The token id of the underlying NFT used as collateral
   * @param onBehalfOf The address that will be getting the loan
   **/
  event Stake(
    address user,
    address nftAsset,
    uint256 nftTokenId,
    address indexed onBehalfOf
  );

  struct ExecuteStakeVars {
    address initiator;
    uint256 loanId;
    address reserveOracle;
    address nftOracle;
    address loanAddress;
    uint256 totalSupply;
  }

  /**
   * @notice Implements the stake feature. Through `stake()`, users stake assets from the protocol.
   * @dev Emits the `Stake()` event.
   * @param nftsData The state of all the nfts
   * @param params The additional parameters needed to execute the stake function
   */
  function executeStake(
    IStakingAddressesProvider addressesProvider,
    mapping(address => DataTypes.NftData) storage nftsData,
    DataTypes.ExecuteStakeParams memory params
  ) external {
    _stake( addressesProvider, nftsData, params );
  }


  function _stake(
    IStakingAddressesProvider addressesProvider,
    mapping(address => DataTypes.NftData) storage nftsData,
    DataTypes.ExecuteStakeParams memory params
  ) internal {
    require(params.onBehalfOf != address(0), Errors.VL_INVALID_ONBEHALFOF_ADDRESS);

    //ExecuteStakeLocalVars memory vars;
    //vars.initiator = params.initiator;
    // ToDo - check whether nftAsset is in supported list and the status

    /* ToDo - Add back the configu part logic
    DataTypes.NftData storage nftData = nftsData[params.nftAsset];
    uint256 currentTotalSupply = IERC721EnumerableUpgradeable(params.nftAsset).totalSupply();
    require(currentTotalSupply <= nftData.maxSupply, Errors.LP_NFT_SUPPLY_NUM_EXCEED_MAX_LIMIT);
    require(params.nftTokenId <= nftData.maxTokenId, Errors.LP_NFT_TOKEN_ID_EXCEED_MAX_LIMIT);
    */

    
    // ERC721 Transfer 
    IERC721Upgradeable(params.nftAsset).safeTransferFrom(params.initiator, address(this), params.nftTokenId);

    /*
    // ToDo - MintBNFT to owner
    IBNFT(nftData.bNftAddress).mint(params.onBehalfOf, params.nftTokenId);
    */

    emit Stake(
      params.initiator,
      params.nftAsset,
      params.nftTokenId,
      params.onBehalfOf
    );
  }
}
