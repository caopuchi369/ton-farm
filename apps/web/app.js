const cropMeta = {
  carrot: { label: "Carrot", icon: "🥕", sprout: "🌱", mid: "🥬" },
  tomato: { label: "Tomato", icon: "🍅", sprout: "🌱", mid: "🌿" },
  strawberry: { label: "Strawberry", icon: "🍓", sprout: "🌱", mid: "🌸" }
};

const cropToken = {
  symbol: "CROP",
  address: "EQC5oSYf6vio61OmqVosJiEdpZhoHhKOjH6HQd4HoQvYQQcP",
  network: "TON mainnet",
  description:
    "CROP is the governance token for TON Farm. It can also be considered a meme token, possessing no practical utility or intrinsic value."
};

let state = null;
let config = null;
let economy = null;
let walletConnected = false;
let walletAddress = "";
let tonConnectUI = null;
let scenePulse = "";

const screens = [...document.querySelectorAll(".screen")];
const tabButtons = [...document.querySelectorAll(".tabs button")];
const toastEl = document.querySelector("#toast");

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

function fmtMs(ms) {
  if (ms <= 0) return "Ready";
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function shortAddress(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function tonviewerLink(address) {
  return `https://tonviewer.com/${address}`;
}

async function api(path, body) {
  const options = body
    ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
    : {};
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  state = data;
  render();
  return data;
}

async function getConfig() {
  const res = await fetch("/api/config");
  config = await res.json();
  return config;
}

async function getEconomy() {
  const res = await fetch("/api/economy");
  economy = await res.json();
  return economy;
}

function getTonConnect() {
  if (tonConnectUI || !window.TON_CONNECT_UI || !config) return tonConnectUI;
  tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
    manifestUrl: `${location.origin}/tonconnect-manifest.json`
  });
  tonConnectUI.uiOptions = {
      language: "en",
    actionsConfiguration: {
      twaReturnUrl: config.telegramReturnUrl || undefined,
      returnStrategy: "back"
    },
    uiPreferences: {
      borderRadius: "m"
    }
  };
  tonConnectUI.onStatusChange((wallet) => {
    walletConnected = Boolean(wallet);
    walletAddress = wallet?.account?.address || "";
    document.querySelector("#connectWallet").textContent = walletConnected ? shortAddress(walletAddress) : "TON Connect";
    render();
  });
  tonConnectUI.connectionRestored.then(() => {
    walletConnected = tonConnectUI.connected;
    walletAddress = tonConnectUI.account?.address || "";
    document.querySelector("#connectWallet").textContent = walletConnected ? shortAddress(walletAddress) : "TON Connect";
    render();
  });
  return tonConnectUI;
}

async function requireTonConnect() {
  const connector = getTonConnect();
  if (!connector) throw new Error("TON Connect UI is still loading");
  if (!connector.connected) {
    await connector.openModal();
    throw new Error("Please finish connecting in the wallet modal first");
  }
  return connector;
}

async function sendTonPayment({ amountTon, label }) {
  if (!config?.tonTreasuryAddress) {
    throw new Error("TON_TREASURY_ADDRESS is not configured yet");
  }
  const connector = await requireTonConnect();
  const amountNano = BigInt(Math.round(Number(amountTon) * 1_000_000_000)).toString();
  const tx = {
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: config.tonTreasuryAddress,
        amount: amountNano
      }
    ]
  };
  const result = await connector.sendTransaction(tx, { skipRedirectToWallet: "ios" });
  toast(`${label} sent for wallet signature`);
  return result;
}

function seedOptions() {
  return state.inventory
    .filter((item) => item.type === "SeedPack" && item.quantity > 0)
    .map((item) => `<option value="${item.crop}">${item.name} x${item.quantity}</option>`)
    .join("");
}

function petSprite(pet) {
  if (!pet) return "🐕";
  return pet.species === "cat" ? "🐈" : pet.species === "chicken" ? "🐓" : "🐕";
}

function cropStage(slot) {
  if (slot.status === "empty") return "empty";
  if (slot.ready) return "ready";
  const total = Math.max(1, slot.readyAt - slot.plantedAt);
  const progress = 1 - slot.remainingMs / total;
  if (progress > 0.66) return "mid";
  return "sprout";
}

function cropVisual(slot) {
  const crop = cropMeta[slot.cropType] || cropMeta.carrot;
  const stage = cropStage(slot);
  if (stage === "empty") return "🟫";
  if (stage === "sprout") return crop.sprout;
  if (stage === "mid") return crop.mid;
  return crop.icon;
}

function cropProgress(slot) {
  if (slot.status === "empty") return 0;
  if (slot.ready) return 100;
  const total = Math.max(1, slot.readyAt - slot.plantedAt);
  return Math.max(4, Math.min(99, Math.round((1 - slot.remainingMs / total) * 100)));
}

function renderFarm() {
  const pet = state.inventory.find((item) => item.type === "Pet");
  const growing = state.farmSlots.filter((slot) => slot.status !== "empty" && !slot.ready).length;
  const readyCount = state.farmSlots.filter((slot) => slot.ready).length;
  const crates = state.inventory.filter((item) => item.type === "CropCrate").length;
  const slots = state.farmSlots
    .map((slot) => {
      const crop = cropMeta[slot.cropType] || { label: "Empty Plot", icon: "🌱" };
      const ready = slot.ready;
      const empty = slot.status === "empty";
      const stage = cropStage(slot);
      const progress = cropProgress(slot);
      return `
        <article class="plot ${stage} ${ready ? "ready" : ""}" style="--grow:${progress}%">
          <div class="plot-soil">
            <span class="plot-shadow"></span>
            <button class="crop-button" ${ready ? "" : "disabled"} onclick="${ready ? `harvest(${slot.slotId})` : ""}" aria-label="${ready ? `Harvest ${crop.label}` : "Farm plot"}">
              <span class="crop-sprite">${cropVisual(slot)}</span>
            </button>
            ${ready ? `<span class="sparkle s1">✦</span><span class="sparkle s2">✦</span>` : ""}
          </div>
          <div class="plot-meta">
            <strong>${empty ? "Empty Plot" : crop.label}</strong>
            <span>${empty ? "Pick a seed" : `${fmtMs(slot.remainingMs)} · ${slot.baseYield} yield`}</span>
          </div>
          <div class="plot-actions">
            ${
              empty
                ? `<select id="seed-${slot.slotId}">${seedOptions()}</select><button onclick="plant(${slot.slotId})">Plant</button>`
                : `<div class="growth-bar"><span></span></div>`
            }
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelector("#farm").innerHTML = `
    <div class="game-layout">
      <section class="farm-scene ${scenePulse}">
        <div class="scene-sky">
          <span class="sun"></span>
          <span class="cloud cloud-one"></span>
          <span class="cloud cloud-two"></span>
          <div class="scene-title">
            <p>Season 1 · TON Chain</p>
            <h2>My NFT Farm</h2>
          </div>
        </div>
        <div class="scene-land">
          <div class="farm-fence"></div>
          <div class="farm-grid">${slots}</div>
          <div class="pet-keeper">
            <span class="pet-sprite">${petSprite(pet)}</span>
            <span class="pet-bubble">${pet ? `Lv.${pet.level} Guarding` : "Guard Slot"}</span>
          </div>
        </div>
      </section>
      <aside class="hud-panel">
        <div class="hud-card ton-card">
          <span>Coins</span>
          <strong>${state.tonBalance.toFixed(2)} TON</strong>
        </div>
        <div class="token-card">
          <div class="token-card-head">
            <img src="/crop-logo.png" alt="CROP token logo" />
            <div>
              <span>CROP Token</span>
              <strong>${shortAddress(cropToken.address)}</strong>
            </div>
          </div>
          <p>${cropToken.description}</p>
          <div class="token-links">
            <button class="secondary compact" onclick="copyCropAddress()">Copy</button>
            <a class="token-link" href="${tonviewerLink(cropToken.address)}" target="_blank" rel="noreferrer">Tonviewer</a>
          </div>
        </div>
        <div class="hud-grid">
          <div><span>Growing</span><strong>${growing}</strong></div>
          <div><span>Ready</span><strong>${readyCount}</strong></div>
          <div><span>Crates</span><strong>${crates}</strong></div>
          <div><span>Raids</span><strong>${state.stealCountToday}/20</strong></div>
        </div>
        <div class="quest-card">
          <span class="tag">Daily Quest</span>
          <h3>Plant crops and harvest Crop Crate NFTs</h3>
          <p>${pet ? `${pet.name} guard ${pet.guardPower} / raid ${pet.stealPower} / energy ${pet.energy}/${pet.energyMax}` : "Get a pet to guard your farm"}</p>
        </div>
      </aside>
    </div>
  `;
  scenePulse = "";
}

function assetDetail(item) {
  if (item.type === "SeedPack") return `${cropMeta[item.crop].label} · ${item.quantity} left`;
  if (item.type === "CropCrate") return `${cropMeta[item.crop].label} · Qty ${item.quantity} · ${item.quality}`;
  if (item.type === "Pet") return `Lv.${item.level} · guard ${item.guardPower} · raid ${item.stealPower} · energy ${item.energy}/${item.energyMax}`;
  if (item.type === "Tool") return `${item.tool} · uses ${item.uses}`;
  if (item.type === "Land") return `${item.rarity} · ${item.slots} slots`;
  return item.id;
}

function renderBag() {
  document.querySelector("#bag").innerHTML = `
    <section class="panel">
      <h2>NFT Bag</h2>
      <div class="asset-grid">
        ${state.inventory
          .map(
            (item) => `
          <article class="asset">
            <div class="asset-icon">${item.type === "Land" ? "🧩" : item.type === "SeedPack" ? "🎒" : item.type === "Pet" ? petSprite(item) : item.type === "Tool" ? "🛠️" : "📦"}</div>
            <span class="tag">${item.type}</span>
            <h3>${item.name}</h3>
            <p class="muted">${assetDetail(item)}</p>
            <div class="market-controls">
              <input id="price-${item.id}" type="number" min="0.01" step="0.01" placeholder="TON price" />
              <button class="secondary" onclick="listNft('${item.id}')">List</button>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderPet() {
  const pets = state.inventory.filter((item) => item.type === "Pet");
  const crates = state.inventory.filter((item) => item.type === "CropCrate" && item.quantity >= 10);
  document.querySelector("#pet").innerHTML = `
    <section class="panel">
      <h2>Pets</h2>
      <div class="asset-grid">
        ${pets
          .map(
            (pet) => `
          <article class="asset">
            <div class="asset-icon">${petSprite(pet)}</div>
            <span class="tag">${pet.species}</span>
            <h3>${pet.name}</h3>
            <p>${assetDetail(pet)}</p>
            <div class="row-actions">
              <select id="feed-${pet.id}">
                ${crates.map((crate) => `<option value="${crate.id}">${crate.name} x${crate.quantity}</option>`).join("")}
              </select>
              <button class="primary" onclick="feedPet('${pet.id}')">Feed & Level Up</button>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderFriends() {
  document.querySelector("#friends").innerHTML = `
    <section class="panel">
      <h2>Friends / Raid</h2>
      <div class="friend-grid">
        ${state.friends
          .map(
            (friend) => `
          <article class="friend">
            <div class="friend-farm">
              <span>${cropMeta[friend.cropType].icon}</span>
              <small>${friend.ready ? "READY" : "GROW"}</small>
            </div>
            <span class="tag">Defense ${friend.defense}</span>
            <h3>${friend.nickname}</h3>
            <p>${cropMeta[friend.cropType].label} · ${friend.ready ? "Raidable" : "Growing"} · Raided ${friend.stolenToday}/3</p>
            <button class="primary" ${friend.ready ? "" : "disabled"} onclick="steal('${friend.id}')">Raid</button>
          </article>
        `
          )
          .join("")}
      </div>
      <h3>Raid Log</h3>
      ${state.logs
        .map((log) => `<div class="log-row">${log.target} · ${cropMeta[log.crop].label} · ${log.result} · ${log.quantity}</div>`)
        .join("")}
    </section>
  `;
}

function renderMarket() {
  const listings = state.market.filter((item) => item.status === "active");
  document.querySelector("#market").innerHTML = `
    <section class="panel">
      <h2>NFT Market</h2>
      <div class="listing-grid">
        ${
          listings.length
            ? listings
                .map(
                  (listing) => `
            <article class="listing">
              <div class="asset-icon">${listing.nft.type === "CropCrate" ? "📦" : listing.nft.type === "Tool" ? "🛠️" : "🎒"}</div>
              <span class="tag">Fee ${(listing.feeBps / 100).toFixed(0)}%</span>
              <h3>${listing.nft.name}</h3>
              <p class="muted">${assetDetail(listing.nft)}</p>
              <strong>${listing.priceTon} TON</strong>
              <div class="row-actions"><button class="primary" onclick="buy('${listing.listingId}')">Buy</button></div>
            </article>
          `
                )
                .join("")
            : `<p class="muted">No active listings yet. List an NFT from your bag.</p>`
        }
      </div>
    </section>
  `;
}

function renderWallet() {
  const connectedAddress = walletAddress || state.walletAddress;
  const contracts = config?.contracts || {};
  const configuredContracts = Object.values(contracts).filter(Boolean).length;
  const marketplaceFee = economy ? `${(economy.fees.marketplaceBps / 100).toFixed(0)}%` : "2%";
  document.querySelector("#wallet").innerHTML = `
    <section class="panel">
      <h2>Wallet</h2>
      <div class="stat-grid">
        <div class="stat">Status<strong>${walletConnected ? "Connected" : "Not connected"}</strong></div>
        <div class="stat">Address<strong>${shortAddress(connectedAddress)}</strong></div>
        <div class="stat">Balance<strong>${state.tonBalance.toFixed(2)} TON</strong></div>
        <div class="stat">Contracts<strong>${configuredContracts}/4 set</strong></div>
      </div>
      <div class="wallet-actions">
        <button class="primary" onclick="connectWallet()">Connect / Switch Wallet</button>
        <button class="secondary" onclick="sendTestPayment()">Test Pay 0.01 TON</button>
        <button class="danger" onclick="disconnectWallet()" ${walletConnected ? "" : "disabled"}>Disconnect</button>
      </div>
      <div class="official-token">
        <div class="official-token-main">
          <img src="/crop-logo.png" alt="CROP token logo" />
          <div>
            <span class="tag">Official Token</span>
            <h3>CROP</h3>
            <p>${cropToken.description}</p>
          </div>
        </div>
        <div class="token-address-row">
          <span>${cropToken.network}</span>
          <code>${cropToken.address}</code>
        </div>
        <div class="wallet-actions">
          <button class="secondary" onclick="copyCropAddress()">Copy CROP Address</button>
          <a class="token-link button-link" href="${tonviewerLink(cropToken.address)}" target="_blank" rel="noreferrer">Open Tonviewer</a>
        </div>
      </div>
      <div class="chain-note">
        <span class="tag">Chain Config</span>
        <p>Manifest: ${location.origin}/tonconnect-manifest.json</p>
        <p>Treasury: ${config?.tonTreasuryAddress ? shortAddress(config.tonTreasuryAddress) : "TON_TREASURY_ADDRESS not configured"}</p>
        <p>Network: ${config?.tonNetwork || "mainnet"} · Economy: ${economy?.version || config?.economyVersion || "mvp-season-1"}</p>
        <p>Market fee: ${marketplaceFee} · GameAssetCollection: ${shortAddress(contracts.gameAssetCollection)}</p>
        <p>GameManager: ${shortAddress(contracts.gameManager)} · Marketplace: ${shortAddress(contracts.marketplace)}</p>
        <p>Telegram return: ${config?.telegramReturnUrl || "TELEGRAM_RETURN_URL not configured"}</p>
      </div>
      <h3>Recent Claims</h3>
      ${state.claims
        .slice(0, 4)
        .map((claim) => `<div class="log-row">${claim.crop} x${claim.quantity} · nonce ${claim.nonce}</div>`)
        .join("")}
    </section>
  `;
}

function render() {
  if (!state) return;
  renderFarm();
  renderBag();
  renderPet();
  renderFriends();
  renderMarket();
  renderWallet();
}

window.plant = async (slotId) => {
  const cropType = document.querySelector(`#seed-${slotId}`)?.value;
  if (!cropType) return toast("No seed packs available");
  try {
    await api("/api/plant", { slotId, cropType });
    scenePulse = "pulse-plant";
    render();
    toast("Planted");
  } catch (error) {
    toast(error.message);
  }
};

window.harvest = async (slotId) => {
  try {
    await api("/api/harvest", { slotId });
    scenePulse = "pulse-harvest";
    render();
    toast("Harvested. Crop Crate NFT and claim created");
  } catch (error) {
    toast(error.message);
  }
};

window.steal = async (friendId) => {
  try {
    await api("/api/steal", { friendId });
    scenePulse = "pulse-steal";
    render();
    toast("Pet raid finished");
  } catch (error) {
    toast(error.message);
  }
};

window.feedPet = async (petId) => {
  const crateId = document.querySelector(`#feed-${petId}`)?.value;
  if (!crateId) return toast("You need a crop crate with at least 10 crops");
  try {
    await api("/api/feed-pet", { petId, crateId });
    toast("Pet leveled up. Demo spent 0.03 TON");
  } catch (error) {
    toast(error.message);
  }
};

window.listNft = async (nftId) => {
  const priceTon = document.querySelector(`#price-${nftId}`)?.value;
  try {
    await api("/api/list", { nftId, priceTon });
    toast("NFT listed in marketplace escrow");
  } catch (error) {
    toast(error.message);
  }
};

window.buy = async (listingId) => {
  try {
    await api("/api/buy", { listingId });
    toast("Purchase complete. NFT moved to bag");
  } catch (error) {
    toast(error.message);
  }
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((item) => item.classList.toggle("active", item === button));
    screens.forEach((screen) => screen.classList.toggle("active", screen.id === button.dataset.tab));
  });
});

document.querySelector("#connectWallet").addEventListener("click", () => {
  window.connectWallet();
});

window.connectWallet = async () => {
  try {
    const connector = getTonConnect();
    if (!connector) throw new Error("TON Connect UI failed to load. Check network or CDN access");
    await connector.openModal();
  } catch (error) {
    toast(error.message);
  }
};

window.disconnectWallet = async () => {
  try {
    const connector = getTonConnect();
    if (connector?.connected) await connector.disconnect();
    walletConnected = false;
    walletAddress = "";
    document.querySelector("#connectWallet").textContent = "TON Connect";
    render();
    toast("Wallet disconnected");
  } catch (error) {
    toast(error.message);
  }
};

window.sendTestPayment = async () => {
  try {
    await sendTonPayment({ amountTon: 0.01, label: "0.01 TON test payment" });
  } catch (error) {
    toast(error.message);
  }
};

window.copyCropAddress = async () => {
  try {
    await navigator.clipboard.writeText(cropToken.address);
    toast("CROP address copied");
  } catch {
    toast(cropToken.address);
  }
};

await getConfig();
await getEconomy();
getTonConnect();
api("/api/state");
setInterval(() => api("/api/state").catch(() => {}), 1000);
