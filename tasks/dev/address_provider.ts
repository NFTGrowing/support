import { task } from "hardhat/config";
import { ConfigNames } from "../../helpers/configuration";
import {
  deployCBPAddressesProviderImpl,
  deployCBUpgradeableProxy,
  deployCBProxyAdmin,
} from "../../helpers/contracts-deployments";
import {
  getCBPAddressesProviderProxy,
  getOperatorSigner,
  getConfiguratorSigner,
} from "../../helpers/contracts-getters";
import { waitForTx } from "../../helpers/misc-utils";
import { eContractid } from "../../helpers/types";

task("dev:deploy-address-provider", "Deploy address provider for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  // .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    const configuratorSigner = await getConfiguratorSigner();
    const operatorSigner = await getOperatorSigner();
    //const admin = await signer.getAddress();
    const configuratorAddr = await configuratorSigner.getAddress();
    const operatorAddr = await operatorSigner.getAddress();

    //deploy proxy admin
    console.log("-> Prepare proxy admin...");
    const cbpProxyAdmin = await deployCBProxyAdmin(eContractid.CBPProxyAdmin);

    const addressesProviderImpl = await deployCBPAddressesProviderImpl(verify);
    const initEncodedData = addressesProviderImpl.interface.encodeFunctionData("initialize"); //TODO: is this necessary?

    const cbUpgradeableProxy = await deployCBUpgradeableProxy(
      eContractid.CBPAddressesProviderProxy,
      // await (await getAddressProviderProxyAdmin()).getAddress(), //TODO: should change this address
      cbpProxyAdmin.address,
      addressesProviderImpl.address,
      initEncodedData
    );
    console.log("cbpProxyAdmin.address", cbpProxyAdmin.address);

    const addressesProviderProxy = await getCBPAddressesProviderProxy(cbUpgradeableProxy.address);
    // setConfigurator

    await waitForTx(await addressesProviderProxy.setConfigurator(configuratorAddr));
    await waitForTx(await addressesProviderProxy.setOperator(operatorAddr));
    console.log("configuratorAddr", configuratorAddr);
    console.log("operatorAddr", operatorAddr);
  });
