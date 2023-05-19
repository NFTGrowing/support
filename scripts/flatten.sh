#!/bin/bash
set -x #echo on

mkdir ./flattened
rm -rf ./flattened/*

npx hardhat flatten contracts/protocol/Support.sol > ./flattened/Support.sol
npx hardhat flatten contracts/protocol/CopyrightRegistry.sol > ./flattened/CopyrightRegistry.sol
npx hardhat flatten contracts/protocol/CBPAddressesProvider.sol > ./flattened/CBPAddressesProvider.sol

