// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

library DataTypes {

  struct NftData {
    //stores the nft configuration
    NftConfigurationMap configuration;
    //address of the bNFT contract
    address bNftAddress;
    //the id of the nft. Represents the position in the list of the active nfts
    uint8 id;
    uint256 maxSupply;
    uint256 maxTokenId;
  }

  struct NftConfigurationMap {
    //bit 0-15: LTV
    //bit 16-31: Liq. threshold
    //bit 32-47: Liq. bonus
    //bit 56: NFT is active
    //bit 57: NFT is frozen
    uint256 data;
  }

  struct ExecuteWithdrawParams {
    address initiator;
    address asset;
    uint256 amount;
    address to;
  }

  struct ExecuteStakeParams {
    address initiator;
    address nftAsset;
    uint256 nftTokenId;
    address onBehalfOf;
  }
}
