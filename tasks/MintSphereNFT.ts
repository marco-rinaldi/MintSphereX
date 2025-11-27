import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FhevmType } from "@fhevm/hardhat-plugin";

task("task:address", "Prints the MintSphereNFT address").setAction(async (_args: TaskArguments, hre) => {
  const { deployments } = hre;
  const deployment = await deployments.get("MintSphereNFT");
  console.log(`MintSphereNFT address: ${deployment.address}`);
});

task("task:mint-sphere", "Mints a new Sphere NFT")
  .addOptionalParam("receiver", "Address that will receive the NFT (defaults to the caller)")
  .setAction(async (args: TaskArguments, hre) => {
    const { deployments, ethers } = hre;
    const deployment = await deployments.get("MintSphereNFT");
    const [signer] = await ethers.getSigners();

    const contract = await ethers.getContractAt("MintSphereNFT", deployment.address, signer);

    const tx = args.receiver ? await contract.mintSphereFor(args.receiver) : await contract.mintSphere();
    console.log(`Minting... tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Mint confirmed in block ${receipt?.blockNumber ?? 0}`);
  });

task("task:decrypt-sphere", "Decrypts a sphere value for a token ID")
  .addParam("tokenId", "Token ID to decrypt")
  .addOptionalParam("contractAddress", "MintSphereNFT contract address")
  .setAction(async (args: TaskArguments, hre) => {
    const { deployments, ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = args.contractAddress
      ? { address: args.contractAddress }
      : await deployments.get("MintSphereNFT");

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("MintSphereNFT", deployment.address);

    const ciphertext = await contract.getSphereCiphertext(args.tokenId);
    console.log(`Ciphertext handle: ${ciphertext}`);

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      ciphertext,
      deployment.address,
      signer,
    );
    console.log(`Sphere value: ${clearValue.toString()}`);
  });
