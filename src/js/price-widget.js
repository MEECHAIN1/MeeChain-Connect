// ===== MeeChain Price Widget - MintMe Integration =====

/**
 * ดึงราคา MeeChain จาก MintMe exchange
 * 
 * @async
 * @returns {Promise<Object>} ข้อมูลราคาและสถิติ
 */
async function fetchMintMePrice() {
  try {
    const response = await fetch('/api/price/mintme');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch MintMe price:', error);
    return {
      success: false,
      price: 0.0842,
      priceUSD: 0.0421,
      error: error.message
    };
  }
}

/**
 * อัปเดตราคาบน UI
 * 
 * @param {Object} priceData - ข้อมูลราคาจาก API
 * @returns {void}
 */
function updatePriceDisplay(priceData) {
  // อัปเดตราคาหลัก
  const priceElements = document.querySelectorAll('.mee-price');
  priceElements.forEach(el => {
    el.textContent = priceData.price.toFixed(4);
  });

  // อัปเดตราคา USD
  const usdElements = document.querySelectorAll('.mee-price-usd');
  usdElements.forEach(el => {
    el.textContent = `$${priceData.priceUSD.toFixed(4)}`;
  });

  // อัปเดต volume
  const volumeElements = document.querySelectorAll('.mee-volume');
  volumeElements.forEach(el => {
    el.textContent = priceData.volume24h.toLocaleString('en-US');
  });

  // แสดงสถานะ
  const statusElements = document.querySelectorAll('.price-status');
  statusElements.forEach(el => {
    if (priceData.success) {
      el.textContent = '🟢 Live';
      el.className = 'price-status live';
    } else {
      el.textContent = '🔴 Offline';
      el.className = 'price-status offline';
    }
  });

  // อัปเดต timestamp
  const timeElements = document.querySelectorAll('.price-timestamp');
  timeElements.forEach(el => {
    const time = new Date(priceData.timestamp);
    el.textContent = time.toLocaleTimeString('th-TH');
  });
}

/**
 * สร้าง Price Widget HTML
 * 
 * @returns {string} HTML string
 */
function createPriceWidget() {
  return `
    <div class="price-widget">
      <div class="price-header">
        <span class="price-token">MEE/POL</span>
        <span class="price-status">⏳ Loading...</span>
      </div>
      <div class="price-main">
        <span class="price-label">Price:</span>
        <span class="mee-price">0.0000</span>
        <span class="price-unit">POL</span>
      </div>
      <div class="price-usd">
        <span class="mee-price-usd">$0.0000</span>
      </div>
      <div class="price-volume">
        <span class="price-label">24h Volume:</span>
        <span class="mee-volume">0</span>
        <span class="price-unit">POL</span>
      </div>
      <div class="price-footer">
        <span class="price-exchange">MintMe</span>
        <span class="price-timestamp">--:--:--</span>
      </div>
      <a href="https://www.mintme.com/token/MeeChain/POL/trade" target="_blank" class="price-trade-btn">
        Trade on MintMe →
      </a>
    </div>
  `;
}

/**
 * เริ่มต้น Price Widget
 * 
 * @async
 * @returns {Promise<void>}
 */
async function initPriceWidget() {
  // ดึงราคาครั้งแรก
  const priceData = await fetchMintMePrice();
  updatePriceDisplay(priceData);

  // อัปเดตทุก 30 วินาที
  setInterval(async () => {
    const newPriceData = await fetchMintMePrice();
    updatePriceDisplay(newPriceData);
  }, 30000);

  console.log('✅ MeeChain Price Widget initialized');
}

/**
 * แสดง Price Chart (Simple)
 * 
 * @param {string} containerId - ID ของ container element
 * @returns {void}
 */
function renderPriceChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="price-chart-container">
      <div class="chart-header">
        <h3>MEE/POL Price Chart</h3>
        <span class="price-status">🟢 Live</span>
      </div>
      <div class="chart-info">
        <div class="chart-stat">
          <span class="stat-label">Current Price</span>
          <span class="stat-value mee-price">0.0000</span>
          <span class="stat-unit">POL</span>
        </div>
        <div class="chart-stat">
          <span class="stat-label">USD Value</span>
          <span class="stat-value mee-price-usd">$0.0000</span>
        </div>
        <div class="chart-stat">
          <span class="stat-label">24h Volume</span>
          <span class="stat-value mee-volume">0</span>
          <span class="stat-unit">POL</span>
        </div>
      </div>
      <div class="chart-actions">
        <a href="https://www.mintme.com/token/MeeChain/POL/trade" target="_blank" class="btn btn-primary">
          Trade on MintMe 🚀
        </a>
      </div>
    </div>
  `;
}

// Export functions
window.fetchMintMePrice = fetchMintMePrice;
window.updatePriceDisplay = updatePriceDisplay;
window.createPriceWidget = createPriceWidget;
window.initPriceWidget = initPriceWidget;
window.renderPriceChart = renderPriceChart;
