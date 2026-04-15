import assert from "node:assert/strict";

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";
const adminSecret = process.env.ADMIN_SECRET;

if (!adminSecret) {
  console.error("ADMIN_SECRET is required to run the integration flow.");
  process.exit(1);
}

const buyerId = `it_buyer_${Date.now()}`;
const sellerId = `it_seller_${Date.now()}`;

async function request(path, options = {}) {
  const { method = "GET", query = {}, body } = options;
  const url = new URL(path, apiBaseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "x-admin-secret": adminSecret,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function waitFor(check, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
}

function findAsset(assets, symbol) {
  return assets.find((asset) => asset.symbol === symbol);
}

async function main() {
  const buyerDeposit = await request("/api/v1/wallet/deposits", {
    method: "POST",
    body: { userId: buyerId, asset: "USDT", amount: 20000 },
  });
  assert.equal(buyerDeposit.status, 201, "buyer USDT deposit should succeed");

  const sellerDeposit = await request("/api/v1/wallet/deposits", {
    method: "POST",
    body: { userId: sellerId, asset: "BTC", amount: 2 },
  });
  assert.equal(sellerDeposit.status, 201, "seller BTC deposit should succeed");

  const aggressiveBuy = await request("/api/v1/order", {
    method: "POST",
    body: {
      userId: buyerId,
      market: "BTC_USDT",
      price: "10000",
      quantity: "1",
      side: "buy",
    },
  });
  assert.equal(aggressiveBuy.status, 200, "aggressive buy order should succeed");
  assert.equal(typeof aggressiveBuy.payload.orderId, "string");

  const takingSell = await request("/api/v1/order", {
    method: "POST",
    body: {
      userId: sellerId,
      market: "BTC_USDT",
      price: "10000",
      quantity: "1",
      side: "sell",
    },
  });
  assert.equal(takingSell.status, 200, "sell order should succeed");

  await waitFor(async () => {
    const portfolio = await request("/api/v1/portfolio", {
      query: { userId: buyerId },
    });
    assert.equal(portfolio.status, 200);
    const btcAsset = findAsset(portfolio.payload.assets, "BTC");
    assert.ok(btcAsset, "buyer portfolio should contain BTC after the fill");
    assert.equal(btcAsset.balance, "1");
    return portfolio.payload;
  }, "buyer portfolio fill state");

  await waitFor(async () => {
    const txns = await request("/api/v1/wallet/transactions", {
      query: { userId: buyerId, limit: 10 },
    });
    assert.equal(txns.status, 200);
    const hasTradeEntry = txns.payload.transactions.some((txn) =>
      txn.type === "trade_credit" || txn.type === "trade_debit",
    );
    assert.ok(hasTradeEntry, "buyer wallet ledger should include trade entries");
    return txns.payload;
  }, "buyer trade ledger entries");

  const restingBuy = await request("/api/v1/order", {
    method: "POST",
    body: {
      userId: buyerId,
      market: "BTC_USDT",
      price: "50",
      quantity: "1",
      side: "buy",
    },
  });
  assert.equal(restingBuy.status, 200, "resting buy order should succeed");

  const cancelResponse = await request("/api/v1/order", {
    method: "DELETE",
    body: {
      userId: buyerId,
      orderId: restingBuy.payload.orderId,
      market: "BTC_USDT",
    },
  });
  assert.equal(cancelResponse.status, 200, "cancel order should succeed");

  await waitFor(async () => {
    const openOrders = await request("/api/v1/order/open", {
      query: { userId: buyerId, market: "BTC_USDT" },
    });
    assert.equal(openOrders.status, 200);
    const cancelledStillOpen = openOrders.payload.some(
      (order) => order.id === restingBuy.payload.orderId,
    );
    assert.equal(cancelledStillOpen, false, "cancelled order should not remain open");
    return openOrders.payload;
  }, "open orders after cancellation");

  await waitFor(async () => {
    const history = await request("/api/v1/order/history", {
      query: { userId: buyerId, market: "BTC_USDT" },
    });
    assert.equal(history.status, 200);
    const cancelledOrder = history.payload.find(
      (order) => order.id === restingBuy.payload.orderId,
    );
    assert.ok(cancelledOrder, "cancelled order should appear in order history");
    assert.equal(cancelledOrder.status, "CANCELLED");
    return history.payload;
  }, "order history after cancellation");

  await waitFor(async () => {
    const balances = await request("/api/v1/wallet/balances", {
      query: { userId: buyerId },
    });
    assert.equal(balances.status, 200);
    const usdtBalance = balances.payload.balances.find((balance) => balance.asset === "USDT");
    assert.ok(usdtBalance, "buyer should have a USDT balance row");
    assert.equal(Number(usdtBalance.available), 10000);
    assert.equal(Number(usdtBalance.locked), 0);
    return balances.payload;
  }, "buyer unlocked balance after cancellation");

  console.log("Integration flow passed.");
  console.log(`buyerId=${buyerId}`);
  console.log(`sellerId=${sellerId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
