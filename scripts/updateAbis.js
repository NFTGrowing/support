const fs = require("fs")
const path = require("path");

const protocolContractList = [
  "Support",
  "CopyrightRegistry",
  "CBPAddressesProvider",
];

const interfacesContractList = ["ISupport", "ICopyrightRegistry", "ICBPAddressesProvider"];

const updateAbis = async (subDir, contractList) => {
  contractList.forEach((contract) => {
    const artifact = require(`../artifacts/contracts/${subDir}/${contract}.sol/${contract}.json`);
    const { abi } = artifact;

    const configStringified = JSON.stringify(abi, null, 2);
    console.log("Getting ABI for contract: ", contract);
    const abiPath = `../abis/${contract}.json`;
    fs.writeFileSync(path.join(__dirname, abiPath), configStringified);
  });
};

function deleteFolderRecursive(directoryPath) {
    if (fs.existsSync(directoryPath)) {
        fs.rmSync(directoryPath, {recursive: true})
    }
}

deleteFolderRecursive("../abis");

updateAbis("protocol", protocolContractList).then().catch();
updateAbis("interfaces", interfacesContractList).then().catch();
