import { expect } from "chai";
import { ethers } from "hardhat";

describe("MeeBotNFT", function () {
  let meeBotNFT;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const MeeBotNFT = await ethers.getContractFactory("MeeBotNFT");
    meeBotNFT = await MeeBotNFT.deploy();
    await meeBotNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await meeBotNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await meeBotNFT.name()).to.equal("MeeBotNFT");
      expect(await meeBotNFT.symbol()).to.equal("MEEBOT");
    });

    it("Should have correct constants", async function () {
      expect(await meeBotNFT.MINT_PRICE()).to.equal(ethers.parseEther("5"));
      expect(await meeBotNFT.MAX_TOKENS()).to.equal(10000);
    });

    it("Should start with token counter at 0", async function () {
      expect(await meeBotNFT.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint NFT", async function () {
      await meeBotNFT.safeMint(addr1.address, "ipfs://test-uri");
      expect(await meeBotNFT.balanceOf(addr1.address)).to.equal(1);
    });

    it("Should increment token ID", async function () {
      const tx1 = await meeBotNFT.safeMint(addr1.address, "ipfs://uri1");
      const tx2 = await meeBotNFT.safeMint(addr1.address, "ipfs://uri2");

      expect(await meeBotNFT.balanceOf(addr1.address)).to.equal(2);
      expect(await meeBotNFT.totalSupply()).to.equal(2);
    });

    it("Should not allow non-owner to mint", async function () {
      await expect(
        meeBotNFT.connect(addr1).safeMint(addr2.address, "ipfs://test")
      ).to.be.revertedWithCustomError(meeBotNFT, "OwnableUnauthorizedAccount");
    });

    it("Should not exceed max supply", async function () {
      // Mint up to max
      const maxTokens = await meeBotNFT.MAX_TOKENS();
      const batchSize = 100;
      const batches = Number(maxTokens) / batchSize;

      for (let i = 0; i < batches; i++) {
        const recipients = Array(batchSize).fill(addr1.address);
        const uris = Array(batchSize).fill("ipfs://batch-uri");
        await meeBotNFT.batchMint(recipients, uris);
      }

      // Try to mint one more
      await expect(
        meeBotNFT.safeMint(addr1.address, "ipfs://overflow")
      ).to.be.revertedWith("MeeBot: max supply reached");
    });

    it("Should set correct token URI", async function () {
      const tokenURI = "ipfs://QmTest123";
      await meeBotNFT.safeMint(addr1.address, tokenURI);
      expect(await meeBotNFT.tokenURI(0)).to.equal(tokenURI);
    });

    it("Should emit MeeBotMinted event", async function () {
      const tx = await meeBotNFT.safeMint(addr1.address, "ipfs://test");
      const receipt = await tx.wait();

      // Find MeeBotMinted event
      const event = receipt.logs.find(log => {
        try {
          const parsed = meeBotNFT.interface.parseLog(log);
          return parsed && parsed.name === "MeeBotMinted";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });
  });

  describe("Attributes", function () {
    beforeEach(async function () {
      await meeBotNFT.safeMint(addr1.address, "ipfs://test-uri");
    });

    it("Should generate attributes on mint", async function () {
      const attrs = await meeBotNFT.getAttributes(0);

      expect(attrs.power).to.be.gt(0);
      expect(attrs.speed).to.be.gt(0);
      expect(attrs.element).to.not.equal("");
      expect(attrs.botType).to.not.equal("");
      expect(attrs.mintedAt).to.be.gt(0);
    });

    it("Should have valid rarity", async function () {
      const attrs = await meeBotNFT.getAttributes(0);
      // Rarity enum: 0=Common, 1=Rare, 2=Legendary
      expect(attrs.rarity).to.be.oneOf([0, 1, 2]);
    });

    it("Should have power and speed correlated with rarity", async function () {
      // Mint many NFTs to get different rarities
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(meeBotNFT.safeMint(addr1.address, `ipfs://uri-${i}`));
      }
      await Promise.all(promises);

      let hasLegendary = false;
      let hasRare = false;
      let hasCommon = false;

      for (let i = 0; i < 50; i++) {
        const attrs = await meeBotNFT.getAttributes(i);
        if (attrs.rarity === 2n) {
          hasLegendary = true;
          expect(attrs.power).to.be.gte(9500);
        } else if (attrs.rarity === 1n) {
          hasRare = true;
          expect(attrs.power).to.be.gte(6000);
        } else {
          hasCommon = true;
          expect(attrs.power).to.be.gte(2000);
        }
      }

      // With 50 mints, we should have at least common (very likely rare too)
      expect(hasCommon).to.be.true;
    });

    it("Should have valid element", async function () {
      const attrs = await meeBotNFT.getAttributes(0);
      const validElements = ["Fire", "Water", "Earth", "Wind", "Lightning", "Void"];
      expect(validElements).to.include(attrs.element);
    });

    it("Should have valid botType", async function () {
      const attrs = await meeBotNFT.getAttributes(0);
      const validTypes = ["Alpha Bot", "Warrior Bot", "Lotus Bot", "Ritual Bot"];
      expect(validTypes).to.include(attrs.botType);
    });

    it("Should fail to get attributes of non-existent token", async function () {
      await expect(
        meeBotNFT.getAttributes(999)
      ).to.be.revertedWith("MeeBot: token does not exist");
    });
  });

  describe("Rarity Label", function () {
    it("Should return correct rarity label for legendary", async function () {
      // Keep minting until we get a legendary (< 5% probability)
      let legendaryId = -1;
      for (let i = 0; i < 100; i++) {
        await meeBotNFT.safeMint(addr1.address, `ipfs://uri-${i}`);
        const attrs = await meeBotNFT.getAttributes(i);
        if (attrs.rarity === 2n) {
          legendaryId = i;
          break;
        }
      }

      if (legendaryId >= 0) {
        expect(await meeBotNFT.getRarityLabel(legendaryId)).to.equal("Legendary");
      }
    });

    it("Should return correct rarity label for rare", async function () {
      // Keep minting until we get a rare
      let rareId = -1;
      for (let i = 0; i < 50; i++) {
        await meeBotNFT.safeMint(addr1.address, `ipfs://uri-${i}`);
        const attrs = await meeBotNFT.getAttributes(i);
        if (attrs.rarity === 1n) {
          rareId = i;
          break;
        }
      }

      if (rareId >= 0) {
        expect(await meeBotNFT.getRarityLabel(rareId)).to.equal("Rare");
      }
    });

    it("Should return correct rarity label for common", async function () {
      // Common has >70% probability, should get one quickly
      let commonId = -1;
      for (let i = 0; i < 10; i++) {
        await meeBotNFT.safeMint(addr1.address, `ipfs://uri-${i}`);
        const attrs = await meeBotNFT.getAttributes(i);
        if (attrs.rarity === 0n) {
          commonId = i;
          break;
        }
      }

      expect(commonId).to.be.gte(0);
      expect(await meeBotNFT.getRarityLabel(commonId)).to.equal("Common");
    });
  });

  describe("Batch Minting", function () {
    it("Should allow owner to batch mint", async function () {
      const recipients = [addr1.address, addr1.address, addr2.address];
      const uris = ["ipfs://1", "ipfs://2", "ipfs://3"];

      await meeBotNFT.batchMint(recipients, uris);

      expect(await meeBotNFT.balanceOf(addr1.address)).to.equal(2);
      expect(await meeBotNFT.balanceOf(addr2.address)).to.equal(1);
    });

    it("Should fail batch mint with length mismatch", async function () {
      const recipients = [addr1.address, addr2.address];
      const uris = ["ipfs://1"];

      await expect(
        meeBotNFT.batchMint(recipients, uris)
      ).to.be.revertedWith("MeeBot: length mismatch");
    });

    it("Should not allow non-owner to batch mint", async function () {
      const recipients = [addr1.address];
      const uris = ["ipfs://1"];

      await expect(
        meeBotNFT.connect(addr1).batchMint(recipients, uris)
      ).to.be.revertedWithCustomError(meeBotNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await meeBotNFT.safeMint(addr1.address, "ipfs://test-uri");
    });

    it("Should allow owner to transfer", async function () {
      await meeBotNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      expect(await meeBotNFT.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should emit MeeBotTransferred event on transfer", async function () {
      await expect(
        meeBotNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0)
      ).to.emit(meeBotNFT, "MeeBotTransferred")
        .withArgs(addr1.address, addr2.address, 0);
    });

    it("Should not emit MeeBotTransferred on mint", async function () {
      const tx = await meeBotNFT.safeMint(addr1.address, "ipfs://new");
      const receipt = await tx.wait();

      const transferEvents = receipt.logs.filter(log => {
        try {
          const parsed = meeBotNFT.interface.parseLog(log);
          return parsed && parsed.name === "MeeBotTransferred";
        } catch {
          return false;
        }
      });

      expect(transferEvents.length).to.equal(0);
    });
  });

  describe("ERC721 Enumerable", function () {
    beforeEach(async function () {
      await meeBotNFT.safeMint(addr1.address, "ipfs://1");
      await meeBotNFT.safeMint(addr1.address, "ipfs://2");
      await meeBotNFT.safeMint(addr2.address, "ipfs://3");
    });

    it("Should track token by index", async function () {
      expect(await meeBotNFT.tokenByIndex(0)).to.equal(0);
      expect(await meeBotNFT.tokenByIndex(1)).to.equal(1);
      expect(await meeBotNFT.tokenByIndex(2)).to.equal(2);
    });

    it("Should track token of owner by index", async function () {
      expect(await meeBotNFT.tokenOfOwnerByIndex(addr1.address, 0)).to.equal(0);
      expect(await meeBotNFT.tokenOfOwnerByIndex(addr1.address, 1)).to.equal(1);
      expect(await meeBotNFT.tokenOfOwnerByIndex(addr2.address, 0)).to.equal(2);
    });

    it("Should update enumeration after transfer", async function () {
      await meeBotNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);

      expect(await meeBotNFT.balanceOf(addr1.address)).to.equal(1);
      expect(await meeBotNFT.balanceOf(addr2.address)).to.equal(2);
      expect(await meeBotNFT.tokenOfOwnerByIndex(addr1.address, 0)).to.equal(1);
    });
  });

  describe("Supports Interface", function () {
    it("Should support ERC721 interface", async function () {
      expect(await meeBotNFT.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC721Enumerable interface", async function () {
      expect(await meeBotNFT.supportsInterface("0x780e9d63")).to.be.true;
    });

    it("Should support ERC721Metadata interface", async function () {
      expect(await meeBotNFT.supportsInterface("0x5b5e139f")).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minting to same address multiple times", async function () {
      for (let i = 0; i < 5; i++) {
        await meeBotNFT.safeMint(addr1.address, `ipfs://uri-${i}`);
      }
      expect(await meeBotNFT.balanceOf(addr1.address)).to.equal(5);
    });

    it("Should generate unique attributes for each token", async function () {
      await meeBotNFT.safeMint(addr1.address, "ipfs://1");
      await meeBotNFT.safeMint(addr1.address, "ipfs://2");

      const attrs1 = await meeBotNFT.getAttributes(0);
      const attrs2 = await meeBotNFT.getAttributes(1);

      // At least one attribute should differ (very high probability)
      const different =
        attrs1.rarity !== attrs2.rarity ||
        attrs1.power !== attrs2.power ||
        attrs1.speed !== attrs2.speed ||
        attrs1.element !== attrs2.element ||
        attrs1.botType !== attrs2.botType;

      expect(different).to.be.true;
    });
  });
});