const coinsearch = document.getElementById("coinsearch");
const searchForm = document.getElementById("searchForm");
const formMessage = document.getElementById("formMessage");
const output = document.getElementById("output");

const currentPriceText = document.getElementById("currentPrice");
const maResult = document.getElementById("maResult");
const rsiResult = document.getElementById("rsiResult");
const macdResult = document.getElementById("macdResult");
const predictionResult = document.getElementById("predictionResult");

const chart1 = document.querySelector(".chart1");
const tradingViewContainer = document.getElementById("tradingViewContainer");
const customBtn = document.getElementById("showCustomChart");
const tvBtn = document.getElementById("showTradingView");
const chartType = document.getElementById("chartType");

let selectedCoinId = "bitcoin";
let selectedTvSymbol = "BINANCE:BTCUSDT";

let priceChart;
let volumeChart;
let rsiChart;
let macdChart;

const coinMap = {
  bitcoin: { id: "bitcoin", tv: "BINANCE:BTCUSDT" },
  btc: { id: "bitcoin", tv: "BINANCE:BTCUSDT" },

  ethereum: { id: "ethereum", tv: "BINANCE:ETHUSDT" },
  eth: { id: "ethereum", tv: "BINANCE:ETHUSDT" },

  solana: { id: "solana", tv: "BINANCE:SOLUSDT" },
  sol: { id: "solana", tv: "BINANCE:SOLUSDT" },

  dogecoin: { id: "dogecoin", tv: "BINANCE:DOGEUSDT" },
  doge: { id: "dogecoin", tv: "BINANCE:DOGEUSDT" },

  ripple: { id: "ripple", tv: "BINANCE:XRPUSDT" },
  xrp: { id: "ripple", tv: "BINANCE:XRPUSDT" },

  cardano: { id: "cardano", tv: "BINANCE:ADAUSDT" },
  ada: { id: "cardano", tv: "BINANCE:ADAUSDT" }
};

function getCoinInfo(input) {
  const key = input.toLowerCase().trim();
  return coinMap[key] || { id: key, tv: "BINANCE:BTCUSDT" };
}

function formatUSD(value) {
  return "$" + Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

async function printTopCoins() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1"
    );

    const data = await response.json();
    output.innerHTML = "";

    data.forEach((coin) => {
      output.innerHTML += `
        <tr>
          <td>${coin.market_cap_rank}</td>
          <td><img src="${coin.image}" alt="${coin.name}"></td>
          <td>${coin.name}</td>
          <td>${coin.symbol.toUpperCase()}</td>
        </tr>
      `;
    });
  } catch (error) {
    output.innerHTML = `<tr><td colspan="4">Failed to load coins.</td></tr>`;
  }
}

function calculateMovingAverage(prices, period) {
  const result = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;

      for (let j = i - period + 1; j <= i; j++) {
        sum += prices[j];
      }

      result.push(sum / period);
    }
  }

  return result;
}

function calculateRSI(prices, period = 14) {
  const rsi = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(null);
      continue;
    }

    let gains = 0;
    let losses = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const change = prices[j] - prices[j - 1];

      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const averageGain = gains / period;
    const averageLoss = losses / period;

    if (averageLoss === 0) {
      rsi.push(100);
    } else {
      const rs = averageGain / averageLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [];
  ema[0] = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
  }

  return ema;
}

function calculateMACD(prices) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  return prices.map((_, i) => ema12[i] - ema26[i]);
}

function predictNextPrice(prices) {
  const n = prices.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = prices[i];

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return slope * (n + 1) + intercept;
}

function createOrUpdateCharts(labels, prices, volumes, movingAverage, rsiValues, macdValues, coinName) {
  if (priceChart) priceChart.destroy();
  if (volumeChart) volumeChart.destroy();
  if (rsiChart) rsiChart.destroy();
  if (macdChart) macdChart.destroy();

  priceChart = new Chart(document.getElementById("priceCanvas"), {
    type: chartType.value,
    data: {
      labels: labels,
      datasets: [
        {
          label: `${coinName.toUpperCase()} Price`,
          data: prices,
          borderColor: "rgb(0, 255, 238)",
          backgroundColor: "rgba(0, 255, 238, 0.3)",
          tension: 0.3
        },
        {
          label: "7-Day Moving Average",
          data: movingAverage,
          borderColor: "orange",
          backgroundColor: "orange",
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  volumeChart = new Chart(document.getElementById("volumeCanvas"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Trading Volume",
          data: volumes,
          backgroundColor: "rgba(0, 255, 238, 0.5)"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  rsiChart = new Chart(document.getElementById("rsiCanvas"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "RSI",
          data: rsiValues,
          borderColor: "purple",
          backgroundColor: "purple",
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  macdChart = new Chart(document.getElementById("macdCanvas"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "MACD",
          data: macdValues,
          borderColor: "lime",
          backgroundColor: "lime",
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

async function fetchCoinData(coinInput) {
  try {
    formMessage.textContent = "Fetching data...";
    formMessage.className = "";

    const coinInfo = getCoinInfo(coinInput);
    selectedCoinId = coinInfo.id;
    selectedTvSymbol = coinInfo.tv;

    loadTradingView(selectedTvSymbol);

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${selectedCoinId}/market_chart?vs_currency=usd&days=30&interval=daily`
    );

    if (!response.ok) {
      throw new Error("Coin not found.");
    }

    const data = await response.json();

    const prices = data.prices.map((item) => item[1]);
    const volumes = data.total_volumes.map((item) => item[1]);
    const labels = data.prices.map((_, index) => `Day ${index + 1}`);

    const movingAverage = calculateMovingAverage(prices, 7);
    const rsiValues = calculateRSI(prices, 14);
    const macdValues = calculateMACD(prices);
    const prediction = predictNextPrice(prices);

    const latestPrice = prices[prices.length - 1];
    const latestMA = movingAverage[movingAverage.length - 1];
    const latestRSI = rsiValues[rsiValues.length - 1];
    const latestMACD = macdValues[macdValues.length - 1];

    currentPriceText.textContent = `Current Price: ${formatUSD(latestPrice)}`;
    maResult.textContent = `7-Day MA: ${formatUSD(latestMA)}`;
    rsiResult.textContent = `RSI: ${latestRSI.toFixed(2)}`;
    macdResult.textContent = `MACD: ${latestMACD.toFixed(2)}`;

    predictionResult.textContent =
      `Linear Regression Prediction: The estimated next price for ${selectedCoinId.toUpperCase()} is ${formatUSD(prediction)}.`;

    createOrUpdateCharts(
      labels,
      prices,
      volumes,
      movingAverage,
      rsiValues,
      macdValues,
      selectedCoinId
    );

    formMessage.textContent = `${selectedCoinId.toUpperCase()} data loaded successfully.`;
  } catch (error) {
    formMessage.textContent = "Coin not found. Try bitcoin, btc, ethereum, eth, solana, or sol.";
    predictionResult.textContent = "Prediction unavailable because the coin data could not be loaded.";
  }
}

function loadTradingView(symbol) {
  document.getElementById("tradingview_chart").innerHTML = "";

  new TradingView.widget({
    autosize: true,
    symbol: symbol,
    interval: "D",
    timezone: "Asia/Kuala_Lumpur",
    theme: "dark",
    style: "1",
    locale: "en",
    enable_publishing: false,
    allow_symbol_change: true,
    withdateranges: true,
    hide_side_toolbar: false,
    details: true,
    studies: [
      "RSI@tv-basicstudies",
      "MACD@tv-basicstudies"
    ],
    container_id: "tradingview_chart"
  });
}

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const coinInput = coinsearch.value.trim();

  if (coinInput === "") {
    formMessage.textContent = "Please enter a coin name or symbol.";
    return;
  }

  fetchCoinData(coinInput);
});

chartType.addEventListener("change", function () {
  fetchCoinData(selectedCoinId);
});

customBtn.addEventListener("click", function () {
  chart1.style.display = "block";
  tradingViewContainer.style.display = "none";

  customBtn.classList.add("active");
  tvBtn.classList.remove("active");
});

tvBtn.addEventListener("click", function () {
  chart1.style.display = "none";
  tradingViewContainer.style.display = "block";

  tvBtn.classList.add("active");
  customBtn.classList.remove("active");
});

/* PORTFOLIO */

const portfolioCoin = document.getElementById("portfolioCoin");
const portfolioQuantity = document.getElementById("portfolioQuantity");
const portfolioBuyPrice = document.getElementById("portfolioBuyPrice");
const addPortfolioBtn = document.getElementById("addPortfolioBtn");
const portfolioOutput = document.getElementById("portfolioOutput");
const portfolioMessage = document.getElementById("portfolioMessage");

function getPortfolio() {
  return JSON.parse(localStorage.getItem("cryptoPortfolio")) || [];
}

function savePortfolio(portfolio) {
  localStorage.setItem("cryptoPortfolio", JSON.stringify(portfolio));
}

async function getCurrentPrice(coinId) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
  );

  const data = await response.json();

  if (!data[coinId]) {
    throw new Error("Price not found.");
  }

  return data[coinId].usd;
}

async function displayPortfolio() {
  const portfolio = getPortfolio();
  portfolioOutput.innerHTML = "";

  for (let i = 0; i < portfolio.length; i++) {
    const item = portfolio[i];

    try {
      const currentPrice = await getCurrentPrice(item.coin);
      const profitLoss = (currentPrice - item.buyPrice) * item.quantity;
      const profitClass = profitLoss >= 0 ? "profit" : "loss";

      portfolioOutput.innerHTML += `
        <tr>
          <td>${item.coin.toUpperCase()}</td>
          <td>${item.quantity}</td>
          <td>${formatUSD(item.buyPrice)}</td>
          <td>${formatUSD(currentPrice)}</td>
          <td class="${profitClass}">${formatUSD(profitLoss)}</td>
          <td><button onclick="deletePortfolioItem(${i})">Delete</button></td>
        </tr>
      `;
    } catch {
      portfolioOutput.innerHTML += `
        <tr>
          <td>${item.coin}</td>
          <td colspan="5">Unable to load current price.</td>
        </tr>
      `;
    }
  }
}

function deletePortfolioItem(index) {
  const portfolio = getPortfolio();
  portfolio.splice(index, 1);
  savePortfolio(portfolio);
  displayPortfolio();
}

addPortfolioBtn.addEventListener("click", function () {
  const coinInput = portfolioCoin.value.trim().toLowerCase();
  const quantity = Number(portfolioQuantity.value);
  const buyPrice = Number(portfolioBuyPrice.value);

  if (coinInput === "" || quantity <= 0 || buyPrice <= 0) {
    portfolioMessage.textContent = "Please enter valid portfolio details.";
    return;
  }

  const coinInfo = getCoinInfo(coinInput);

  const portfolio = getPortfolio();

  portfolio.push({
    coin: coinInfo.id,
    quantity: quantity,
    buyPrice: buyPrice
  });

  savePortfolio(portfolio);

  portfolioMessage.textContent = "Holding added successfully.";

  portfolioCoin.value = "";
  portfolioQuantity.value = "";
  portfolioBuyPrice.value = "";

  displayPortfolio();
});

/* DEFAULT LOAD */

printTopCoins();
loadTradingView("BINANCE:BTCUSDT");
fetchCoinData("bitcoin");
displayPortfolio();