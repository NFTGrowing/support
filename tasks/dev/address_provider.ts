import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { deployCBPAddressesProviderImpl, deployCBUpgradeableProxy } from "../../helpers/contracts-deployments";
import { getDeploySigner, getAddressProviderProxyAdmin, getOperatorSigner } from "../../helpers/contracts-getters";
import { waitForTx } from "../../helpers/misc-utils";
import { eContractid } from "../../helpers/types";

task("dev:deploy-address-provider", "Deploy address provider for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    await localBRE.run("set-DRE");
    const poolConfig = loadPoolConfig(pool);
    const signer = await getDeploySigner();
    const operatorSigner = await getOperatorSigner();

    const admin = await signer.getAddress();
    const operatorAddr = await operatorSigner.getAddress();

    const addressesProviderImpl = await deployCBPAddressesProviderImpl(verify);
    const initEncodedData = addressesProviderImpl.interface.encodeFunctionData("initialize");

    const addressesProviderProxy = await deployCBUpgradeableProxy(
      eContractid.CBPAddressesProviderProxy,
      await (await getAddressProviderProxyAdmin()).getAddress(), //TODO: should change this address
      addressesProviderImpl.address,
      initEncodedData
    );

    await waitForTx(await addressesProviderProxy.setConfigurator(admin));
    await waitForTx(await addressesProviderProxy.setOperator(operatorAddr));
  });
