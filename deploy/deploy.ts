import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const mintSphere = await deploy("MintSphereNFT", {
    from: deployer,
    log: true,
    args: ["MintSphere", "SPHERE", "https://mint-sphere.example/api/token/"],
  });

  console.log(`MintSphereNFT contract: ${mintSphere.address}`);
};
export default func;
func.id = "deploy_mintSphere"; // id required to prevent reexecution
func.tags = ["MintSphereNFT"];
