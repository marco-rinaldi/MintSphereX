import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { MintSphereNFT, MintSphereNFT__factory } from "../types";

describe("MintSphereNFT", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let contract: MintSphereNFT;
  let contractAddress: string;

  before(async function () {
    const [d, a, b] = await ethers.getSigners();
    deployer = d;
    alice = a;
    bob = b;
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("MintSphereNFT tests require the mock FHEVM (run on hardhat network)");
      this.skip();
    }

    const factory = (await ethers.getContractFactory("MintSphereNFT")) as MintSphereNFT__factory;
    contract = (await factory.deploy("MintSphere", "SPHERE", "https://mint-sphere.example/api/token/")) as MintSphereNFT;
    contractAddress = await contract.getAddress();
  });

  async function decryptSphere(tokenId: bigint, signer: HardhatEthersSigner) {
    const ciphertext = await contract.getSphereCiphertext(tokenId);
    return fhevm.userDecryptEuint(FhevmType.euint16, ciphertext, contractAddress, signer);
  }

  it("mints a sphere and stores encrypted metadata", async function () {
    const tx = await contract.connect(alice).mintSphere();
    await tx.wait();

    const ownedTokens = await contract.tokensOfOwner(alice.address);
    expect(ownedTokens).to.have.lengthOf(1);
    expect(ownedTokens[0]).to.equal(1n);

    const totalSupply = await contract.totalSupply();
    expect(totalSupply).to.equal(1n);

    const decrypted = await decryptSphere(1n, alice);
    expect(decrypted).to.be.gte(1n);
    expect(decrypted).to.be.lte(100n);

    const metadata = await contract.getTokenMetadata(1n);
    expect(metadata[0]).to.be.gt(0n);
    expect(metadata[1]).to.contain("https://mint-sphere.example/api/token/");
  });

  it("only the contract owner can mint for another address", async function () {
    await expect(contract.connect(alice).mintSphereFor(bob.address)).to.be.revertedWith(
      "MintSphereNFT: caller is not the owner",
    );

    await expect(contract.connect(deployer).mintSphereFor(bob.address)).to.emit(contract, "SphereMinted");
    const bobTokens = await contract.tokensOfOwner(bob.address);
    expect(bobTokens).to.deep.equal([1n]);
  });

  it("grants ACL to the new owner on transfer", async function () {
    await contract.connect(alice).mintSphere();
    await contract.connect(alice).transferFrom(alice.address, bob.address, 1n);

    const decryptedByBob = await decryptSphere(1n, bob);
    expect(decryptedByBob).to.be.gte(1n);
    expect(decryptedByBob).to.be.lte(100n);

    const bobTokens = await contract.tokensOfOwner(bob.address);
    expect(bobTokens[0]).to.equal(1n);
  });
});
