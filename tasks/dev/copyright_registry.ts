import { task } from "hardhat/config";
import { deployCopyrightRegistry } from "../../helpers/contracts-deployments";
import { eContractid } from "../../helpers/types";
import { waitForTx } from "../../helpers/misc-utils";
import { getCopyrightRegistry, getServiceSigner, getDeploySigner } from "../../helpers/contracts-getters";
import { insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";

task("dev:deploy-copyrightregistry", "Deploy CopyrightRegistry contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    const copyrightRegistry = await deployCopyrightRegistry();
  });

task("dev:set-serviceSignAddr", "set-serviceSignAddr")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    const copyrightRegistry = await getCopyrightRegistry();

    console.log("Setup the service sign address");
    const serviceSigner = await getServiceSigner();
    const registryAdmin = await getDeploySigner();
    await waitForTx(
      await copyrightRegistry.connect(registryAdmin).setServiceSignAddr(await serviceSigner.getAddress())
    );
  });
