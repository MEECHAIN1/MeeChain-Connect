import { expect } from "chai";
import { ethers } from "hardhat";

describe("Deployment Integration", function () {
  let meeToken, meeBotNFT, portal;
  let owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy all contracts like deploy-local.mjs does
    const MeeChainToken = await ethers.getContractFactory("MeeChainToken");
    meeToken = await MeeChainToken.deploy();
    await meeToken.waitForDeployment();

    const MeeBotNFT = await ethers.getContractFactory("MeeBotNFT");
    meeBotNFT = await MeeBotNFT.deploy();
    await meeBotNFT.waitForDeployment();

    const NeonovaPortal = await ethers.getContractFactory("NeonovaPortal");
    portal = await NeonovaPortal.deploy();
    await portal.waitForDeployment();

    // Set token address in portal
    await portal.setMeeToken(await meeToken.getAddress());
  });

  describe("Full Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      expect(await meeToken.getAddress()).to.be.properAddress;
      expect(await meeBotNFT.getAddress()).to.be.properAddress;
      expect(await portal.getAddress()).to.be.properAddress;
    });

    it("Should set correct initial states", async function () {
      expect(await meeToken.name()).to.equal("MeeChain Token");
      expect(await meeBotNFT.name()).to.equal("MeeBotNFT");
      expect(await portal.meeTokenAddress()).to.equal(await meeToken.getAddress());
    });

    it("Should have owner set correctly for all contracts", async function () {
      expect(await meeToken.owner()).to.equal(owner.address);
      expect(await meeBotNFT.owner()).to.equal(owner.address);
      expect(await portal.owner()).to.equal(owner.address);
    });
  });

  describe("Contract Interactions", function () {
    it("Should allow minting MEE tokens and using in portal", async function () {
      const amount = ethers.parseEther("1000");
      await meeToken.mint(addr1.address, amount);

      expect(await meeToken.balanceOf(addr1.address)).to.equal(amount);

      // User can enter portal with native tokens
      await portal.connect(addr1).enterPortal(0, "Test", { value: ethers.parseEther("1") });
      expect(await portal.ceremonyCount()).to.equal(1);
    });

    it("Should allow minting NFTs after deployment", async function () {
      await meeBotNFT.safeMint(addr1.address, "ipfs://test-uri");
      expect(await meeBotNFT.balanceOf(addr1.address)).to.equal(1);
    });

    it("Should verify token contract address in portal", async function () {
      expect(await portal.meeTokenAddress()).to.equal(await meeToken.getAddress());
    });
  });

  describe("Deployment Validation", function () {
    it("Should have correct constants set", async function () {
      expect(await meeToken.MAX_SUPPLY()).to.equal(ethers.parseEther("100000000"));
      expect(await meeBotNFT.MAX_TOKENS()).to.equal(10000);
      expect(await portal.PORTAL_FEE()).to.equal(ethers.parseEther("0.001"));
    });

    it("Should have correct initial token supply", async function () {
      const expectedInitial = ethers.parseEther("10000000");
      expect(await meeToken.totalSupply()).to.equal(expectedInitial);
      expect(await meeToken.balanceOf(owner.address)).to.equal(expectedInitial);
    });

    it("Should start with zero NFTs minted", async function () {
      expect(await meeBotNFT.totalSupply()).to.equal(0);
    });

    it("Should start with zero portal value", async function () {
      expect(await portal.totalPortalValue()).to.equal(0);
      expect(await portal.ceremonyCount()).to.equal(0);
    });
  });

  describe("Post-Deployment Configuration", function () {
    it("Should allow updating portal token address", async function () {
      const newTokenAddr = addr1.address;
      await portal.setMeeToken(newTokenAddr);
      expect(await portal.meeTokenAddress()).to.equal(newTokenAddr);
    });

    it("Should verify portal stats are accessible", async function () {
      const stats = await portal.getPortalStats();
      expect(stats.length).to.equal(4);
      expect(stats[3]).to.equal(await meeToken.getAddress());
    });
  });

  describe("End-to-End Workflow", function () {
    it("Should support complete user journey", async function () {
      // 1. Mint MEE tokens to user
      const tokenAmount = ethers.parseEther("1000");
      await meeToken.mint(addr1.address, tokenAmount);

      // 2. Mint NFT to user
      await meeBotNFT.safeMint(addr1.address, "ipfs://meebot-1");

      // 3. User enters portal
      await portal.connect(addr1).enterPortal(0, "My ritual", {
        value: ethers.parseEther("10"),
      });

      // 4. Owner completes ceremony
      await portal.completeCeremony(0);

      // 5. User exits portal
      await portal.connect(addr1).exitPortal(0);

      // Verify final state
      expect(await meeToken.balanceOf(addr1.address)).to.equal(tokenAmount);
      expect(await meeBotNFT.balanceOf(addr1.address)).to.equal(1);

      const userPortal = await portal.getUserPortal(addr1.address);
      expect(userPortal.ceremoniesPerformed).to.equal(1);
    });
  });

  describe("Contract Upgradability Checks", function () {
    it("Should allow owner to perform admin operations", async function () {
      // Token: mint
      await expect(meeToken.mint(addr1.address, ethers.parseEther("100"))).to.not.be.reverted;

      // NFT: mint
      await expect(meeBotNFT.safeMint(addr1.address, "ipfs://test")).to.not.be.reverted;

      // Portal: set token address
      await expect(portal.setMeeToken(addr1.address)).to.not.be.reverted;
    });

    it("Should prevent non-owners from admin operations", async function () {
      await expect(
        meeToken.connect(addr1).mint(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(meeToken, "OwnableUnauthorizedAccount");

      await expect(
        meeBotNFT.connect(addr1).safeMint(addr1.address, "ipfs://test")
      ).to.be.revertedWithCustomError(meeBotNFT, "OwnableUnauthorizedAccount");

      await expect(
        portal.connect(addr1).setMeeToken(addr1.address)
      ).to.be.revertedWithCustomError(portal, "OwnableUnauthorizedAccount");
    });
  });
});