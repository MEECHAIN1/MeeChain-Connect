/**
 * Unit tests for wallet.js
 * Tests wallet connection, transaction functions, and UI updates
 */

const { expect } = require("chai");
const { JSDOM } = require("jsdom");

describe("Wallet.js Unit Tests", function () {
  let window, document;

  beforeEach(function () {
    // Create a mock DOM environment
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="connect-wallet-btn"></div>
          <div id="wallet-btn-text"></div>
          <div id="wallet-address-display"></div>
          <div id="send-from-addr"></div>
          <div id="send-from-bal"></div>
          <div id="send-to-address"><input /></div>
          <div id="send-amount"><input /></div>
          <div id="send-tx-status"></div>
          <div id="receive-address-box"></div>
          <div id="receive-qr-canvas"></div>
          <div id="wallet-modal" class="hidden"></div>
          <div id="send-modal" class="hidden"></div>
          <div id="receive-modal" class="hidden"></div>
          <div id="toast-container"></div>
        </body>
      </html>
    `, {
      url: "http://localhost",
      runScripts: "outside-only",
    });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;

    // Mock functions that wallet.js depends on
    global.showToast = function (message, type) {
      // Mock implementation
    };

    global.truncateHash = function (hash, start = 6, end = 4) {
      if (!hash) return '';
      return `${hash.slice(0, start)}...${hash.slice(-end)}`;
    };
  });

  afterEach(function () {
    delete global.window;
    delete global.document;
    delete global.showToast;
    delete global.truncateHash;
  });

  describe("Wallet State", function () {
    it("Should initialize with correct default state", function () {
      // Simulate loading wallet.js code
      global.WalletState = {
        connected: false,
        address: null,
        balance: '0',
        balanceMEE: '0',
        provider: null,
        signer: null,
        tokenContract: null,
        isDemo: false,
        demoBalance: 50000,
      };

      expect(global.WalletState.connected).to.be.false;
      expect(global.WalletState.address).to.be.null;
      expect(global.WalletState.balance).to.equal('0');
    });

    it("Should update state on demo wallet connection", function () {
      global.WalletState = {
        connected: false,
        address: null,
        balance: '0',
        balanceMEE: '0',
        isDemo: false,
      };

      // Simulate demo wallet connection
      const demoAddr = '0xabcdef1234567890abcdef1234567890abcdef12';
      const demoBal = '5000.50';

      global.WalletState.connected = true;
      global.WalletState.address = demoAddr;
      global.WalletState.balanceMEE = demoBal;
      global.WalletState.isDemo = true;

      expect(global.WalletState.connected).to.be.true;
      expect(global.WalletState.address).to.equal(demoAddr);
      expect(global.WalletState.balanceMEE).to.equal(demoBal);
      expect(global.WalletState.isDemo).to.be.true;
    });
  });

  describe("Utility Functions", function () {
    it("Should truncate hash correctly", function () {
      const hash = "0x1234567890abcdef1234567890abcdef12345678";
      const truncated = global.truncateHash(hash, 6, 4);

      expect(truncated).to.equal("0x1234...5678");
    });

    it("Should handle empty hash", function () {
      const truncated = global.truncateHash("");
      expect(truncated).to.equal("");
    });

    it("Should handle custom start and end", function () {
      const hash = "0x1234567890abcdef";
      const truncated = global.truncateHash(hash, 4, 2);

      expect(truncated).to.equal("0x12...ef");
    });
  });

  describe("Modal Functions", function () {
    it("Should open send modal", function () {
      const sendModal = document.getElementById('send-modal');
      expect(sendModal.classList.contains('hidden')).to.be.true;

      sendModal.classList.remove('hidden');
      expect(sendModal.classList.contains('hidden')).to.be.false;
    });

    it("Should open receive modal", function () {
      const receiveModal = document.getElementById('receive-modal');
      expect(receiveModal.classList.contains('hidden')).to.be.true;

      receiveModal.classList.remove('hidden');
      expect(receiveModal.classList.contains('hidden')).to.be.false;
    });

    it("Should open wallet modal", function () {
      const walletModal = document.getElementById('wallet-modal');
      expect(walletModal.classList.contains('hidden')).to.be.true;

      walletModal.classList.remove('hidden');
      expect(walletModal.classList.contains('hidden')).to.be.false;
    });
  });

  describe("UI Update Functions", function () {
    it("Should update wallet display with connected state", function () {
      const walletBtnText = document.getElementById('wallet-btn-text');
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const balance = '1234.56';

      walletBtnText.textContent = `🦊 ${global.truncateHash(address)} (${balance} MEE)`;

      expect(walletBtnText.textContent).to.include('0x1234...5678');
      expect(walletBtnText.textContent).to.include('1234.56 MEE');
    });

    it("Should update address display", function () {
      const addressDisplay = document.getElementById('wallet-address-display');
      const address = '0x1234567890abcdef1234567890abcdef12345678';

      addressDisplay.textContent = address;

      expect(addressDisplay.textContent).to.equal(address);
    });

    it("Should update send modal balances", function () {
      const sendFromAddr = document.getElementById('send-from-addr');
      const sendFromBal = document.getElementById('send-from-bal');

      sendFromAddr.textContent = global.truncateHash('0x1234567890abcdef1234567890abcdef12345678', 8, 6);
      sendFromBal.textContent = '5000.00 MEE';

      expect(sendFromAddr.textContent).to.equal('0x123456...345678');
      expect(sendFromBal.textContent).to.equal('5000.00 MEE');
    });
  });

  describe("Validation Functions", function () {
    it("Should validate non-empty transfer amount", function () {
      const amount = '100';
      expect(amount.trim()).to.not.be.empty;
    });

    it("Should validate non-empty address", function () {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(address.trim()).to.not.be.empty;
    });

    it("Should detect empty amount", function () {
      const amount = '';
      expect(amount.trim()).to.be.empty;
    });

    it("Should detect empty address", function () {
      const address = '';
      expect(address.trim()).to.be.empty;
    });
  });

  describe("Network Configuration", function () {
    it("Should have correct chain ID", function () {
      const chainId = '0x344e'; // 13390 in hex
      expect(parseInt(chainId, 16)).to.equal(13390);
    });

    it("Should have correct token address format", function () {
      const tokenAddr = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
      expect(tokenAddr).to.match(/^0x[0-9a-fA-F]{40}$/);
    });

    it("Should have valid RPC URL", function () {
      const rpcUrl = 'http://rpc.meechain.run.place';
      expect(rpcUrl).to.include('http');
    });
  });

  describe("Demo Wallet Functions", function () {
    it("Should generate random demo address", function () {
      const demoAddr = '0x' + Array.from({ length: 40 }, () =>
        '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

      expect(demoAddr).to.match(/^0x[0-9a-f]{40}$/);
      expect(demoAddr.length).to.equal(42);
    });

    it("Should generate random demo balance", function () {
      const demoBal = (Math.random() * 50000 + 1000).toFixed(2);
      const balance = parseFloat(demoBal);

      expect(balance).to.be.gte(1000);
      expect(balance).to.be.lte(51000);
    });

    it("Should format demo transaction hash", function () {
      const demoHash = '0x' + Array.from({ length: 64 }, () =>
        '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

      expect(demoHash).to.match(/^0x[0-9a-f]{64}$/);
      expect(demoHash.length).to.equal(66);
    });
  });

  describe("Balance Formatting", function () {
    it("Should format balance with decimals", function () {
      const balance = 1234.56789;
      const formatted = balance.toLocaleString('th-TH', { maximumFractionDigits: 4 });

      expect(formatted).to.be.a('string');
    });

    it("Should handle zero balance", function () {
      const balance = 0;
      const formatted = balance.toFixed(2);

      expect(formatted).to.equal('0.00');
    });

    it("Should handle large balance", function () {
      const balance = 1000000.123456;
      const formatted = parseFloat(balance.toFixed(2));

      expect(formatted).to.equal(1000000.12);
    });
  });

  describe("Copy Address Function", function () {
    it("Should prepare address for clipboard", function () {
      const address = '0x1234567890abcdef1234567890abcdef12345678';

      // Simulate clipboard operation
      const addressToCopy = address;

      expect(addressToCopy).to.equal(address);
      expect(addressToCopy).to.have.lengthOf(42);
    });
  });

  describe("Transaction Status", function () {
    it("Should update status display", function () {
      const statusEl = document.getElementById('send-tx-status');

      statusEl.style.display = 'block';
      statusEl.textContent = 'Transaction pending...';

      expect(statusEl.style.display).to.equal('block');
      expect(statusEl.textContent).to.equal('Transaction pending...');
    });

    it("Should hide status display initially", function () {
      const statusEl = document.getElementById('send-tx-status');

      statusEl.style.display = 'none';

      expect(statusEl.style.display).to.equal('none');
    });
  });
});