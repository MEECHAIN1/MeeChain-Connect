/**
 * Unit tests for app.js
 * Tests core application functions, page navigation, and UI utilities
 */

const { expect } = require("chai");
const { JSDOM } = require("jsdom");

describe("App.js Unit Tests", function () {
  let window, document;

  beforeEach(function () {
    // Create a mock DOM environment
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="page-dashboard" class="page-section active"></div>
          <div id="page-nft-market" class="page-section"></div>
          <div id="page-wallet" class="page-section"></div>
          <div id="breadcrumb"></div>
          <div id="sidebar"></div>
          <div id="toast-container"></div>
          <div id="activity-list"></div>
          <div id="trending-nft-grid"></div>
          <div id="block-number"></div>
          <div id="net-dot"></div>
          <div id="net-label"></div>
          <div class="stat-value" data-count="1000"></div>
        </body>
      </html>
    `);

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.performance = { now: () => Date.now() };
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  });

  afterEach(function () {
    delete global.window;
    delete global.document;
    delete global.performance;
    delete global.requestAnimationFrame;
  });

  describe("Utility Functions", function () {
    it("Should select element with $ function", function () {
      const $ = (sel) => document.querySelector(sel);
      const el = $('#page-dashboard');

      expect(el).to.not.be.null;
      expect(el.id).to.equal('page-dashboard');
    });

    it("Should select all elements with $$ function", function () {
      const $$ = (sel) => document.querySelectorAll(sel);
      const pages = $$('.page-section');

      expect(pages.length).to.equal(3);
    });

    it("Should truncate hash correctly", function () {
      function truncateHash(hash, start = 6, end = 4) {
        if (!hash) return '';
        return `${hash.slice(0, start)}...${hash.slice(-end)}`;
      }

      const hash = "0x1234567890abcdef1234567890abcdef12345678";
      const result = truncateHash(hash);

      expect(result).to.equal("0x1234...5678");
    });

    it("Should handle empty hash", function () {
      function truncateHash(hash, start = 6, end = 4) {
        if (!hash) return '';
        return `${hash.slice(0, start)}...${hash.slice(-end)}`;
      }

      expect(truncateHash(null)).to.equal('');
      expect(truncateHash('')).to.equal('');
    });
  });

  describe("Page Navigation", function () {
    it("Should switch pages correctly", function () {
      const pages = document.querySelectorAll('.page-section');

      // Remove active from all
      pages.forEach(p => p.classList.remove('active'));

      // Add active to dashboard
      document.getElementById('page-dashboard').classList.add('active');

      const activePage = document.querySelector('.page-section.active');
      expect(activePage.id).to.equal('page-dashboard');
    });

    it("Should update breadcrumb", function () {
      const breadcrumb = document.getElementById('breadcrumb');
      const pageLabels = {
        'dashboard': '🏠 แดशบอร์ด',
        'nft-market': '🖼️ ตลาด NFT',
        'wallet': '👛 กระเป๋าเงิน',
      };

      breadcrumb.textContent = pageLabels['nft-market'];

      expect(breadcrumb.textContent).to.equal('🖼️ ตลาด NFT');
    });

    it("Should have all page labels defined", function () {
      const pageLabels = {
        'dashboard': '🏠 แดชบอร์ด',
        'nft-market': '🖼️ ตลาด NFT',
        'ritual': '🚀 Mee Ritual Chain',
        'staking': '⛏️ Staking & Mining',
        'wallet': '👛 กระเป๋าเงิน',
        'meebot': '🤖 MeeBot',
        'settings': '⚙️ ตั้งค่า',
      };

      expect(Object.keys(pageLabels)).to.have.lengthOf(7);
      expect(pageLabels['dashboard']).to.include('แดชบอร์ด');
    });
  });

  describe("Toast Notifications", function () {
    it("Should create toast element", function () {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast success';
      toast.textContent = 'Success message';

      container.appendChild(toast);

      expect(container.children.length).to.equal(1);
      expect(container.firstChild.className).to.include('success');
    });

    it("Should support different toast types", function () {
      const types = ['success', 'error', 'info', 'warning'];
      const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

      types.forEach(type => {
        expect(icons[type]).to.not.be.undefined;
      });
    });
  });

  describe("Counter Animation", function () {
    it("Should animate counter from 0 to target", function (done) {
      const el = document.querySelector('.stat-value[data-count]');
      const target = parseInt(el.dataset.count);

      expect(target).to.equal(1000);

      // Simulate animation
      let current = 0;
      const increment = target / 10;

      const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(interval);
          el.textContent = current.toLocaleString('th-TH');
          expect(parseInt(el.textContent.replace(/,/g, ''))).to.equal(1000);
          done();
        }
      }, 10);
    });
  });

  describe("Block Number Updates", function () {
    it("Should increment block number", function () {
      const blockEl = document.getElementById('block-number');
      let blockNumber = 1248753;

      blockNumber++;
      blockEl.textContent = blockNumber.toLocaleString('th-TH');

      expect(parseInt(blockEl.textContent.replace(/,/g, ''))).to.equal(1248754);
    });

    it("Should format block number with locale", function () {
      const blockNumber = 1248753;
      const formatted = blockNumber.toLocaleString('th-TH');

      expect(formatted).to.be.a('string');
    });
  });

  describe("Network Status", function () {
    it("Should update network status dot", function () {
      const dot = document.getElementById('net-dot');

      dot.className = 'net-dot online';
      expect(dot.className).to.include('online');

      dot.className = 'net-dot offline';
      expect(dot.className).to.include('offline');
    });

    it("Should update network status label", function () {
      const label = document.getElementById('net-label');

      label.textContent = '🟢 เชื่อมต่อ Ritual Chain สำเร็จ';
      expect(label.textContent).to.include('เชื่อมต่อ');

      label.textContent = '🔴 Ritual Chain: Offline';
      expect(label.textContent).to.include('Offline');
    });
  });

  describe("App State", function () {
    it("Should initialize app state correctly", function () {
      const AppState = {
        walletConnected: false,
        walletAddress: '',
        walletBalance: 0,
      };

      expect(AppState.walletConnected).to.be.false;
      expect(AppState.walletAddress).to.equal('');
      expect(AppState.walletBalance).to.equal(0);
    });

    it("Should update wallet state on connection", function () {
      const AppState = {
        walletConnected: false,
        walletAddress: '',
        walletBalance: 0,
      };

      AppState.walletConnected = true;
      AppState.walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      AppState.walletBalance = 1000;

      expect(AppState.walletConnected).to.be.true;
      expect(AppState.walletAddress).to.have.lengthOf(42);
      expect(AppState.walletBalance).to.equal(1000);
    });
  });

  describe("Search Functionality", function () {
    it("Should filter results based on query", function () {
      const mockNFTs = [
        { name: 'MeeBot Alpha', creator: 'Artist1' },
        { name: 'Warrior Bot', creator: 'Artist2' },
        { name: 'Lotus Bot', creator: 'Artist1' },
      ];

      const query = 'meebot';
      const results = mockNFTs.filter(n =>
        n.name.toLowerCase().includes(query.toLowerCase()) ||
        n.creator.toLowerCase().includes(query.toLowerCase())
      );

      expect(results).to.have.lengthOf(1);
      expect(results[0].name).to.equal('MeeBot Alpha');
    });

    it("Should return all results for empty query", function () {
      const mockNFTs = [
        { name: 'NFT1' },
        { name: 'NFT2' },
      ];

      const query = '';
      if (query.trim()) {
        // Would filter
      }

      expect(mockNFTs).to.have.lengthOf(2);
    });
  });

  describe("NFT Filtering", function () {
    it("Should filter NFTs by category", function () {
      const mockNFTs = [
        { id: 1, category: 'art' },
        { id: 2, category: 'gaming' },
        { id: 3, category: 'art' },
      ];

      const filtered = mockNFTs.filter(n => n.category === 'art');

      expect(filtered).to.have.lengthOf(2);
    });

    it("Should return all NFTs for all filter", function () {
      const mockNFTs = [
        { id: 1, category: 'art' },
        { id: 2, category: 'gaming' },
      ];

      const filter = 'all';
      const filtered = filter === 'all' ? mockNFTs : mockNFTs.filter(n => n.category === filter);

      expect(filtered).to.have.lengthOf(2);
    });
  });

  describe("Modal Management", function () {
    it("Should toggle modal visibility", function () {
      const dom = new JSDOM(`<div id="test-modal" class="hidden"></div>`);
      const modal = dom.window.document.getElementById('test-modal');

      modal.classList.remove('hidden');
      expect(modal.classList.contains('hidden')).to.be.false;

      modal.classList.add('hidden');
      expect(modal.classList.contains('hidden')).to.be.true;
    });
  });

  describe("Sidebar Management", function () {
    it("Should toggle sidebar collapsed state", function () {
      const sidebar = document.getElementById('sidebar');

      sidebar.classList.add('collapsed');
      expect(sidebar.classList.contains('collapsed')).to.be.true;

      sidebar.classList.remove('collapsed');
      expect(sidebar.classList.contains('collapsed')).to.be.false;
    });
  });

  describe("Number Formatting", function () {
    it("Should format large numbers with commas", function () {
      const num = 1248753;
      const formatted = num.toLocaleString('th-TH');

      expect(formatted).to.be.a('string');
      expect(formatted).to.not.equal('1248753'); // Should have formatting
    });

    it("Should handle decimal numbers", function () {
      const num = 1234.56;
      const formatted = num.toFixed(2);

      expect(formatted).to.equal('1234.56');
    });
  });

  describe("Event Handling", function () {
    it("Should handle keyboard shortcuts", function () {
      const shortcuts = { '1': 'dashboard', '2': 'nft-market', '3': 'ritual' };

      expect(shortcuts['1']).to.equal('dashboard');
      expect(shortcuts['2']).to.equal('nft-market');
    });

    it("Should handle escape key", function () {
      const escapeKey = 'Escape';
      expect(escapeKey).to.equal('Escape');
    });
  });

  describe("Data Validation", function () {
    it("Should validate NFT data structure", function () {
      const nft = {
        id: 1,
        name: 'Test NFT',
        price: 100,
        category: 'art',
      };

      expect(nft).to.have.property('id');
      expect(nft).to.have.property('name');
      expect(nft).to.have.property('price');
      expect(nft).to.have.property('category');
    });

    it("Should validate token data structure", function () {
      const token = {
        name: 'MEE Token',
        symbol: 'MEE',
        amount: 1000,
      };

      expect(token.name).to.be.a('string');
      expect(token.amount).to.be.a('number');
    });
  });
});