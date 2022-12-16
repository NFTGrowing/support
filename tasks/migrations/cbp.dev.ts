import { task } from "hardhat/config";
import { checkVerification } from "../../helpers/etherscan-verification";
import { ConfigNames } from "../../helpers/configuration";
import { printContracts } from "../../helpers/misc-utils";

task("cbp:dev", "Deploy development enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    const POOL_NAME = ConfigNames.Bend;

    await localBRE.run("set-DRE");

    // Prevent loss of gas verifying all the needed ENVs for Etherscan verification
    if (verify) {
      checkVerification();
    }

    console.log("\n\nMigration started");
    //////////////////////////////////////////////////////////////////////////
    console.log("\n\nDeploy mock reserves");
    await localBRE.run("dev:deploy-mock-reserves", { verify });

    //////////////////////////////////////////////////////////////////////////
    console.log("\n\nDeploy address provider");
    await localBRE.run("dev:deploy-address-provider", { verify, pool: POOL_NAME });

    //////////////////////////////////////////////////////////////////////////
    console.log("\n\nDeploy lend pool");
    await localBRE.run("dev:deploy-support", { verify, pool: POOL_NAME });

    //////////////////////////////////////////////////////////////////////////
    console.log("\n\nInitialize lend pool");
    await localBRE.run("dev:initialize-support", { verify, pool: POOL_NAME });

    console.log("\n\nFinished migration");
    printContracts();
  });
