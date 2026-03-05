import { expect } from "chai";
import { ethers } from "hardhat";

describe("MeeChainToken", function () {
  let meeToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const MeeChainToken = await ethers.getContractFactory("MeeChainToken");
    meeToken = await MeeChainToken.deploy();
    await meeToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await meeToken.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await meeToken.name()).to.equal("MeeChain Token");
      expect(await meeToken.symbol()).to.equal("MEE");
    });

    it("Should mint initial supply to deployer", async function () {
      const expectedInitial = ethers.parseEther("10000000"); // 10M MEE
      expect(await meeToken.balanceOf(owner.address)).to.equal(expectedInitial);
    });

    it("Should set correct max supply", async function () {
      const expectedMax = ethers.parseEther("100000000"); // 100M MEE
      expect(await meeToken.MAX_SUPPLY()).to.equal(expectedMax);
    });

    it("Should record deployment block", async function () {
      const deployBlock = await meeToken.deployBlock();
      expect(deployBlock).to.be.gt(0);
    });

    it("Should have correct mining rate constant", async function () {
      const expectedRate = ethers.parseUnits("0.0001", 18); // 1e14
      expect(await meeToken.MINING_RATE()).to.equal(expectedRate);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await meeToken.mint(addr1.address, mintAmount);
      expect(await meeToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not exceed max supply when minting", async function () {
      const maxSupply = await meeToken.MAX_SUPPLY();
      const currentSupply = await meeToken.totalSupply();
      const toMint = maxSupply - currentSupply + ethers.parseEther("1");

      await expect(
        meeToken.mint(addr1.address, toMint)
      ).to.be.revertedWith("MEE: exceeds max supply");
    });

    it("Should not allow non-owner to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        meeToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(meeToken, "OwnableUnauthorizedAccount");
    });

    it("Should emit Minted event", async function () {
      const mintAmount = ethers.parseEther("500");
      await expect(meeToken.mint(addr1.address, mintAmount))
        .to.emit(meeToken, "Minted")
        .withArgs(addr1.address, mintAmount);
    });

    it("Should update total supply after minting", async function () {
      const initialSupply = await meeToken.totalSupply();
      const mintAmount = ethers.parseEther("2000");
      await meeToken.mint(addr1.address, mintAmount);
      expect(await meeToken.totalSupply()).to.equal(initialSupply + mintAmount);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      await meeToken.transfer(addr1.address, transferAmount);
      expect(await meeToken.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await meeToken.balanceOf(owner.address);
      await expect(
        meeToken.connect(addr1).transfer(owner.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(meeToken, "ERC20InsufficientBalance");
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await meeToken.balanceOf(owner.address);
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("50");

      await meeToken.transfer(addr1.address, amount1);
      await meeToken.transfer(addr2.address, amount2);

      const finalOwnerBalance = await meeToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance - amount1 - amount2);
      expect(await meeToken.balanceOf(addr1.address)).to.equal(amount1);
      expect(await meeToken.balanceOf(addr2.address)).to.equal(amount2);
    });

    it("Should allow zero transfers", async function () {
      await expect(meeToken.transfer(addr1.address, 0)).to.not.be.reverted;
    });
  });

  describe("Burning", function () {
    it("Should allow token burning", async function () {
      const burnAmount = ethers.parseEther("1000");
      const initialBalance = await meeToken.balanceOf(owner.address);

      await meeToken.burn(burnAmount);

      expect(await meeToken.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should reduce total supply when burning", async function () {
      const burnAmount = ethers.parseEther("500");
      const initialSupply = await meeToken.totalSupply();

      await meeToken.burn(burnAmount);

      expect(await meeToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should fail to burn more than balance", async function () {
      const balance = await meeToken.balanceOf(addr1.address);
      await expect(
        meeToken.connect(addr1).burn(balance + ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(meeToken, "ERC20InsufficientBalance");
    });
  });

  describe("Mock Price", function () {
    it("Should return correct mock price", async function () {
      const expectedPrice = ethers.parseUnits("0.0842", 18); // 842e14
      expect(await meeToken.getMockPrice()).to.equal(expectedPrice);
    });
  });

  describe("Blocks Since Deploy", function () {
    it("Should calculate blocks since deployment", async function () {
      const deployBlock = await meeToken.deployBlock();
      const currentBlock = await ethers.provider.getBlockNumber();
      const expectedBlocks = BigInt(currentBlock) - deployBlock;

      expect(await meeToken.blocksSinceDeploy()).to.equal(expectedBlocks);
    });

    it("Should increase blocks since deploy over time", async function () {
      const initial = await meeToken.blocksSinceDeploy();

      // Mine some blocks
      await ethers.provider.send("hardhat_mine", ["0x5"]); // Mine 5 blocks

      const after = await meeToken.blocksSinceDeploy();
      expect(after).to.be.gt(initial);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle transfer to self", async function () {
      const amount = ethers.parseEther("10");
      const balanceBefore = await meeToken.balanceOf(owner.address);

      await meeToken.transfer(owner.address, amount);

      expect(await meeToken.balanceOf(owner.address)).to.equal(balanceBefore);
    });

    it("Should handle minting to zero address failure", async function () {
      await expect(
        meeToken.mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(meeToken, "ERC20InvalidReceiver");
    });

    it("Should handle multiple mints approaching max supply", async function () {
      const maxSupply = await meeToken.MAX_SUPPLY();
      const currentSupply = await meeToken.totalSupply();
      const remaining = maxSupply - currentSupply;

      const chunk = remaining / 5n;
      for (let i = 0; i < 4; i++) {
        await meeToken.mint(addr1.address, chunk);
      }

      // Last chunk should succeed
      const lastChunk = remaining - (chunk * 4n);
      await expect(meeToken.mint(addr1.address, lastChunk)).to.not.be.reverted;

      // One more wei should fail
      await expect(
        meeToken.mint(addr1.address, 1)
      ).to.be.revertedWith("MEE: exceeds max supply");
    });

    it("Should maintain precision with small amounts", async function () {
      const smallAmount = 1n; // 1 wei
      await meeToken.transfer(addr1.address, smallAmount);
      expect(await meeToken.balanceOf(addr1.address)).to.equal(smallAmount);
    });
  });

  describe("Allowance and Approval", function () {
    it("Should set allowance correctly", async function () {
      const amount = ethers.parseEther("100");
      await meeToken.approve(addr1.address, amount);
      expect(await meeToken.allowance(owner.address, addr1.address)).to.equal(amount);
    });

    it("Should allow transferFrom with approval", async function () {
      const amount = ethers.parseEther("50");
      await meeToken.approve(addr1.address, amount);

      await meeToken.connect(addr1).transferFrom(owner.address, addr2.address, amount);
      expect(await meeToken.balanceOf(addr2.address)).to.equal(amount);
    });

    it("Should fail transferFrom without sufficient allowance", async function () {
      await expect(
        meeToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(meeToken, "ERC20InsufficientAllowance");
    });
  });
});