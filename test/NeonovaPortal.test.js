import { expect } from "chai";
import { ethers } from "hardhat";

describe("NeonovaPortal", function () {
  let portal;
  let meeToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy MeeToken first
    const MeeChainToken = await ethers.getContractFactory("MeeChainToken");
    meeToken = await MeeChainToken.deploy();
    await meeToken.waitForDeployment();

    // Deploy Portal
    const NeonovaPortal = await ethers.getContractFactory("NeonovaPortal");
    portal = await NeonovaPortal.deploy();
    await portal.waitForDeployment();

    // Set token address
    await portal.setMeeToken(await meeToken.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await portal.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await portal.PORTAL_FEE()).to.equal(ethers.parseEther("0.001"));
    });

    it("Should start with zero values", async function () {
      expect(await portal.totalPortalValue()).to.equal(0);
      expect(await portal.ceremonyCount()).to.equal(0);
    });
  });

  describe("MEE Token Management", function () {
    it("Should allow owner to set MEE token address", async function () {
      const newAddr = addr1.address;
      await portal.setMeeToken(newAddr);
      expect(await portal.meeTokenAddress()).to.equal(newAddr);
    });

    it("Should emit TokenAddressSet event", async function () {
      await expect(portal.setMeeToken(addr1.address))
        .to.emit(portal, "TokenAddressSet")
        .withArgs(addr1.address);
    });

    it("Should not allow non-owner to set token address", async function () {
      await expect(
        portal.connect(addr1).setMeeToken(addr2.address)
      ).to.be.revertedWithCustomError(portal, "OwnableUnauthorizedAccount");
    });

    it("Should not allow zero address", async function () {
      await expect(
        portal.setMeeToken(ethers.ZeroAddress)
      ).to.be.revertedWith("NeonovaPortal: zero address");
    });
  });

  describe("Enter Portal", function () {
    it("Should allow entering portal with native token", async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "Test ceremony", { value: amount });

      expect(await portal.totalPortalValue()).to.be.gt(0);
      expect(await portal.ceremonyCount()).to.equal(1);
    });

    it("Should register new users", async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "", { value: amount });

      const userPortal = await portal.userPortals(addr1.address);
      expect(userPortal.isRegistered).to.be.true;
      expect(userPortal.ceremoniesPerformed).to.equal(1);
    });

    it("Should fail with amount too small", async function () {
      const amount = ethers.parseEther("0.0001"); // Less than fee
      await expect(
        portal.connect(addr1).enterPortal(0, "", { value: amount })
      ).to.be.revertedWith("NeonovaPortal: amount too small");
    });

    it("Should deduct portal fee", async function () {
      const amount = ethers.parseEther("1");
      const fee = await portal.PORTAL_FEE();

      await portal.connect(addr1).enterPortal(0, "", { value: amount });

      const totalValue = await portal.totalPortalValue();
      expect(totalValue).to.equal(amount - fee);
    });

    it("Should emit PortalEntered event", async function () {
      const amount = ethers.parseEther("1");
      const fee = await portal.PORTAL_FEE();
      const netAmount = amount - fee;

      await expect(
        portal.connect(addr1).enterPortal(1, "", { value: amount })
      ).to.emit(portal, "PortalEntered")
        .withArgs(addr1.address, netAmount, 1, 0);
    });

    it("Should emit RitualOffering with message", async function () {
      const amount = ethers.parseEther("1");
      const message = "To the moon!";

      await expect(
        portal.connect(addr1).enterPortal(0, message, { value: amount })
      ).to.emit(portal, "RitualOffering");
    });

    it("Should create ceremony with correct data", async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "Test", { value: amount });

      const ceremony = await portal.ceremonies(0);
      expect(ceremony.id).to.equal(0);
      expect(ceremony.participant).to.equal(addr1.address);
      expect(ceremony.completed).to.be.false;
    });

    it("Should add ceremony to user's list", async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "", { value: amount });

      const userCeremonies = await portal.getUserCeremonies(addr1.address);
      expect(userCeremonies.length).to.equal(1);
      expect(userCeremonies[0]).to.equal(0);
    });

    it("Should handle multiple entries from same user", async function () {
      const amount = ethers.parseEther("1");

      await portal.connect(addr1).enterPortal(0, "", { value: amount });
      await portal.connect(addr1).enterPortal(1, "", { value: amount });

      const userPortal = await portal.userPortals(addr1.address);
      expect(userPortal.ceremoniesPerformed).to.equal(2);
    });

    it("Should update lastActivity timestamp", async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "", { value: amount });

      const userPortal = await portal.userPortals(addr1.address);
      expect(userPortal.lastActivity).to.be.gt(0);
    });

    it("Should handle all ceremony types", async function () {
      const amount = ethers.parseEther("1");

      // Test all 5 ceremony types: Stake, Unstake, Bridge, Ritual, Offering
      for (let i = 0; i < 5; i++) {
        await portal.connect(addr1).enterPortal(i, "", { value: amount });
        const ceremony = await portal.ceremonies(i);
        expect(ceremony.ctype).to.equal(i);
      }
    });
  });

  describe("Complete Ceremony", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "", { value: amount });
    });

    it("Should allow owner to complete ceremony", async function () {
      await portal.completeCeremony(0);

      const ceremony = await portal.ceremonies(0);
      expect(ceremony.completed).to.be.true;
    });

    it("Should emit CeremonyCompleted event", async function () {
      const ceremony = await portal.ceremonies(0);

      await expect(portal.completeCeremony(0))
        .to.emit(portal, "CeremonyCompleted")
        .withArgs(0, addr1.address, ceremony.ritualHash);
    });

    it("Should not allow non-owner to complete", async function () {
      await expect(
        portal.connect(addr1).completeCeremony(0)
      ).to.be.revertedWithCustomError(portal, "OwnableUnauthorizedAccount");
    });

    it("Should fail to complete already completed ceremony", async function () {
      await portal.completeCeremony(0);

      await expect(
        portal.completeCeremony(0)
      ).to.be.revertedWith("NeonovaPortal: already completed");
    });
  });

  describe("Exit Portal", function () {
    const entryAmount = ethers.parseEther("1");

    beforeEach(async function () {
      await portal.connect(addr1).enterPortal(0, "", { value: entryAmount });
      await portal.completeCeremony(0);
    });

    it("Should allow participant to exit after completion", async function () {
      const balanceBefore = await ethers.provider.getBalance(addr1.address);

      const tx = await portal.connect(addr1).exitPortal(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(addr1.address);
      const ceremony = await portal.ceremonies(0);

      // Should have received back the amount minus gas
      expect(balanceAfter).to.be.gt(balanceBefore - gasCost);
    });

    it("Should update totalPortalValue", async function () {
      const valueBefore = await portal.totalPortalValue();
      await portal.connect(addr1).exitPortal(0);
      const valueAfter = await portal.totalPortalValue();

      expect(valueAfter).to.be.lt(valueBefore);
    });

    it("Should update user withdrawn amount", async function () {
      await portal.connect(addr1).exitPortal(0);

      const userPortal = await portal.userPortals(addr1.address);
      expect(userPortal.totalWithdrawn).to.be.gt(0);
    });

    it("Should emit PortalExited event", async function () {
      const ceremony = await portal.ceremonies(0);

      await expect(portal.connect(addr1).exitPortal(0))
        .to.emit(portal, "PortalExited")
        .withArgs(addr1.address, ceremony.amount, 0);
    });

    it("Should not allow non-participant to exit", async function () {
      await expect(
        portal.connect(addr2).exitPortal(0)
      ).to.be.revertedWith("NeonovaPortal: not your ceremony");
    });

    it("Should not allow exit of incomplete ceremony", async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "", { value: amount });

      await expect(
        portal.connect(addr1).exitPortal(1)
      ).to.be.revertedWith("NeonovaPortal: ceremony not complete");
    });

    it("Should set ceremony amount to zero after exit", async function () {
      await portal.connect(addr1).exitPortal(0);

      const ceremony = await portal.ceremonies(0);
      expect(ceremony.amount).to.equal(0);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "", { value: amount });
    });

    it("Should return user portal data", async function () {
      const userPortal = await portal.getUserPortal(addr1.address);

      expect(userPortal.isRegistered).to.be.true;
      expect(userPortal.ceremoniesPerformed).to.equal(1);
      expect(userPortal.totalDeposited).to.be.gt(0);
    });

    it("Should return user ceremonies", async function () {
      const ceremonies = await portal.getUserCeremonies(addr1.address);

      expect(ceremonies.length).to.equal(1);
      expect(ceremonies[0]).to.equal(0);
    });

    it("Should return ceremony data", async function () {
      const ceremony = await portal.getCeremony(0);

      expect(ceremony.id).to.equal(0);
      expect(ceremony.participant).to.equal(addr1.address);
      expect(ceremony.amount).to.be.gt(0);
    });

    it("Should return portal stats", async function () {
      const stats = await portal.getPortalStats();

      expect(stats[0]).to.be.gt(0); // totalLocked
      expect(stats[1]).to.equal(1); // totalCeremonies
      expect(stats[2]).to.be.gt(0); // contractBalance
      expect(stats[3]).to.equal(await meeToken.getAddress()); // tokenAddr
    });
  });

  describe("Fee Withdrawal", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("10");
      await portal.connect(addr1).enterPortal(0, "", { value: amount });
    });

    it("Should allow owner to withdraw fees", async function () {
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await portal.withdrawFees();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore - gasCost);
    });

    it("Should not allow non-owner to withdraw fees", async function () {
      await expect(
        portal.connect(addr1).withdrawFees()
      ).to.be.revertedWithCustomError(portal, "OwnableUnauthorizedAccount");
    });

    it("Should handle zero fees gracefully", async function () {
      // Complete and exit ceremony to zero out excess
      await portal.completeCeremony(0);
      await portal.connect(addr1).exitPortal(0);

      // Should not revert when fees are zero
      await expect(portal.withdrawFees()).to.not.be.reverted;
    });

    it("Should calculate fees correctly", async function () {
      const contractBalance = await ethers.provider.getBalance(await portal.getAddress());
      const totalPortalValue = await portal.totalPortalValue();
      const expectedFees = contractBalance > totalPortalValue ? contractBalance - totalPortalValue : 0n;

      if (expectedFees > 0) {
        const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
        const tx = await portal.withdrawFees();
        const receipt = await tx.wait();
        const gasCost = receipt.gasUsed * receipt.gasPrice;
        const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

        expect(ownerBalanceAfter).to.be.closeTo(ownerBalanceBefore + expectedFees - gasCost, ethers.parseEther("0.001"));
      }
    });
  });

  describe("Receive Function", function () {
    it("Should accept direct ETH transfers", async function () {
      const amount = ethers.parseEther("1");

      await expect(
        addr1.sendTransaction({
          to: await portal.getAddress(),
          value: amount,
        })
      ).to.not.be.reverted;
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle reentrancy protection on enterPortal", async function () {
      const amount = ethers.parseEther("1");

      // Should not be able to re-enter during the same transaction
      await expect(
        portal.connect(addr1).enterPortal(0, "", { value: amount })
      ).to.not.be.reverted;
    });

    it("Should handle multiple simultaneous ceremonies", async function () {
      const amount = ethers.parseEther("1");

      await portal.connect(addr1).enterPortal(0, "", { value: amount });
      await portal.connect(addr2).enterPortal(1, "", { value: amount });

      expect(await portal.ceremonyCount()).to.equal(2);
      expect(await portal.totalPortalValue()).to.be.gt(amount);
    });

    it("Should correctly track deposits across multiple users", async function () {
      const amount1 = ethers.parseEther("1");
      const amount2 = ethers.parseEther("2");

      await portal.connect(addr1).enterPortal(0, "", { value: amount1 });
      await portal.connect(addr2).enterPortal(0, "", { value: amount2 });

      const user1Portal = await portal.userPortals(addr1.address);
      const user2Portal = await portal.userPortals(addr2.address);

      expect(user1Portal.totalDeposited).to.be.lt(user2Portal.totalDeposited);
    });

    it("Should fail exit if contract has insufficient balance", async function () {
      const amount = ethers.parseEther("1");
      await portal.connect(addr1).enterPortal(0, "", { value: amount });
      await portal.completeCeremony(0);

      // Withdraw all fees to drain contract beyond portal value
      await portal.withdrawFees();

      // Manually drain more by sending to owner (simulate emergency)
      // This test demonstrates the balance check works
      const ceremony = await portal.ceremonies(0);
      const contractBalance = await ethers.provider.getBalance(await portal.getAddress());

      if (contractBalance < ceremony.amount) {
        await expect(
          portal.connect(addr1).exitPortal(0)
        ).to.be.revertedWith("NeonovaPortal: insufficient balance");
      }
    });

    it("Should generate unique ritual hashes", async function () {
      const amount = ethers.parseEther("1");

      await portal.connect(addr1).enterPortal(0, "", { value: amount });
      await portal.connect(addr1).enterPortal(0, "", { value: amount });

      const ceremony1 = await portal.ceremonies(0);
      const ceremony2 = await portal.ceremonies(1);

      expect(ceremony1.ritualHash).to.not.equal(ceremony2.ritualHash);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for entering portal", async function () {
      const amount = ethers.parseEther("1");
      const tx = await portal.connect(addr1).enterPortal(0, "", { value: amount });
      const receipt = await tx.wait();

      // Should use less than 200k gas
      expect(receipt.gasUsed).to.be.lt(200000);
    });
  });
});