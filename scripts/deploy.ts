import { ethers } from "hardhat";

async function main() {
  const MeeChainToken = await ethers.deployContract("MeeChainToken");
  await MeeChainToken.waitForDeployment();
  console.log("MeeChainToken deployed to:", await MeeChainToken.getAddress());

  const MeeBotNFT = await ethers.deployContract("MeeBotNFT");
  await MeeBotNFT.waitForDeployment();
  console.log("MeeBotNFT deployed to:", await MeeBotNFT.getAddress());

  const NeonovaPortal = await ethers.deployContract("NeonovaPortal");
  await NeonovaPortal.waitForDeployment();
  console.log("NeonovaPortal deployed to:", await NeonovaPortal.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
