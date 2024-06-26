import { task } from "hardhat/config";
import { deployCopyrightRegistry } from "../../helpers/contracts-deployments";
import { eContractid } from "../../helpers/types";
import { waitForTx } from "../../helpers/misc-utils";
import {
  getCopyrightRegistry,
  getServiceSigner,
  getDeploySigner,
  getCBPAddressesProviderProxy,
  getConfiguratorSigner,
} from "../../helpers/contracts-getters";
import { insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";

task("dev:deploy-copyrightregistry", "Deploy CopyrightRegistry contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");

    const addressesProvider = await getCBPAddressesProviderProxy();
    console.log("addressesProvider is:", addressesProvider.address);
    // const poolConfig = loadPoolConfig(pool);

    const copyrightRegistryImpl = await deployCopyrightRegistry();

    await waitForTx(await addressesProvider.setCopyrightRegistryImpl(copyrightRegistryImpl.address, []));
    // configurator will create proxy for implement
    const copyrightRegistry = await addressesProvider.getCopyrightRegistry();
    const copyrightRegistryProxy = await getCopyrightRegistry(copyrightRegistry);
    await insertContractAddressInDb(eContractid.CopyrightRegistryProxy, copyrightRegistryProxy.address);
  });

task("dev:set-serviceSignAddr", "set-serviceSignAddr")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    const copyrightRegistry = await getCopyrightRegistry();
    console.log("copyrightRegistry is", copyrightRegistry.address);

    console.log("Setup the service sign address");
    const serviceSigner = await getServiceSigner();
    // const registryAdmin = await getDeploySigner();
    const configuratorSigner = await getConfiguratorSigner();
    await waitForTx(
      await copyrightRegistry.connect(configuratorSigner).setServiceSignAddr(await serviceSigner.getAddress())
    );
  });
