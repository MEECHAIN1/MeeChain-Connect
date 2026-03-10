// ===== MeeChain Dashboard - Chart Manager =====

let priceChartInstance = null;

const ChartManager = {
  init() {
    this.initPriceChart('1D');
    this.bindPeriodButtons();
  },

  initPriceChart(period) {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;

    const { labels, data } = MEECHAIN_DATA.generateChartData(period);

    if (priceChartInstance) {
      priceChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.4)');
    gradient.addColorStop(0.5, 'rgba(124, 58, 237, 0.15)');
    gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');

    priceChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'MEE Price (USDT)',
          data,
          borderColor: '#7C3AED',
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#7C3AED',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderColor: '#1F2E47',
            borderWidth: 1,
            titleColor: '#94A3B8',
            bodyColor: '#F1F5F9',
            padding: 10,
            callbacks: {
              label: (ctx) => `  ราคา: ${ctx.raw.toFixed(5)} USDT`,
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(31,46,71,0.5)', drawBorder: false },
            ticks: { color: '#64748B', font: { size: 11, family: 'Kanit' } }
          },
          y: {
            position: 'right',
            grid: { color: 'rgba(31,46,71,0.5)', drawBorder: false },
            ticks: {
              color: '#64748B',
              font: { size: 11, family: 'Kanit' },
              callback: (val) => val.toFixed(4)
            }
          }
        },
        animation: {
          duration: 800,
          easing: 'easeInOutCubic'
        }
      }
    });
  },

  bindPeriodButtons() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.initPriceChart(btn.dataset.period);
      });
    });
  }
};
