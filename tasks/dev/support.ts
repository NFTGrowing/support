import { task } from "hardhat/config";
import { deploySupport } from "../../helpers/contracts-deployments";
import { eContractid } from "../../helpers/types";
import { waitForTx } from "../../helpers/misc-utils";
import { getCBPAddressesProvider, getSupport } from "../../helpers/contracts-getters";
import { insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";

task("dev:deploy-support", "Deploy lend pool for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    await localBRE.run("set-DRE");
    const addressesProvider = await getCBPAddressesProvider();
    // const poolConfig = loadPoolConfig(pool);

    const SupportImpl = await deploySupport();
    await waitForTx(await addressesProvider.setSupportImpl(SupportImpl.address, []));
    // configurator will create proxy for implement
    const SupportAddress = await addressesProvider.getSupport();
    const supportProxy = await getSupport(SupportAddress);
    await insertContractAddressInDb(eContractid.Support, supportProxy.address);
  });
