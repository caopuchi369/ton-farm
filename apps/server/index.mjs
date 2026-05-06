import http from "node:http";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = fileURLToPath(new URL("../web/", import.meta.url));
const economy = JSON.parse(readFileSync(fileURLToPath(new URL("../../config/economy.json", import.meta.url)), "utf8"));
const port = Number(process.env.PORT || 4173);
const staticConfig = {
  appName: process.env.APP_NAME || "TON Farm",
  tonTreasuryAddress: process.env.TON_TREASURY_ADDRESS || "",
  tonNetwork: process.env.TON_NETWORK || "mainnet",
  telegramReturnUrl: process.env.TELEGRAM_RETURN_URL || "",
  contracts: {
    gameAssetCollection: process.env.GAME_ASSET_COLLECTION_ADDRESS || "",
    gameManager: process.env.GAME_MANAGER_ADDRESS || "",
    marketplace: process.env.MARKETPLACE_ADDRESS || "",
    treasury: process.env.TREASURY_ADDRESS || process.env.TON_TREASURY_ADDRESS || ""
  }
};

function requestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${port}`;
  const isLocal = String(host).startsWith("localhost") || String(host).startsWith("127.0.0.1");
  const proto = req.headers["x-forwarded-proto"] || (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

function appConfig(req) {
  const origin = requestOrigin(req);
  return {
    appUrl: origin,
    appName: staticConfig.appName,
    appIconUrl: `${origin}/icon.svg`,
    tonTreasuryAddress: staticConfig.tonTreasuryAddress,
    tonNetwork: staticConfig.tonNetwork,
    telegramReturnUrl: staticConfig.telegramReturnUrl,
    contracts: staticConfig.contracts,
    economyVersion: economy.version,
    marketplaceFeeBps: economy.fees.marketplaceBps
  };
}

const crops = {
  carrot: { name: "Carrot", minutes: 30, growthMs: 30 * 60 * 1000, min: 10, max: 15 },
  tomato: { name: "Tomato", minutes: 120, growthMs: 2 * 60 * 60 * 1000, min: 25, max: 40 },
  strawberry: { name: "Strawberry", minutes: 360, growthMs: 6 * 60 * 60 * 1000, min: 40, max: 70 }
};

const state = {
  users: new Map(),
  market: []
};

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
}

function now() {
  return Date.now();
}

function getUser(userId = "demo-telegram-user") {
  if (!state.users.has(userId)) {
    const user = {
      id: userId,
      telegramUserId: userId,
      walletAddress: "EQD_demo_wallet_connect_ton",
      nickname: "TON Farmer",
      tonBalance: 3.25,
      createdAt: new Date().toISOString(),
      stealCountToday: 0,
      farmSlots: Array.from({ length: 6 }, (_, slotId) => ({
        slotId,
        status: "empty",
        cropType: null,
        plantedAt: null,
        readyAt: null,
        baseYield: 0,
        stolenQuantity: 0
      })),
      inventory: [
        { id: "land_common_1", type: "Land", name: "Common Land", rarity: "Common", slots: 6, transferable: true },
        { id: "seed_carrot_1", type: "SeedPack", name: "Carrot Seed Pack", crop: "carrot", quantity: 20, transferable: true },
        { id: "pet_dog_1", type: "Pet", name: "Starter Guard Dog", species: "dog", level: 1, guardPower: 8, stealPower: 3, energy: 5, energyMax: 5, transferable: true },
        { id: "tool_fertilizer_1", type: "Tool", name: "Fertilizer", tool: "fertilizer", uses: 3, transferable: true },
        { id: "tool_watering_1", type: "Tool", name: "Watering Can", tool: "watering-can", uses: 2, transferable: true }
      ],
      claims: [],
      logs: []
    };
    state.users.set(userId, user);
  }
  return state.users.get(userId);
}

const friends = [
  { id: "friend_mina", nickname: "Mina", defense: "medium", cropType: "tomato", ready: true, stolenToday: 0 },
  { id: "friend_hao", nickname: "Hao", defense: "low", cropType: "carrot", ready: true, stolenToday: 1 },
  { id: "friend_sora", nickname: "Sora", defense: "high", cropType: "strawberry", ready: false, stolenToday: 0 }
];

function publicUser(user) {
  return {
    ...user,
    farmSlots: user.farmSlots.map((slot) => ({
      ...slot,
      remainingMs: slot.readyAt ? Math.max(0, slot.readyAt - now()) : 0,
      ready: slot.readyAt ? now() >= slot.readyAt : false
    })),
    market: state.market,
    friends
  };
}

function json(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid JSON body.");
    error.statusCode = 400;
    throw error;
  }
}

function consumeSeed(user, cropType) {
  const pack = user.inventory.find((item) => item.type === "SeedPack" && item.crop === cropType && item.quantity > 0);
  if (!pack) return null;
  pack.quantity -= 1;
  return pack;
}

function randomYield(cropType) {
  const crop = crops[cropType];
  return Math.floor(crop.min + Math.random() * (crop.max - crop.min + 1));
}

function signClaim(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function api(req, res, path) {
  const user = getUser(req.headers["x-demo-user"] || "demo-telegram-user");

  try {
    if (req.method === "GET" && path === "/api/health") {
      return json(res, 200, {
        ok: true,
        service: staticConfig.appName,
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === "GET" && path === "/api/config") {
      return json(res, 200, appConfig(req));
    }

    if (req.method === "GET" && path === "/api/economy") {
      return json(res, 200, economy);
    }

    if (req.method === "GET" && path === "/api/state") {
      return json(res, 200, publicUser(user));
    }

    if (req.method === "POST" && path === "/api/plant") {
      const body = await readBody(req);
      const crop = crops[body.cropType];
      const slot = user.farmSlots[Number(body.slotId)];
      if (!crop || !slot) return json(res, 400, { error: "Invalid crop or slot." });
      if (slot.status !== "empty") return json(res, 409, { error: "Slot is not empty." });
      const seed = consumeSeed(user, body.cropType);
      if (!seed) return json(res, 409, { error: "No seed pack quantity left." });

      slot.status = "growing";
      slot.cropType = body.cropType;
      slot.plantedAt = now();
      slot.readyAt = now() + crop.growthMs;
      slot.baseYield = randomYield(body.cropType);
      slot.stolenQuantity = 0;
      return json(res, 200, publicUser(user));
    }

  if (req.method === "POST" && path === "/api/harvest") {
    const body = await readBody(req);
    const slot = user.farmSlots[Number(body.slotId)];
    if (!slot || slot.status === "empty") return json(res, 400, { error: "Nothing planted here." });
    if (now() < slot.readyAt) return json(res, 409, { error: "Crop is not ready." });

    const pet = user.inventory.find((item) => item.type === "Pet");
    const chickenBonus = pet?.species === "chicken" ? Math.ceil(slot.baseYield * 0.05) : 0;
    const quantity = Math.max(1, slot.baseYield + chickenBonus - slot.stolenQuantity);
    const crate = {
      id: id("crate"),
      type: "CropCrate",
      name: `${crops[slot.cropType].name} Crop Crate`,
      crop: slot.cropType,
      quantity,
      quality: "Normal",
      season: 1,
      transferable: true
    };
    const claim = {
      claimId: id("claim"),
      user: user.walletAddress,
      slotId: slot.slotId,
      crop: slot.cropType,
      quantity,
      expiresAt: Math.floor((now() + 10 * 60 * 1000) / 1000),
      nonce: crypto.randomInt(100000, 999999)
    };
    claim.serverSignature = signClaim(claim);
    user.claims.unshift(claim);
    user.inventory.unshift(crate);
    Object.assign(slot, { status: "empty", cropType: null, plantedAt: null, readyAt: null, baseYield: 0, stolenQuantity: 0 });
    return json(res, 200, publicUser(user));
  }

  if (req.method === "POST" && path === "/api/steal") {
    const body = await readBody(req);
    const target = friends.find((friend) => friend.id === body.friendId);
    const pet = user.inventory.find((item) => item.type === "Pet");
    if (!target || !target.ready) return json(res, 400, { error: "Target crop is not ready." });
    if (!pet || pet.energy <= 0) return json(res, 409, { error: "Pet has no energy." });
    if (user.stealCountToday >= 20) return json(res, 429, { error: "Daily steal limit reached." });
    if (target.stolenToday >= 3) return json(res, 429, { error: "Friend steal limit reached." });

    const baseRate = target.defense === "high" ? 0.2 : target.defense === "medium" ? 0.4 : 0.7;
    const petBonus = pet.species === "cat" ? 0.15 : 0;
    const success = Math.random() < Math.min(0.9, baseRate + petBonus);
    pet.energy -= 1;
    user.stealCountToday += 1;
    target.stolenToday += 1;

    const log = {
      id: id("steal"),
      target: target.nickname,
      crop: target.cropType,
      result: success ? "success" : "blocked",
      quantity: success ? randomYield(target.cropType) : 0,
      createdAt: new Date().toISOString()
    };
    if (success) {
      user.inventory.unshift({
        id: id("stolen_crate"),
        type: "CropCrate",
        name: `Raided ${crops[target.cropType].name} Crate`,
        crop: target.cropType,
        quantity: log.quantity,
        quality: "Stolen",
        season: 1,
        transferable: true
      });
    }
    user.logs.unshift(log);
    return json(res, 200, publicUser(user));
  }

  if (req.method === "POST" && path === "/api/feed-pet") {
    const body = await readBody(req);
    const pet = user.inventory.find((item) => item.type === "Pet" && item.id === body.petId);
    const crate = user.inventory.find((item) => item.type === "CropCrate" && item.id === body.crateId);
    if (!pet || !crate) return json(res, 400, { error: "Pet or crate not found." });
    if (crate.quantity < 10) return json(res, 409, { error: "Need at least 10 crops in crate." });
    crate.quantity -= 10;
    pet.level += 1;
    pet.guardPower += pet.species === "dog" ? 3 : 1;
    pet.stealPower += pet.species === "cat" ? 3 : 1;
    pet.energyMax += 1;
    pet.energy = pet.energyMax;
    user.tonBalance = Math.max(0, user.tonBalance - 0.03);
    return json(res, 200, publicUser(user));
  }

  if (req.method === "POST" && path === "/api/list") {
    const body = await readBody(req);
    const nft = user.inventory.find((item) => item.id === body.nftId);
    const price = Number(body.priceTon);
    if (!nft || !nft.transferable || !Number.isFinite(price) || price <= 0) return json(res, 400, { error: "Invalid listing." });
    user.inventory = user.inventory.filter((item) => item.id !== nft.id);
    state.market.unshift({
      listingId: id("listing"),
      nft,
      sellerWallet: user.walletAddress,
      priceTon: price,
      feeBps: 200,
      status: "active",
      createdAt: new Date().toISOString()
    });
    return json(res, 200, publicUser(user));
  }

  if (req.method === "POST" && path === "/api/buy") {
    const body = await readBody(req);
    const listing = state.market.find((item) => item.listingId === body.listingId && item.status === "active");
    if (!listing) return json(res, 404, { error: "Listing not found." });
    if (user.tonBalance < listing.priceTon) return json(res, 409, { error: "Not enough demo TON." });
    user.tonBalance -= listing.priceTon;
    user.inventory.unshift(listing.nft);
    listing.status = "sold";
    return json(res, 200, publicUser(user));
  }

    return json(res, 404, { error: "Not found." });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || "Internal server error." });
  }
}

async function staticFile(req, res, path) {
  const clean = normalize(path === "/" ? "/index.html" : path).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, clean);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": types[extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/terms" || url.pathname === "/privacy") {
      const title = url.pathname === "/terms" ? "Terms of Use" : "Privacy Policy";
      const config = appConfig(req);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ${config.appName}</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;color:#172317}h1{color:#17643a}</style></head><body><h1>${title}</h1><p>${config.appName} is an MVP game demo. Wallet transactions require user confirmation through TON Connect. NFT minting and marketplace settlement are not production contracts until explicitly deployed and audited.</p><p>Contact the project owner for production legal documents before public launch.</p></body></html>`);
      return;
    }
    if (url.pathname === "/tonconnect-manifest.json") {
      const config = appConfig(req);
      return json(res, 200, {
        url: config.appUrl,
        name: config.appName,
        iconUrl: config.appIconUrl,
        termsOfUseUrl: `${config.appUrl}/terms`,
        privacyPolicyUrl: `${config.appUrl}/privacy`
      });
    }
    if (url.pathname.startsWith("/api/")) return api(req, res, url.pathname);
    return staticFile(req, res, url.pathname);
  })
  .listen(port, () => {
    console.log(`TON Farm MVP running at http://localhost:${port}`);
  });
