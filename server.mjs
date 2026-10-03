import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { extname, join, normalize } from "node:path";
import pg from "pg";

const { Pool } = pg;

const root = process.cwd();

const loadEnvFile = () => {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
  });
};

loadEnvFile();

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT) || 8010;
const productsFile = join(root, "data", "products.json");
const ordersFile = join(root, "data", "orders.json");
const astralLogsFile = join(root, "data", "astral-logs.json");
const paymentsFile = join(root, "data", "payments.json");
const payoutsFile = join(root, "data", "payouts.json");
const fedapayLogsFile = join(root, "data", "fedapay-logs.json");
const fedapayEventsFile = join(root, "data", "fedapay-events.json");
const moneyFusionLogsFile = join(root, "data", "moneyfusion-logs.json");
const moneyFusionEventsFile = join(root, "data", "moneyfusion-events.json");
const astralBaseUrl = (process.env.ASTRAL_API_BASE_URL || "https://api.astral4gamer.com/api/reseller/v1").replace(/\/$/, "");
const astralApiKey = process.env.ASTRAL_API_KEY || "";
const astralMode = process.env.ASTRAL_MODE || "sandbox";
const astralUsdToXofRate = Math.max(1, Number(process.env.ASTRAL_USD_TO_XOF_RATE || 600));
const astralMarkupPercent = Math.max(0, Number(process.env.ASTRAL_MARKUP_PERCENT || 12));
const astralCatalogSyncIntervalMs = Math.max(60, Number(process.env.ASTRAL_CATALOG_SYNC_SECONDS || 60)) * 1000;
const astralOrderRetryIntervalMs = Math.max(60, Number(process.env.ASTRAL_ORDER_RETRY_SECONDS || 300)) * 1000;
const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || "";
const adminSessionDurationMs = Math.max(15, Number(process.env.ADMIN_SESSION_MINUTES || 480)) * 60_000;
const paymentProvider = process.env.PAYMENT_PROVIDER || "unconfigured";
const paymentSecretKey = process.env.PAYMENT_SECRET_KEY || "";
const paymentWebhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "";
const fedapayEnvironment = process.env.FEDAPAY_ENVIRONMENT === "live" ? "live" : "sandbox";
const fedapaySecretKey = process.env.FEDAPAY_SECRET_KEY || "";
const fedapayWebhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET || "";
const fedapayBaseUrl = (process.env.FEDAPAY_API_BASE_URL || (fedapayEnvironment === "live"
  ? "https://api.fedapay.com/v1"
  : "https://sandbox-api.fedapay.com/v1")).replace(/\/$/, "");
const moneyFusionPaymentUrl = String(process.env.MONEYFUSION_PAYMENT_URL || "").trim();
const moneyFusionPrivateKey = String(process.env.MONEYFUSION_PRIVATE_KEY || "").trim();
const moneyFusionWebhookSecret = String(process.env.MONEYFUSION_WEBHOOK_SECRET || "").trim();
const moneyFusionBaseUrl = String(process.env.MONEYFUSION_API_BASE_URL || "https://pay.moneyfusion.net").replace(/\/$/, "");
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const databasePool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000 }) : null;
const appBaseUrl = (process.env.APP_BASE_URL || `http://${host}:${port}`).replace(/\/$/, "");
const publicSiteUrl = (process.env.PUBLIC_SITE_URL || appBaseUrl).replace(/\/$/, "");
const secureCookies = publicSiteUrl.startsWith("https://");
const adminCookieName = secureCookies ? "__Host-silverse_admin" : "silverse_admin";
const adminSessions = new Map();
const adminLoginAttempts = new Map();
const customerCookieName = secureCookies ? "__Host-silverse_customer" : "silverse_customer";
const customerSessionDurationMs = Math.max(60, Number(process.env.CUSTOMER_SESSION_MINUTES || 43_200)) * 60_000;
const customerLoginAttempts = new Map();
const publicApiAttempts = new Map();
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const sendJson = (response, statusCode, payload, extraHeaders = {}) => {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
};

const allowPublicApiRequest = (request, response, scope, maxRequests = 20, windowMs = 15 * 60_000) => {
  const key = `${scope}:${getClientIp(request)}`;
  const now = Date.now();
  const current = publicApiAttempts.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  publicApiAttempts.set(key, entry);
  if (entry.count <= maxRequests) return true;
  sendJson(response, 429, { error: "Trop de requêtes. Réessayez dans quelques minutes." }, {
    "Retry-After": String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000)))
  });
  return false;
};

const stateKeyByFile = new Map([
  [productsFile, "products"],
  [ordersFile, "orders"],
  [astralLogsFile, "astral_logs"],
  [paymentsFile, "payments"],
  [payoutsFile, "payouts"],
  [fedapayLogsFile, "fedapay_logs"],
  [fedapayEventsFile, "fedapay_events"],
  [moneyFusionLogsFile, "moneyfusion_logs"],
  [moneyFusionEventsFile, "moneyfusion_events"]
]);

const readLocalJsonFile = async (filePath, fallback) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
};

const initializeDatabase = async () => {
  if (!databasePool) return;
  const schema = await readFile(join(root, "db", "schema.sql"), "utf8");
  await databasePool.query(schema);
  for (const [filePath, key] of stateKeyByFile) {
    const payload = await readLocalJsonFile(filePath, []);
    await databasePool.query(
      "INSERT INTO app_state (key, payload) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING",
      [key, JSON.stringify(payload)]
    );
  }
  await databasePool.query("DELETE FROM customer_sessions WHERE expires_at <= now()");
};

const readJsonFile = async (filePath, fallback) => {
  const key = stateKeyByFile.get(filePath);
  if (!databasePool || !key) return readLocalJsonFile(filePath, fallback);
  const result = await databasePool.query("SELECT payload FROM app_state WHERE key = $1", [key]);
  return result.rows[0]?.payload ?? fallback;
};

const writeJsonFile = async (filePath, data) => {
  const key = stateKeyByFile.get(filePath);
  if (!databasePool || !key) return writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
  await databasePool.query(
    "INSERT INTO app_state (key, payload, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()",
    [key, JSON.stringify(data)]
  );
};

const appendJsonLog = async (filePath, entry) => {
  const entries = await readJsonFile(filePath, []);
  entries.unshift(entry);
  await writeJsonFile(filePath, entries.slice(0, 200));
};

const readRequestBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) {
      const error = new Error("Corps de requête trop volumineux.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const parseBody = async (request) => {
  const raw = await readRequestBody(request);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
};

const parseCookies = (request) => String(request.headers.cookie || "").split(";").reduce((cookies, part) => {
  const separator = part.indexOf("=");
  if (separator === -1) return cookies;
  const key = part.slice(0, separator).trim();
  const value = part.slice(separator + 1).trim();
  if (key) cookies[key] = decodeURIComponent(value);
  return cookies;
}, {});

const safeTextEqual = (left, right) => {
  const leftDigest = createHmac("sha256", "silverse-admin-compare").update(String(left)).digest();
  const rightDigest = createHmac("sha256", "silverse-admin-compare").update(String(right)).digest();
  return timingSafeEqual(leftDigest, rightDigest);
};

const createPasswordHash = (password) => {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
};

const verifyPasswordHash = (password, passwordHash) => {
  const [algorithm, saltHex, expectedHex] = String(passwordHash).split("$");
  if (algorithm !== "scrypt" || !/^[a-f0-9]+$/i.test(saltHex || "") || !/^[a-f0-9]+$/i.test(expectedHex || "")) return false;
  const expected = Buffer.from(expectedHex, "hex");
  if (!expected.length) return false;
  const actual = scryptSync(String(password || ""), Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const verifyAdminPassword = (password) => verifyPasswordHash(password, adminPasswordHash);

const getAdminSession = (request) => {
  const token = parseCookies(request)[adminCookieName];
  const session = token ? adminSessions.get(token) : null;
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(token);
    return null;
  }
  return { ...session, token };
};

const adminCookie = (token, maxAgeSeconds = Math.floor(adminSessionDurationMs / 1000)) => [
  `${adminCookieName}=${encodeURIComponent(token)}`,
  "Path=/",
  "HttpOnly",
  "SameSite=Strict",
  secureCookies ? "Secure" : "",
  `Max-Age=${maxAgeSeconds}`
].filter(Boolean).join("; ");

const requestHasValidOrigin = (request) => {
  if (process.env.NODE_ENV !== "production") return true;
  const origin = String(request.headers.origin || "");
  try { return new URL(origin).origin === new URL(publicSiteUrl).origin; } catch { return false; }
};

const requireAdmin = (request, response) => {
  if (!adminEmail || !adminPasswordHash) {
    sendJson(response, 503, { error: "Compte administrateur non configuré sur le serveur." });
    return false;
  }
  const session = getAdminSession(request);
  if (!session) {
    sendJson(response, 401, { error: "Connexion administrateur requise." });
    return false;
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const csrfToken = String(request.headers["x-csrf-token"] || "");
    if (!requestHasValidOrigin(request) || !safeTextEqual(csrfToken, session.csrfToken)) {
      sendJson(response, 403, { error: "Vérification de sécurité invalide. Reconnectez-vous." });
      return false;
    }
  }
  request.adminSession = session;
  return true;
};

const requireStrictAdmin = requireAdmin;

const customerCookie = (token, maxAgeSeconds = Math.floor(customerSessionDurationMs / 1000)) => [
  `${customerCookieName}=${encodeURIComponent(token)}`,
  "Path=/",
  "HttpOnly",
  "SameSite=Lax",
  secureCookies ? "Secure" : "",
  `Max-Age=${maxAgeSeconds}`
].filter(Boolean).join("; ");

const hashSessionToken = (token) => createHash("sha256").update(String(token)).digest("hex");

const getCustomerSession = async (request) => {
  if (!databasePool) return null;
  const token = parseCookies(request)[customerCookieName];
  if (!token) return null;
  const result = await databasePool.query(
    `SELECT s.token_hash, s.csrf_token, s.expires_at, a.id, a.email, a.full_name, a.phone, a.role, a.created_at
     FROM customer_sessions s
     JOIN customer_accounts a ON a.id = s.account_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashSessionToken(token)]
  );
  if (!result.rows[0]) return null;
  return { ...result.rows[0], rawToken: token };
};

const createCustomerSession = async (accountId) => {
  const token = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + customerSessionDurationMs);
  await databasePool.query(
    "INSERT INTO customer_sessions (token_hash, account_id, csrf_token, expires_at) VALUES ($1, $2, $3, $4)",
    [hashSessionToken(token), accountId, csrfToken, expiresAt]
  );
  return { token, csrfToken, expiresAt };
};

const requireCustomer = async (request, response, { csrf = false } = {}) => {
  const session = await getCustomerSession(request);
  if (!session) {
    sendJson(response, 401, { error: "Connexion requise." });
    return null;
  }
  if (csrf) {
    const received = String(request.headers["x-csrf-token"] || "");
    if (!requestHasValidOrigin(request) || !safeTextEqual(received, session.csrf_token)) {
      sendJson(response, 403, { error: "Vérification de sécurité invalide." });
      return null;
    }
  }
  return session;
};

const publicAccount = (account) => ({
  id: account.id,
  email: account.email,
  fullName: account.full_name,
  phone: account.phone || "",
  createdAt: account.created_at
});

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

const registerFailedLogin = (store, key) => {
  const now = Date.now();
  const current = store.get(key);
  if (current?.blockedUntil > now) return { blocked: true, retryAfter: Math.ceil((current.blockedUntil - now) / 1000) };
  const next = !current || current.resetAt <= now ? { failures: 1, resetAt: now + 15 * 60_000, blockedUntil: 0 } : { ...current, failures: current.failures + 1 };
  if (next.failures >= 5) next.blockedUntil = now + 15 * 60_000;
  store.set(key, next);
  return { blocked: false };
};

const getClientIp = (request) => String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim();

const getFedaPayConfig = () => ({
  configured: Boolean(fedapaySecretKey && fedapayWebhookSecret && (fedapayEnvironment !== "live" || appBaseUrl.startsWith("https://"))),
  secretConfigured: Boolean(fedapaySecretKey),
  webhookConfigured: Boolean(fedapayWebhookSecret),
  httpsReady: fedapayEnvironment !== "live" || appBaseUrl.startsWith("https://"),
  environment: fedapayEnvironment,
  baseUrl: fedapayBaseUrl
});

const redactFedaPayPayload = (payload) => {
  if (!payload || typeof payload !== "object") return payload;
  const clone = JSON.parse(JSON.stringify(payload));
  if (clone.customer) {
    clone.customer = {
      provided: true,
      country: clone.customer.phone_number?.country
    };
  }
  if (clone.phone_number) clone.phone_number.number = "[redacted]";
  return clone;
};

const fedapayRequest = async (path, { method = "GET", body = null } = {}) => {
  if (!fedapaySecretKey) {
    const error = new Error("Clé secrète FedaPay non configurée sur le serveur.");
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch(`${fedapayBaseUrl}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${fedapaySecretKey}`,
      "Accept": "application/json",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text.slice(0, 500) }; }
  await appendJsonLog(fedapayLogsFile, {
    createdAt: new Date().toISOString(),
    environment: fedapayEnvironment,
    method,
    path,
    statusCode: response.status,
    request: redactFedaPayPayload(body),
    response: response.ok ? { id: payload?.id, reference: payload?.reference, status: payload?.status } : payload
  });
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `Erreur FedaPay (${response.status}).`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

const isTrustedMoneyFusionUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "moneyfusion.net" || url.hostname.endsWith(".moneyfusion.net"));
  } catch {
    return false;
  }
};

const getMoneyFusionConfig = () => ({
  configured: Boolean(isTrustedMoneyFusionUrl(moneyFusionPaymentUrl) && moneyFusionWebhookSecret && appBaseUrl.startsWith("https://")),
  paymentConfigured: isTrustedMoneyFusionUrl(moneyFusionPaymentUrl),
  payoutConfigured: Boolean(moneyFusionPrivateKey && moneyFusionWebhookSecret && appBaseUrl.startsWith("https://")),
  webhookConfigured: Boolean(moneyFusionWebhookSecret),
  httpsReady: appBaseUrl.startsWith("https://"),
  provider: "moneyfusion"
});

const moneyFusionRequest = async (url, { method = "GET", body = null, usePrivateKey = false, operation = "request" } = {}) => {
  if (!isTrustedMoneyFusionUrl(url)) {
    const error = new Error("URL Money Fusion absente ou non autorisée.");
    error.statusCode = 503;
    throw error;
  }
  if (usePrivateKey && !moneyFusionPrivateKey) {
    const error = new Error("Clé privée Money Fusion non configurée sur le serveur.");
    error.statusCode = 503;
    throw error;
  }
  const remoteResponse = await fetch(url, {
    method,
    signal: AbortSignal.timeout(20_000),
    headers: {
      "Accept": "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(usePrivateKey ? { "moneyfusion-private-key": moneyFusionPrivateKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const raw = await remoteResponse.text();
  let payload;
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { message: raw.slice(0, 300) }; }
  await appendJsonLog(moneyFusionLogsFile, {
    createdAt: new Date().toISOString(),
    operation,
    method,
    statusCode: remoteResponse.status,
    success: remoteResponse.ok && payload?.statut !== false && payload?.success !== false,
    token: payload?.token || payload?.tokenPay || payload?.data?.tokenPay || ""
  });
  if (!remoteResponse.ok || payload?.statut === false || payload?.success === false) {
    const error = new Error(payload?.message || `Erreur Money Fusion (${remoteResponse.status}).`);
    error.statusCode = remoteResponse.ok ? 502 : remoteResponse.status;
    throw error;
  }
  return payload;
};

const slugify = (value) => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const getAstralConfig = () => ({
  configured: Boolean(astralApiKey),
  baseUrl: astralBaseUrl,
  mode: astralMode
});

const redactAstralRequest = (body) => body ? {
  product_id: body.product_id,
  variation_id: body.variation_id,
  quantity: body.quantity,
  partner_reference: body.partner_reference,
  customer: body.customer ? { provided: true } : undefined,
  data: body.data ? {
    region: body.data.region || body.data.server,
    player_id: body.data.player_id || body.data.uid || body.data.user_id ? "[redacted]" : undefined,
    nickname: body.data.nickname ? "[redacted]" : undefined
  } : undefined
} : null;

const redactAstralResponse = (path, payload) => {
  if (!payload || typeof payload !== "object") return null;
  const data = payload.data || payload;
  if (path === "/products" || path.startsWith("/products/")) {
    const products = extractAstralProducts(payload);
    return { count: products.length, total: data.total ?? products.length, currentPage: data.current_page };
  }
  if (path.includes("/order/")) {
    return { data: { status: data.status, order_id: data.order_id, astral_order_id: data.astral_order_id, state: data.state, total: data.total, currency: data.currency, message: data.message } };
  }
  if (path === "/get-balance") {
    return { data: { status: data.status, api_status: data.api_status, billing_mode: data.billing_mode, wallet_enabled: data.wallet_enabled } };
  }
  return { status: data.status, success: payload.success, message: payload.message || data.message, errors: payload.errors || data.errors };
};

const astralRequest = async (path, { method = "GET", query = {}, body = null, partnerReference = "" } = {}) => {
  if (!astralApiKey) {
    const error = new Error("Clé Astral non configurée. Ajoutez ASTRAL_API_KEY dans .env.");
    error.statusCode = 503;
    throw error;
  }

  const url = new URL(`${astralBaseUrl}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    method,
    signal: AbortSignal.timeout(15_000),
    headers: {
      "Authorization": `Bearer ${astralApiKey}`,
      "Accept": "application/json",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const responseText = await response.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = { raw: responseText };
  }

  await appendJsonLog(astralLogsFile, {
    createdAt: new Date().toISOString(),
    mode: astralMode,
    method,
    path,
    statusCode: response.status,
    partnerReference,
    request: redactAstralRequest(body),
    response: redactAstralResponse(path, payload)
  });

  if (!response.ok || payload?.error || payload?.data?.error) {
    const error = new Error(hideSupplierName(payload?.message || payload?.error || payload?.data?.message || "Service momentanément indisponible."));
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return { statusCode: response.status, payload };
};

const getAstralPayloadData = (payload) => payload?.data || payload;

const mapAstralState = (state) => {
  const normalized = String(state || "").toLowerCase();
  if (["delivered", "completed", "success", "done"].includes(normalized)) return "delivered";
  if (["shipped", "sent"].includes(normalized)) return "shipped";
  if (["accepted", "processing", "running"].includes(normalized)) return "processing";
  if (["pending", "pending_balance", "queued"].includes(normalized)) return "pending";
  if (["failed", "cancelled", "canceled", "rejected"].includes(normalized)) return "cancelled";
  return "processing";
};

const astralSubmittedStates = new Set(["accepted", "processing", "running", "pending", "pending_balance", "queued", "shipped", "sent", "delivered", "completed", "success", "done"]);
const isAstralItemSubmitted = (item) => Boolean(item.fulfillment?.astralOrderId)
  || astralSubmittedStates.has(String(item.fulfillment?.state || "").toLowerCase());

const getAstralProductMeta = (product) => product.provider === "astral" || product.astral
  ? {
    provider: "astral",
    astralProductId: product.astralProductId || product.astral?.productId,
    astralVariationId: product.astralVariationId || product.astral?.variationId,
    requiresPlayerId: product.requiresPlayerId ?? product.astral?.requiresPlayerId ?? true,
    requiresRegion: product.requiresRegion ?? product.astral?.requiresRegion ?? true
  }
  : null;

const hideSupplierName = (value) => String(value || "")
  .replace(/Astral4Gamer/gi, "SILVERSE SHOP")
  .replace(/Astral/gi, "SILVERSE SHOP");

const formatProduct = (product) => {
  const {
    supplierPrice,
    supplierCurrency,
    sourceImageUrl,
    provider,
    astralProductId,
    astralVariationId,
    astralName,
    astral,
    ...safeProduct
  } = product;
  const variations = Array.isArray(product.variations)
    ? product.variations.map(({ supplierPrice: hiddenPrice, supplierCurrency: hiddenCurrency, ...variation }) => variation)
    : product.variations;
  return {
    ...safeProduct,
    brand: provider === "astral" ? "SILVERSE SHOP" : hideSupplierName(product.brand),
    badge: provider === "astral" ? "" : hideSupplierName(product.badge),
    short: hideSupplierName(product.short),
    description: hideSupplierName(product.description),
    details: Array.isArray(product.details) ? product.details.map(hideSupplierName) : product.details,
    ...(variations ? { variations } : {}),
    oldPrice: product.oldPrice || undefined,
    priceLabel: `${Number(product.price).toLocaleString("fr-FR")} ${product.currency || "FCFA"}`,
    oldPriceLabel: product.oldPrice ? `${Number(product.oldPrice).toLocaleString("fr-FR")} ${product.currency || "FCFA"}` : "",
    shippingFeeLabel: Number(product.shippingFee || 0) === 0
      ? "Gratuit"
      : `${Number(product.shippingFee).toLocaleString("fr-FR")} ${product.currency || "FCFA"}`,
    inStock: Number(product.stock || 0) > 0
  };
};

const orderStatuses = {
  pending: "Commande reçue",
  processing: "En traitement",
  prepared: "Préparée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée"
};

const trackingSteps = ["pending", "processing", "prepared", "shipped", "delivered"];

const createTrackingNumber = () => `TRK-${Date.now().toString(36).toUpperCase()}-${randomBytes(12).toString("hex").toUpperCase()}`;

const getTrackingProgress = (status) => {
  if (status === "cancelled") return 0;
  const index = trackingSteps.indexOf(status);
  return index === -1 ? 0 : Math.round((index / (trackingSteps.length - 1)) * 100);
};

const appendOrderEvent = (order, status, note, location = "SILVERSE SHOP") => {
  const nextStatus = orderStatuses[status] ? status : "processing";
  const event = {
    status: nextStatus,
    label: orderStatuses[nextStatus],
    note: String(note || orderStatuses[nextStatus]).trim(),
    location: String(location || "SILVERSE SHOP").trim(),
    createdAt: new Date().toISOString()
  };
  order.status = nextStatus;
  order.statusLabel = event.label;
  order.trackingProgress = getTrackingProgress(nextStatus);
  order.timeline = [...(order.timeline || []), event];
  return order;
};

const extractDigitalCodes = (payload) => {
  const values = [];
  const codeKey = /^(?:code|codes|gift_?code|redeem_?code|voucher(?:_?code)?|pin(?:_?code)?|serial(?:_?number)?|license_?key|activation_?key)$/i;
  const visit = (value, key = "", depth = 0) => {
    if (depth > 8 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, key, depth + 1));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([entryKey, entryValue]) => visit(entryValue, entryKey, depth + 1));
      return;
    }
    if (!codeKey.test(key)) return;
    const code = String(value).trim();
    if (code.length >= 4 && code.length <= 512) values.push(code);
  };
  visit(payload);
  return [...new Set(values)];
};

const publicOrderItemView = (item, paymentSucceeded = false) => {
  const { provider, astralProductId, astralVariationId, fulfillment, ...safeItem } = item;
  const deliveryCodes = paymentSucceeded && item.category === "giftcards"
    ? extractDigitalCodes(fulfillment?.response)
    : [];
  return {
    ...safeItem,
    ...(fulfillment ? {
      fulfillment: {
        playerId: fulfillment.playerId,
        region: fulfillment.region,
        nickname: fulfillment.nickname,
        state: fulfillment.state
      }
    } : {}),
    ...(deliveryCodes.length ? { deliveryCodes } : {})
  };
};

const publicOrderView = (order) => ({
  id: order.id,
  trackingNumber: order.trackingNumber,
  createdAt: order.createdAt,
  status: order.status,
  statusLabel: order.statusLabel || orderStatuses[order.status] || "En traitement",
  trackingProgress: order.trackingProgress ?? getTrackingProgress(order.status),
  customer: { email: order.customer?.email || "" },
  items: (order.items || []).map((item) => publicOrderItemView(item, order.payment?.status === "succeeded")),
  subtotal: order.subtotal,
  shippingTotal: order.shippingTotal,
  total: order.total,
  totalLabel: `${Number(order.total || 0).toLocaleString("fr-FR")} FCFA`,
  delivery: order.delivery ? {
    method: order.delivery.method,
    methodLabel: order.delivery.methodLabel,
    status: order.delivery.status,
    statusLabel: order.delivery.statusLabel,
    etaHours: order.delivery.etaHours,
    coordinates: order.delivery.coordinates,
    address: order.delivery.address
  } : null,
  payment: order.payment ? { id: order.payment.id, provider: order.payment.provider, status: order.payment.status } : null,
  timeline: (order.timeline || []).map((event) => ({
    ...event,
    note: hideSupplierName(event.note),
    location: /astral/i.test(String(event.location || "")) ? "SILVERSE SHOP" : event.location
  }))
});

const normalizeProductInput = (body, existingProduct = null) => {
  const name = String(body.name || existingProduct?.name || "").trim();
  const price = Number(body.price ?? existingProduct?.price);

  if (!name) return { error: "Le nom du produit est obligatoire." };
  if (!Number.isFinite(price) || price < 0) return { error: "Le prix du produit est invalide." };

  const id = String(body.id || existingProduct?.id || slugify(name)).trim();
  if (!id) return { error: "L'identifiant du produit est invalide." };

  const category = String(body.category || existingProduct?.category || "autre").trim().toLowerCase();
  const type = body.type === "digital" || existingProduct?.type === "digital" ? "digital" : "physical";
  const stock = Number(body.stock ?? existingProduct?.stock ?? (type === "digital" ? 999 : 0));
  const shippingFee = Number(body.shippingFee ?? existingProduct?.shippingFee ?? (type === "digital" ? 0 : 0));

  return {
    product: {
      id,
      name,
      brand: String(body.brand || existingProduct?.brand || "SILVERSE SHOP").trim(),
      price,
      oldPrice: body.oldPrice === "" || body.oldPrice === null || body.oldPrice === undefined
        ? undefined
        : Number(body.oldPrice),
      currency: String(body.currency || existingProduct?.currency || "FCFA").trim(),
      shippingFee: Number.isFinite(shippingFee) ? shippingFee : 0,
      media: String(body.media || existingProduct?.media || "media-blue").trim(),
      photo: String(body.photo || existingProduct?.photo || "").trim(),
      category,
      categoryLabel: String(body.categoryLabel || existingProduct?.categoryLabel || category).trim(),
      availability: String(body.availability || existingProduct?.availability || (stock > 0 ? "Disponible" : "Indisponible")).trim(),
      stock: Number.isFinite(stock) ? stock : 0,
      rating: Number(body.rating ?? existingProduct?.rating ?? 4.5),
      reviews: Number(body.reviews ?? existingProduct?.reviews ?? 0),
      badge: String(body.badge || existingProduct?.badge || "").trim(),
      type,
      provider: String(body.provider || existingProduct?.provider || "local").trim(),
      astralProductId: body.astralProductId === "" || body.astralProductId === null || body.astralProductId === undefined
        ? existingProduct?.astralProductId
        : Number(body.astralProductId),
      astralVariationId: body.astralVariationId === "" || body.astralVariationId === null || body.astralVariationId === undefined
        ? existingProduct?.astralVariationId
        : String(body.astralVariationId),
      requiresPlayerId: body.requiresPlayerId ?? existingProduct?.requiresPlayerId ?? false,
      requiresRegion: body.requiresRegion ?? existingProduct?.requiresRegion ?? false,
      short: String(body.short || existingProduct?.short || "Produit disponible sur SILVERSE SHOP.").trim(),
      description: String(body.description || existingProduct?.description || "Produit ajouté au catalogue SILVERSE SHOP.").trim(),
      details: Array.isArray(body.details) ? body.details.map(String) : existingProduct?.details || ["Paiement sécurisé", "Support disponible"]
    }
  };
};

const handleCustomerAuthApi = async (request, response, pathname) => {
  if (!databasePool) {
    sendJson(response, 503, { error: "Base de données non configurée." });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/register") {
    if (!requestHasValidOrigin(request)) {
      sendJson(response, 403, { error: "Origine refusée." });
      return true;
    }
    const ip = getClientIp(request);
    const attempt = customerLoginAttempts.get(`register:${ip}`);
    if (attempt?.blockedUntil > Date.now()) {
      sendJson(response, 429, { error: "Trop de tentatives. Réessayez plus tard." }, { "Retry-After": String(Math.ceil((attempt.blockedUntil - Date.now()) / 1000)) });
      return true;
    }
    const body = await parseBody(request);
    const fullName = String(body.fullName || "").trim().replace(/\s+/g, " ").slice(0, 120);
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim().slice(0, 32);
    const password = String(body.password || "");
    if (fullName.length < 2 || !validEmail(email) || password.length < 10 || password.length > 128) {
      registerFailedLogin(customerLoginAttempts, `register:${ip}`);
      sendJson(response, 422, { error: "Nom, e-mail valide et mot de passe d’au moins 10 caractères requis." });
      return true;
    }
    try {
      const accountId = randomUUID();
      const result = await databasePool.query(
        `INSERT INTO customer_accounts (id, email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, full_name, phone, role, created_at`,
        [accountId, email, createPasswordHash(password), fullName, phone]
      );
      customerLoginAttempts.delete(`register:${ip}`);
      const session = await createCustomerSession(accountId);
      sendJson(response, 201, {
        authenticated: true,
        account: publicAccount(result.rows[0]),
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt.toISOString()
      }, { "Set-Cookie": customerCookie(session.token) });
    } catch (error) {
      if (error.code === "23505") sendJson(response, 409, { error: "Un compte existe déjà avec cette adresse e-mail." });
      else throw error;
    }
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    if (!requestHasValidOrigin(request)) {
      sendJson(response, 403, { error: "Origine refusée." });
      return true;
    }
    const ip = getClientIp(request);
    const key = `login:${ip}`;
    const attempt = customerLoginAttempts.get(key);
    if (attempt?.blockedUntil > Date.now()) {
      sendJson(response, 429, { error: "Trop de tentatives. Réessayez plus tard." }, { "Retry-After": String(Math.ceil((attempt.blockedUntil - Date.now()) / 1000)) });
      return true;
    }
    const body = await parseBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").slice(0, 128);
    const result = validEmail(email)
      ? await databasePool.query("SELECT id, email, password_hash, full_name, phone, role, created_at FROM customer_accounts WHERE email = $1", [email])
      : { rows: [] };
    const account = result.rows[0];
    const dummyHash = "scrypt$3a3c62b7b57c09a7fdca1f1b0b4bf00c$5584510c596522f556da36fc8f405f545561c3e1f40c8b1a9cd320bf23d81c31514b4f7d98ba67540b1f93615f3f46962d86c339c1de2d0a800a66b96a128759";
    const valid = verifyPasswordHash(password, account?.password_hash || dummyHash);
    if (!account || !valid) {
      registerFailedLogin(customerLoginAttempts, key);
      sendJson(response, 401, { error: "Adresse e-mail ou mot de passe incorrect." });
      return true;
    }
    customerLoginAttempts.delete(key);
    await databasePool.query("DELETE FROM customer_sessions WHERE account_id = $1 AND expires_at <= now()", [account.id]);
    const session = await createCustomerSession(account.id);
    sendJson(response, 200, {
      authenticated: true,
      account: publicAccount(account),
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt.toISOString()
    }, { "Set-Cookie": customerCookie(session.token) });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/auth/session") {
    const session = await getCustomerSession(request);
    if (!session) {
      sendJson(response, 200, { authenticated: false });
      return true;
    }
    sendJson(response, 200, {
      authenticated: true,
      account: publicAccount(session),
      csrfToken: session.csrf_token,
      expiresAt: new Date(session.expires_at).toISOString()
    });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    const session = await requireCustomer(request, response, { csrf: true });
    if (!session) return true;
    await databasePool.query("DELETE FROM customer_sessions WHERE token_hash = $1", [session.token_hash]);
    sendJson(response, 200, { authenticated: false }, { "Set-Cookie": customerCookie("", 0) });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/account/overview") {
    const session = await requireCustomer(request, response);
    if (!session) return true;
    const [orders, products, favoriteRows] = await Promise.all([
      readJsonFile(ordersFile, []),
      readJsonFile(productsFile, []),
      databasePool.query("SELECT product_id FROM customer_favorites WHERE account_id = $1 ORDER BY created_at DESC", [session.id])
    ]);
    const accountOrders = orders.filter((order) => order.accountId === session.id || String(order.customer?.email || "").toLowerCase() === session.email);
    const favoriteIds = favoriteRows.rows.map((item) => item.product_id);
    sendJson(response, 200, {
      account: publicAccount(session),
      orders: accountOrders.map(publicOrderView),
      favorites: favoriteIds.map((id) => products.find((product) => product.id === id)).filter(Boolean).map(formatProduct)
    });
    return true;
  }

  const favoriteId = pathname.startsWith("/api/account/favorites/")
    ? decodeURIComponent(pathname.replace("/api/account/favorites/", ""))
    : "";
  if (["POST", "DELETE"].includes(request.method) && favoriteId) {
    const session = await requireCustomer(request, response, { csrf: true });
    if (!session) return true;
    if (request.method === "POST") {
      const products = await readJsonFile(productsFile, []);
      if (!products.some((product) => product.id === favoriteId)) {
        sendJson(response, 404, { error: "Produit introuvable." });
        return true;
      }
      await databasePool.query("INSERT INTO customer_favorites (account_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [session.id, favoriteId]);
    } else {
      await databasePool.query("DELETE FROM customer_favorites WHERE account_id = $1 AND product_id = $2", [session.id, favoriteId]);
    }
    sendJson(response, 200, { ok: true });
    return true;
  }

  return false;
};

const handleProductsApi = async (request, response, pathname) => {
  if (request.method === "GET" && astralApiKey) {
    try {
      await syncAstralCatalog();
    } catch {
      // Le dernier catalogue valide reste disponible si le fournisseur est temporairement indisponible.
    }
  }
  const products = await readJsonFile(productsFile, []);
  const requestUrl = new URL(request.url, `http://${host}`);
  const includeHidden = requestUrl.searchParams.get("include_hidden") === "1" && Boolean(getAdminSession(request));
  const visibleProducts = includeHidden
    ? products
    : products.filter((product) => product.type === "physical" || Boolean(product.photo));
  const productId = pathname.startsWith("/api/products/") ? decodeURIComponent(pathname.replace("/api/products/", "")) : "";

  if (request.method === "GET" && pathname === "/api/products") {
    const url = requestUrl;
    const type = url.searchParams.get("type");
    const provider = url.searchParams.get("provider");
    const category = url.searchParams.get("category");
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();
    const limit = Math.min(2000, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "60", 10) || 60));
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
    const filtered = visibleProducts.filter((product) => {
      const matchesType = !type || product.type === type;
      const matchesProvider = !provider || product.provider === provider;
      const matchesCategory = !category || category === "all" || product.category === category;
      const matchesQuery = !query || `${product.name} ${product.brand} ${product.categoryLabel}`.toLowerCase().includes(query);
      return matchesType && matchesProvider && matchesCategory && matchesQuery;
    });
    const page = filtered.slice(offset, offset + limit);
    sendJson(response, 200, {
      products: page.map(formatProduct),
      total: filtered.length,
      limit,
      offset,
      hasMore: offset + page.length < filtered.length
    });
    return true;
  }

  if (request.method === "GET" && productId) {
    const product = visibleProducts.find((item) => item.id === productId);
    if (!product) sendJson(response, 404, { error: "Produit introuvable." });
    else sendJson(response, 200, { product: formatProduct(product) });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/products") {
    if (!requireAdmin(request, response)) return true;
    const { product, error } = normalizeProductInput(await parseBody(request));
    if (error) sendJson(response, 400, { error });
    else if (products.some((item) => item.id === product.id)) sendJson(response, 409, { error: "Un produit avec cet identifiant existe déjà." });
    else {
      products.unshift(product);
      await writeJsonFile(productsFile, products);
      sendJson(response, 201, { product: formatProduct(product) });
    }
    return true;
  }

  if (request.method === "PUT" && productId) {
    if (!requireAdmin(request, response)) return true;
    const index = products.findIndex((item) => item.id === productId);
    if (index === -1) {
      sendJson(response, 404, { error: "Produit introuvable." });
      return true;
    }
    const { product, error } = normalizeProductInput(await parseBody(request), products[index]);
    if (error) sendJson(response, 400, { error });
    else {
      products[index] = { ...product, id: products[index].id };
      await writeJsonFile(productsFile, products);
      sendJson(response, 200, { product: formatProduct(products[index]) });
    }
    return true;
  }

  if (request.method === "DELETE" && productId) {
    if (!requireAdmin(request, response)) return true;
    const nextProducts = products.filter((item) => item.id !== productId);
    if (nextProducts.length === products.length) sendJson(response, 404, { error: "Produit introuvable." });
    else {
      await writeJsonFile(productsFile, nextProducts);
      sendJson(response, 200, { ok: true });
    }
    return true;
  }

  return false;
};

const handleProductImagesApi = async (request, response, pathname) => {
  if (request.method !== "GET" || !pathname.startsWith("/api/product-images/")) return false;
  const productId = decodeURIComponent(pathname.replace("/api/product-images/", ""));
  const products = await readJsonFile(productsFile, []);
  const product = products.find((item) => item.id === productId);
  const source = String(product?.sourceImageUrl || "");
  let sourceUrl;
  try { sourceUrl = new URL(source); } catch { sourceUrl = null; }
  if (!sourceUrl || sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "reseller.fazercards.com") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" });
    response.end("Image introuvable");
    return true;
  }
  const upstream = await fetch(sourceUrl, { signal: AbortSignal.timeout(10_000), redirect: "error" });
  const contentType = String(upstream.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (!upstream.ok || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(contentType) || contentLength > 5_000_000) {
    response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end("Image fournisseur indisponible");
    return true;
  }
  const image = Buffer.from(await upstream.arrayBuffer());
  if (image.length > 5_000_000) {
    response.writeHead(413, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end("Image trop volumineuse");
    return true;
  }
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": image.length,
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(image);
  return true;
};

const handleCartApi = async (request, response, pathname) => {
  if (request.method !== "POST" || pathname !== "/api/cart/validate") return false;
  const { items = [] } = await parseBody(request);
  const products = await readJsonFile(productsFile, []);
  const validatedItems = items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    if (!product || (product.type === "digital" && !product.photo)) return null;
    const variations = Array.isArray(product.variations) ? product.variations : [];
    const variation = variations.find((candidate) => candidate.id === String(item.variationId || ""));
    if (variations.length && !variation) return null;
    const requestedQuantity = Number(item.qty || item.quantity || 1);
    const quantity = Math.min(20, Math.max(1, Number.isFinite(requestedQuantity) ? Math.floor(requestedQuantity) : 1));
    const unitPrice = Number(variation?.price ?? product.price);
    const subtotal = unitPrice * quantity;
    return {
      ...formatProduct({ ...product, price: unitPrice }),
      name: variation ? `${product.name} — ${variation.name}` : product.name,
      type: product.type || "physical",
      category: product.category || "physical",
      variationId: variation?.id,
      variationName: variation?.name,
      qty: quantity,
      subtotal
    };
  }).filter(Boolean);
  const subtotal = validatedItems.reduce((total, item) => total + item.subtotal, 0);
  const shippingTotal = validatedItems.reduce((total, item) => total + Number(item.shippingFee || 0), 0);
  sendJson(response, 200, {
    items: validatedItems,
    subtotal,
    shippingTotal,
    total: subtotal + shippingTotal,
    totalLabel: `${(subtotal + shippingTotal).toLocaleString("fr-FR")} FCFA`
  });
  return true;
};

const extractAstralProducts = (payload) => {
  const data = getAstralPayloadData(payload);
  const candidates = [data, data?.data, data?.products, payload?.products, payload?.data?.products];
  return candidates.find(Array.isArray) || [];
};

const normalizeSearchText = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const findLocalAstralMatch = (localProducts, astralProduct) => {
  const astralName = normalizeSearchText(astralProduct.name || astralProduct.title);
  if (!astralName) return null;
  const exact = localProducts.find((product) => normalizeSearchText(product.name) === astralName);
  if (exact) return exact;
  const rules = [
    { id: "free-fire-diamonds", terms: ["free fire", "diamant", "diamond"] },
    { id: "pubg-uc", terms: ["pubg", "uc"] },
    { id: "cod-mobile-cp", terms: ["call of duty", "cod", "cp"] },
    { id: "mobile-legends", terms: ["mobile legends", "mlbb", "diamond"] },
    { id: "roblox", terms: ["roblox", "robux"] }
  ];
  const rule = rules.find((item) => item.terms.some((term) => astralName.includes(term)));
  return rule ? localProducts.find((product) => product.id === rule.id) || null : null;
};

const getAstralProductPrice = (product) => Number(product.price || product.amount || product.sale_price || product.cost || 0);

const hasOfficialAstralArtwork = (value) => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && url.hostname !== "cdn.simpleicons.org";
  } catch {
    return false;
  }
};

const isTestCatalogProduct = (name) => /\b(?:test|demo|sandbox|catalogue test)\b/i.test(String(name || ""));

const getAstralRetailPrice = (price, currency = "USD") => {
  const supplierPrice = Number(price || 0);
  const xofCost = String(currency).toUpperCase() === "XOF" ? supplierPrice : supplierPrice * astralUsdToXofRate;
  return Math.max(200, Math.ceil((xofCost * (1 + astralMarkupPercent / 100)) / 50) * 50);
};

const astralFieldNames = (product, variation = null) => [
  ...(Array.isArray(product.required_fields) ? product.required_fields : []),
  ...(Array.isArray(variation?.required_fields) ? variation.required_fields : [])
].map((field) => normalizeSearchText(typeof field === "string" ? field : field?.name || field?.key));

const importAstralProducts = async (payload) => {
  const source = extractAstralProducts(payload);
  const existingProducts = await readJsonFile(productsFile, []);
  const localProducts = existingProducts.filter((product) => product.provider !== "astral");
  const imported = [];

  source.forEach((astralProduct) => {
    const astralId = astralProduct.id || astralProduct.product_id;
    if (!astralId) return;
    const baseName = String(astralProduct.name || astralProduct.title || `Produit digital ${astralId}`);
    const sourceImageUrl = String(astralProduct.image_url || "").trim();
    if (isTestCatalogProduct(baseName) || !hasOfficialAstralArtwork(sourceImageUrl)) return;
    const sourceVariations = Array.isArray(astralProduct.variations) ? astralProduct.variations : [];
    const variations = sourceVariations.map((variation) => {
      const supplierPrice = getAstralProductPrice(variation);
      const supplierCurrency = String(variation.currency || astralProduct.currency || "USD").toUpperCase();
      const fields = astralFieldNames(astralProduct, variation);
      return {
        id: String(variation.variation_id || variation.id || ""),
        name: String(variation.name || "Option").trim(),
        price: getAstralRetailPrice(supplierPrice, supplierCurrency),
        supplierPrice,
        supplierCurrency,
        requiredFields: fields,
        requiresPlayerId: Boolean(astralProduct.requires_uid) || fields.some((field) => /uid|player|user id|account id|open id|riot id|identifiant/.test(field)),
        requiresRegion: fields.some((field) => /region|server|serveur/.test(field))
      };
    }).filter((variation) => variation.id);
    const baseSupplierPrice = getAstralProductPrice(astralProduct);
    const baseCurrency = String(astralProduct.currency || "USD").toUpperCase();
    const baseFields = astralFieldNames(astralProduct);
    const prices = variations.map((variation) => variation.price).filter(Number.isFinite);
    const retailPrice = prices.length ? Math.min(...prices) : getAstralRetailPrice(baseSupplierPrice, baseCurrency);
    const isDirectRecharge = Boolean(astralProduct.requires_uid)
      || baseFields.some((field) => /uid|player|user id|riot id|identifiant|region|server|serveur|platform/.test(field))
      || variations.some((variation) => variation.requiresPlayerId || variation.requiresRegion);
    imported.push({
      id: `product-${astralId}`,
      name: baseName,
      brand: "SILVERSE SHOP",
      price: retailPrice,
      currency: "FCFA",
      shippingFee: 0,
      media: "media-blue",
      photo: `/api/product-images/product-${astralId}`,
      sourceImageUrl,
      category: isDirectRecharge ? "jeux" : "giftcards",
      categoryLabel: isDirectRecharge ? "Recharge directe" : "Carte cadeau",
      availability: "Disponible",
      stock: 999,
      rating: 4.7,
      reviews: 0,
      badge: "",
      type: "digital",
      provider: "astral",
      astralProductId: Number(astralId),
      astralName: baseName,
      supplierPrice: baseSupplierPrice,
      supplierCurrency: baseCurrency,
      variations,
      requiresPlayerId: Boolean(astralProduct.requires_uid) || baseFields.some((field) => /uid|player|user id|account id|open id|riot id|identifiant/.test(field)),
      requiresRegion: baseFields.some((field) => /region|server|serveur/.test(field)),
      requiredFields: baseFields,
      short: variations.length ? `${variations.length} option${variations.length > 1 ? "s" : ""} disponible${variations.length > 1 ? "s" : ""}, à partir de ${retailPrice.toLocaleString("fr-FR")} FCFA.` : `Recharge ${baseName} livrée après confirmation du paiement.`,
      description: hideSupplierName(astralProduct.description || "Produit digital disponible sur SILVERSE SHOP. La commande est transmise automatiquement après validation du paiement."),
      details: [baseName, "Livraison digitale", "Paiement vérifié avant livraison", "Suivi de commande", "Support SILVERSE SHOP"]
    });
  });

  await writeJsonFile(productsFile, [...localProducts, ...imported]);
  return {
    importedCount: imported.length,
    replacedCount: existingProducts.length - localProducts.length,
    receivedCount: source.length,
    pricing: { usdToXofRate: astralUsdToXofRate, markupPercent: astralMarkupPercent }
  };
};

const fetchFullAstralCatalog = async () => {
  const perPage = 200;
  const products = [];
  let page = 1;
  let lastPage = 1;

  do {
    const result = await astralRequest("/products", { query: { per_page: perPage, page } });
    const batch = extractAstralProducts(result.payload);
    products.push(...batch);
    const data = getAstralPayloadData(result.payload);
    const total = Number(data?.total ?? result.payload?.total ?? products.length);
    lastPage = Math.max(1, Number(data?.last_page ?? result.payload?.last_page) || Math.ceil(total / perPage));
    page += 1;
  } while (page <= lastPage && page <= 20);

  return { data: products, total: products.length, current_page: 1, last_page: lastPage };
};

let astralCatalogSyncPromise = null;
let astralCatalogSyncedAt = 0;

const syncAstralCatalog = async ({ force = false } = {}) => {
  if (!astralApiKey) return { skipped: true, reason: "not_configured" };
  if (!force && astralCatalogSyncedAt && Date.now() - astralCatalogSyncedAt < astralCatalogSyncIntervalMs) {
    return { skipped: true, reason: "fresh" };
  }
  if (astralCatalogSyncPromise) return astralCatalogSyncPromise;
  astralCatalogSyncPromise = (async () => {
    const payload = await fetchFullAstralCatalog();
    const imported = await importAstralProducts(payload);
    astralCatalogSyncedAt = Date.now();
    return { ...imported, syncedAt: new Date(astralCatalogSyncedAt).toISOString() };
  })();
  try {
    return await astralCatalogSyncPromise;
  } finally {
    astralCatalogSyncPromise = null;
  }
};

const handleAstralApi = async (request, response, pathname) => {
  if (request.method === "GET" && pathname === "/api/astral/config") {
    if (!requireAdmin(request, response)) return true;
    sendJson(response, 200, getAstralConfig());
    return true;
  }

  if (request.method === "GET" && pathname === "/api/astral/logs") {
    if (!requireAdmin(request, response)) return true;
    sendJson(response, 200, { logs: await readJsonFile(astralLogsFile, []) });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/astral/balance") {
    if (!requireAdmin(request, response)) return true;
    const result = await astralRequest("/get-balance");
    sendJson(response, 200, result.payload);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/astral/categories") {
    if (!requireAdmin(request, response)) return true;
    const result = await astralRequest("/categories");
    sendJson(response, 200, result.payload);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/astral/products") {
    if (!requireAdmin(request, response)) return true;
    const url = new URL(request.url, `http://${host}`);
    const result = await astralRequest("/products", {
      query: {
        q: url.searchParams.get("q"),
        per_page: url.searchParams.get("per_page") || 50
      }
    });
    sendJson(response, 200, result.payload);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/api/astral/products/")) {
    if (!requireAdmin(request, response)) return true;
    const productId = decodeURIComponent(pathname.replace("/api/astral/products/", ""));
    const result = await astralRequest(`/products/${productId}`);
    sendJson(response, 200, result.payload);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/astral/import-products") {
    if (!requireAdmin(request, response)) return true;
    await parseBody(request);
    const importResult = await syncAstralCatalog({ force: true });
    sendJson(response, 200, importResult);
    return true;
  }

  if (request.method === "POST" && ["/api/astral/freefire/lookup", "/api/catalog/player-lookup"].includes(pathname)) {
    if (!allowPublicApiRequest(request, response, "freefire-lookup", 20)) return true;
    const body = await parseBody(request);
    const uid = String(body.uid || body.user_id || "").trim();
    const region = String(body.region || "").trim().toUpperCase();
    if (!/^[a-zA-Z0-9_-]{4,32}$/.test(uid) || !/^[A-Z-]{2,20}$/.test(region)) {
      sendJson(response, 422, { error: "UID ou région invalide." });
      return true;
    }
    try {
      const result = await astralRequest("/freefire/lookup", { method: "POST", body: { uid, region } });
      sendJson(response, 200, JSON.parse(hideSupplierName(JSON.stringify(result.payload))));
    } catch (error) {
      if (pathname === "/api/catalog/player-lookup" && error.statusCode === 403) {
        sendJson(response, 503, { error: "L’accès à la vérification automatique du pseudo n’est pas encore autorisé pour la clé API actuellement installée." });
      } else if (pathname === "/api/catalog/player-lookup" && (error.statusCode === 504 || error.name === "TimeoutError")) {
        sendJson(response, 504, { error: "Le service de vérification du pseudo ne répond pas actuellement. Réessayez dans quelques instants." });
      } else {
        throw error;
      }
    }
    return true;
  }

  if (request.method === "GET" && pathname === "/api/astral/freefire/redeem-codes") {
    if (!requireAdmin(request, response)) return true;
    const url = new URL(request.url, `http://${host}`);
    const result = await astralRequest("/freefire/redeem-codes", {
      query: { user_id: url.searchParams.get("user_id"), date: url.searchParams.get("date") }
    });
    sendJson(response, 200, result.payload);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/astral/orders") {
    if (!requireAdmin(request, response)) return true;
    const body = await parseBody(request);
    const result = await astralRequest("/order/add-order", {
      method: "POST",
      body,
      partnerReference: body.partner_reference
    });
    sendJson(response, 200, result.payload);
    return true;
  }

  if (request.method === "GET" && pathname.startsWith("/api/astral/orders/")) {
    if (!requireAdmin(request, response)) return true;
    const reference = decodeURIComponent(pathname.replace("/api/astral/orders/", ""));
    const result = await astralRequest("/order/get-order", { query: { order_id: reference }, partnerReference: reference });
    sendJson(response, 200, result.payload);
    return true;
  }

  return false;
};

const buildAstralOrderPayload = (order, item, customer) => {
  const partnerReference = `${order.id}-${item.id}`.replace(/[^A-Z0-9-]/gi, "-").slice(0, 80);
  const data = {
    customer_reference: order.trackingNumber,
    player_id: item.fulfillment?.playerId,
    uid: item.fulfillment?.playerId,
    user_id: item.fulfillment?.playerId,
    region: item.fulfillment?.region,
    server: item.fulfillment?.region,
    nickname: item.fulfillment?.nickname || undefined
  };
  Object.keys(data).forEach((key) => data[key] === undefined || data[key] === "" ? delete data[key] : undefined);

  return {
    ...(item.astralVariationId ? { variation_id: item.astralVariationId } : { product_id: item.astralProductId }),
    quantity: item.qty || 1,
    partner_reference: partnerReference,
    customer: {
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      first_name: customer.firstName || undefined,
      last_name: customer.lastName || undefined
    },
    data
  };
};

const processAstralFulfillments = async (order, { force = false } = {}) => {
  const astralItems = order.items.filter((item) => item.provider === "astral" && !isAstralItemSubmitted(item));
  if (!astralItems.length) return order;

  order.astral = order.astral || { mode: astralMode, orders: [] };

  for (const item of astralItems) {
    const previousFulfillment = item.fulfillment || {};
    const lastAttemptAt = previousFulfillment.lastAttemptAt ? new Date(previousFulfillment.lastAttemptAt).getTime() : 0;
    if (!force && lastAttemptAt && Date.now() - lastAttemptAt < astralOrderRetryIntervalMs) continue;

    const payload = buildAstralOrderPayload(order, item, order.customer || {});
    item.fulfillment = {
      ...previousFulfillment,
      provider: "astral",
      partnerReference: payload.partner_reference,
      lastAttemptAt: new Date().toISOString()
    };

    if ((item.requiresPlayerId && !item.fulfillment.playerId) || (item.requiresRegion && !item.fulfillment.region)) {
      item.fulfillment = {
        ...item.fulfillment,
        state: "awaiting_customer_data",
        error: "Informations joueur requises avant l’envoi de la commande."
      };
      continue;
    }

    try {
      if (previousFulfillment.partnerReference) {
        try {
          const existingResult = await astralRequest("/order/get-order", {
            query: { order_id: payload.partner_reference },
            partnerReference: payload.partner_reference
          });
          const existingData = getAstralPayloadData(existingResult.payload) || {};
          const existingState = existingData.state || existingData.status || "accepted";
          const existingFulfillment = {
            ...item.fulfillment,
            astralOrderId: existingData.order_id || existingData.astral_order_id || item.fulfillment.astralOrderId,
            state: existingState,
            total: existingData.total,
            currency: existingData.currency,
            response: existingData,
            error: undefined,
            syncError: undefined,
            acceptedAt: item.fulfillment.acceptedAt || new Date().toISOString()
          };
          item.fulfillment = existingFulfillment;
          order.astral.orders.push(existingFulfillment);
          appendOrderEvent(order, mapAstralState(existingState), `Commande digitale retrouvée : ${existingState}.`, "SILVERSE SHOP");
          continue;
        } catch (lookupError) {
          if (lookupError.statusCode !== 404) {
            item.fulfillment = { ...item.fulfillment, syncError: lookupError.message };
            continue;
          }
        }
      }

      const result = await astralRequest("/order/add-order", {
        method: "POST",
        body: payload,
        partnerReference: payload.partner_reference
      });
      const data = getAstralPayloadData(result.payload) || {};
      const astralStatus = mapAstralState(data.state);
      const fulfillment = {
        ...item.fulfillment,
        astralOrderId: data.order_id || data.astral_order_id,
        state: data.state || "accepted",
        total: data.total,
        currency: data.currency,
        response: data,
        error: undefined,
        syncError: undefined,
        acceptedAt: new Date().toISOString()
      };
      item.fulfillment = fulfillment;
      order.astral.orders.push(fulfillment);
      appendOrderEvent(order, astralStatus, `Commande digitale ${data.order_id || payload.partner_reference} : ${data.state || "accepted"}.`, "SILVERSE SHOP");
    } catch (error) {
      const fulfillment = {
        ...item.fulfillment,
        state: error.statusCode === 503 ? "configuration_required" : "failed",
        error: error.message,
        response: error.payload || null
      };
      item.fulfillment = fulfillment;
      order.astral.orders.push(fulfillment);
      appendOrderEvent(order, "pending", error.statusCode === 503
        ? "Commande digitale en attente : le service de livraison n'est pas configuré sur le serveur."
        : `Commande digitale en attente : ${error.message}`,
        "SILVERSE SHOP");
    }
  }

  return order;
};

const syncOrderWithAstral = async (order) => {
  const astralItems = order.items.filter((item) => item.fulfillment?.provider === "astral"
    && item.fulfillment?.partnerReference
    && isAstralItemSubmitted(item));
  if (!astralItems.length || !astralApiKey) return order;

  for (const item of astralItems) {
    try {
      const result = await astralRequest("/order/get-order", {
        query: { order_id: item.fulfillment.partnerReference },
        partnerReference: item.fulfillment.partnerReference
      });
      const data = getAstralPayloadData(result.payload) || {};
      const previousState = item.fulfillment.state;
      const state = data.state || data.status || previousState;
      item.fulfillment = { ...item.fulfillment, state, response: data };
      if (state && state !== previousState) {
        appendOrderEvent(order, mapAstralState(state), `Synchronisation Astral : ${state}.`, "Astral4Gamer");
      }
    } catch (error) {
      item.fulfillment = { ...item.fulfillment, syncError: error.message };
    }
  }

  return order;
};

let astralOrderReconciliationRunning = false;

const reconcilePaidAstralOrders = async () => {
  if (!astralApiKey || astralOrderReconciliationRunning) return;
  astralOrderReconciliationRunning = true;
  try {
    const balanceResult = await astralRequest("/get-balance");
    const balance = getAstralPayloadData(balanceResult.payload) || {};
    const walletStatus = String(balance.wallet_status || balance.wallet?.status || "").toLowerCase();
    const apiStatus = String(balance.api_status || "").toLowerCase();
    if (["frozen", "blocked", "disabled", "inactive"].includes(walletStatus)) return;
    if (apiStatus && !["active", "enabled", "ok"].includes(apiStatus)) return;

    const orders = await readJsonFile(ordersFile, []);
    let changed = false;
    for (const order of orders) {
      if (order.payment?.status !== "succeeded") continue;
      const hasRetryableItem = order.items.some((item) => item.provider === "astral" && !isAstralItemSubmitted(item));
      if (!hasRetryableItem) continue;
      const before = JSON.stringify(order.items);
      await processAstralFulfillments(order);
      if (JSON.stringify(order.items) !== before) changed = true;
    }
    if (changed) await writeJsonFile(ordersFile, orders);
  } catch {
    // Une indisponibilité du fournisseur ne doit jamais interrompre le serveur.
  } finally {
    astralOrderReconciliationRunning = false;
  }
};

const handleOrdersApi = async (request, response, pathname) => {
  const orderId = pathname.startsWith("/api/orders/") ? decodeURIComponent(pathname.replace("/api/orders/", "").split("/")[0]) : "";

  if (request.method === "GET" && pathname === "/api/orders") {
    if (!requireAdmin(request, response)) return true;
    sendJson(response, 200, { orders: await readJsonFile(ordersFile, []) });
    return true;
  }

  if (request.method === "GET" && orderId) {
    const orders = await readJsonFile(ordersFile, []);
    const index = orders.findIndex((item) => item.id === orderId || item.trackingNumber === orderId);
    const order = index === -1 ? null : await syncOrderWithAstral(orders[index]);
    const customerSession = await getCustomerSession(request);
    if (!getAdminSession(request) && !customerSession && !allowPublicApiRequest(request, response, "order-tracking", 60)) return true;
    const mayRead = order && (order.trackingNumber === orderId || Boolean(getAdminSession(request)) || (customerSession && order.accountId === customerSession.id));
    if (!mayRead) sendJson(response, 404, { error: "Commande introuvable." });
    else {
      orders[index] = order;
      await writeJsonFile(ordersFile, orders);
      sendJson(response, 200, { order: publicOrderView(order) });
    }
    return true;
  }

  if (request.method === "PATCH" && orderId && pathname.endsWith("/delivery")) {
    if (!requireAdmin(request, response)) return true;
    const body = await parseBody(request);
    const orders = await readJsonFile(ordersFile, []);
    const index = orders.findIndex((item) => item.id === orderId || item.trackingNumber === orderId);
    if (index === -1) {
      sendJson(response, 404, { error: "Commande introuvable." });
      return true;
    }
    if (!orders[index].delivery) {
      sendJson(response, 409, { error: "Cette commande ne nécessite pas de livraison physique." });
      return true;
    }
    const address = String(body.address || "").trim().slice(0, 240);
    const city = String(body.city || "").trim().slice(0, 120);
    const country = String(body.country || "").trim().slice(0, 120);
    if (!address || !city || !country) {
      sendJson(response, 422, { error: "Adresse, ville et pays sont obligatoires." });
      return true;
    }
    orders[index].customer = { ...orders[index].customer, address, city, country };
    orders[index].delivery = {
      ...orders[index].delivery,
      method: "address_now",
      methodLabel: "Adresse communiquée",
      status: "address_confirmed",
      statusLabel: "Adresse confirmée",
      address: { address, city, country },
      coordinates: null,
      updatedAt: new Date().toISOString()
    };
    appendOrderEvent(orders[index], orders[index].status, "Adresse de livraison confirmée. Livraison prévue sous 24 h après disponibilité du produit.", "Livraison SILVERSE SHOP");
    await writeJsonFile(ordersFile, orders);
    sendJson(response, 200, { order: publicOrderView(orders[index]) });
    return true;
  }

  if (request.method === "PATCH" && orderId && pathname.endsWith("/fulfillment")) {
    if (!requireStrictAdmin(request, response)) return true;
    const body = await parseBody(request);
    const orders = await readJsonFile(ordersFile, []);
    const index = orders.findIndex((item) => item.id === orderId || item.trackingNumber === orderId);
    if (index === -1) {
      sendJson(response, 404, { error: "Commande introuvable." });
      return true;
    }
    const item = orders[index].items.find((entry) => entry.provider === "astral" && entry.id === String(body.itemId || ""));
    if (!item) {
      sendJson(response, 404, { error: "Article numérique introuvable dans cette commande." });
      return true;
    }
    if (isAstralItemSubmitted(item)) {
      sendJson(response, 409, { error: "Cet article a déjà été transmis au service de livraison." });
      return true;
    }
    item.fulfillment = {
      ...(item.fulfillment || {}),
      playerId: String(body.playerId || "").trim().slice(0, 120),
      region: String(body.region || "").trim().slice(0, 80),
      nickname: String(body.nickname || "").trim().slice(0, 120),
      error: undefined,
      lastAttemptAt: undefined
    };
    if ((item.requiresPlayerId && !item.fulfillment.playerId) || (item.requiresRegion && !item.fulfillment.region)) {
      sendJson(response, 422, { error: "UID et région requis pour transmettre cet article." });
      return true;
    }
    if (orders[index].payment?.status === "succeeded") {
      await processAstralFulfillments(orders[index], { force: true });
    }
    await writeJsonFile(ordersFile, orders);
    sendJson(response, 200, { order: publicOrderView(orders[index]) });
    return true;
  }

  if (request.method === "PATCH" && orderId && pathname.endsWith("/status")) {
    if (!requireAdmin(request, response)) return true;
    const body = await parseBody(request);
    const orders = await readJsonFile(ordersFile, []);
    const index = orders.findIndex((item) => item.id === orderId || item.trackingNumber === orderId);
    if (index === -1) {
      sendJson(response, 404, { error: "Commande introuvable." });
      return true;
    }
    const status = String(body.status || "processing").trim();
    if (!orderStatuses[status]) {
      sendJson(response, 400, { error: "Statut de commande invalide." });
      return true;
    }
    orders[index] = appendOrderEvent(orders[index], status, body.note, body.location);
    await writeJsonFile(ordersFile, orders);
    sendJson(response, 200, { order: publicOrderView(orders[index]) });
    return true;
  }

  if (request.method === "POST" && orderId && pathname.endsWith("/fulfill")) {
    if (!requireAdmin(request, response)) return true;
    const orders = await readJsonFile(ordersFile, []);
    const index = orders.findIndex((item) => item.id === orderId || item.trackingNumber === orderId);
    if (index === -1) {
      sendJson(response, 404, { error: "Commande introuvable." });
      return true;
    }
    if (astralMode !== "sandbox" && orders[index].payment?.status !== "succeeded") {
      sendJson(response, 409, { error: "La livraison live exige un paiement confirmé." });
      return true;
    }
    await processAstralFulfillments(orders[index], { force: true });
    await writeJsonFile(ordersFile, orders);
    sendJson(response, 200, { order: publicOrderView(orders[index]) });
    return true;
  }

  if (request.method !== "POST" || pathname !== "/api/orders") return false;

  const body = await parseBody(request);
  const customerSession = await getCustomerSession(request);
  if (customerSession) {
    const csrfToken = String(request.headers["x-csrf-token"] || "");
    if (!requestHasValidOrigin(request) || !safeTextEqual(csrfToken, customerSession.csrf_token)) {
      sendJson(response, 403, { error: "Session client invalide. Rechargez la page puis réessayez." });
      return true;
    }
  }
  const email = customerSession?.email || String(body.customer?.email || "").trim().toLowerCase();
  const phone = String(body.customer?.phone || "").trim();
  const firstName = String(body.customer?.firstName || "").trim();
  const lastName = String(body.customer?.lastName || "").trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !phone || !firstName || !lastName) {
    sendJson(response, 422, { error: "Nom, prénom, e-mail et téléphone valides sont obligatoires." });
    return true;
  }
  const products = await readJsonFile(productsFile, []);
  const items = Array.isArray(body.items) ? body.items : [];
  let changedPriceItem = null;
  const orderItems = items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.id);
    if (!product || (product.type === "digital" && !product.photo)) return null;
    const variations = Array.isArray(product.variations) ? product.variations : [];
    const variation = variations.find((candidate) => candidate.id === String(item.variationId || ""));
    if (variations.length && !variation) return null;
    const requestedQuantity = Number(item.qty || item.quantity || 1);
    const quantity = Math.min(20, Math.max(1, Number.isFinite(requestedQuantity) ? Math.floor(requestedQuantity) : 1));
    if (product.type === "physical" && quantity > Number(product.stock || 0)) return null;
    const astralMeta = getAstralProductMeta(product);
    const fulfillment = body.fulfillment?.[product.id] || body.fulfillment || {};
    const unitPrice = Number(variation?.price ?? product.price);
    const expectedUnitPrice = Number(item.expectedUnitPrice);
    if (Number.isFinite(expectedUnitPrice) && Math.abs(expectedUnitPrice - unitPrice) >= 0.01) {
      changedPriceItem ||= variation ? `${product.name} — ${variation.name}` : product.name;
    }
    return {
      id: product.id,
      name: variation ? `${product.name} — ${variation.name}` : product.name,
      type: product.type || "physical",
      category: product.category || "physical",
      qty: quantity,
      unitPrice,
      shippingFee: product.shippingFee || 0,
      subtotal: unitPrice * quantity,
      provider: astralMeta?.provider || product.provider || "local",
      astralProductId: astralMeta?.astralProductId,
      astralVariationId: variation?.id || astralMeta?.astralVariationId,
      variationName: variation?.name,
      fulfillment: astralMeta ? {
        playerId: String(fulfillment.playerId || fulfillment.player_id || fulfillment.uid || fulfillment.user_id || "").trim(),
        region: String(fulfillment.region || fulfillment.server || "").trim(),
        nickname: String(fulfillment.nickname || "").trim()
      } : undefined,
      requiresPlayerId: Boolean(variation?.requiresPlayerId || astralMeta?.requiresPlayerId),
      requiresRegion: Boolean(variation?.requiresRegion || astralMeta?.requiresRegion)
    };
  }).filter(Boolean);

  if (changedPriceItem) {
    sendJson(response, 409, {
      error: `Le prix de ${changedPriceItem} vient d’être actualisé. Le paiement n’a pas été lancé : vérifiez le nouveau total puis confirmez à nouveau.`,
      code: "PRICE_CHANGED"
    });
    return true;
  }

  if (!orderItems.length) {
    sendJson(response, 400, { error: "La commande ne contient aucun produit valide." });
    return true;
  }

  const invalidAstralItem = orderItems.find((item) => item.provider === "astral" && (
    (!item.astralProductId && !item.astralVariationId)
    || (item.requiresPlayerId && !item.fulfillment?.playerId)
    || (item.requiresRegion && !item.fulfillment?.region)
  ));
  if (invalidAstralItem) {
    sendJson(response, 422, { error: `Informations joueur incomplètes pour ${invalidAstralItem.name}.` });
    return true;
  }

  const hasPhysicalItems = orderItems.some((item) => item.type === "physical");
  const deliveryOption = String(body.customer?.deliveryOption || "address_now").trim();
  const allowedDeliveryOptions = ["address_now", "current_location", "communicate_later"];
  const address = String(body.customer?.address || "").trim().slice(0, 240);
  const city = String(body.customer?.city || "").trim().slice(0, 120);
  const country = String(body.customer?.country || "").trim().slice(0, 120);
  const latitudeRaw = String(body.customer?.latitude ?? "").trim();
  const longitudeRaw = String(body.customer?.longitude ?? "").trim();
  const latitude = latitudeRaw === "" ? null : Number(latitudeRaw);
  const longitude = longitudeRaw === "" ? null : Number(longitudeRaw);
  const validCoordinates = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

  if (hasPhysicalItems && !allowedDeliveryOptions.includes(deliveryOption)) {
    sendJson(response, 422, { error: "Option de livraison invalide." });
    return true;
  }
  if (hasPhysicalItems && deliveryOption === "address_now" && (!address || !city || !country)) {
    sendJson(response, 422, { error: "Adresse, ville et pays sont requis pour la livraison." });
    return true;
  }
  if (hasPhysicalItems && deliveryOption === "current_location" && !validCoordinates) {
    sendJson(response, 422, { error: "Position de livraison invalide ou absente." });
    return true;
  }

  const subtotal = orderItems.reduce((total, item) => total + item.subtotal, 0);
  const shippingTotal = orderItems.reduce((total, item) => total + Number(item.shippingFee || 0), 0);
  const orders = await readJsonFile(ordersFile, []);
  const order = {
    id: `ORD-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`,
    accountId: customerSession?.id || null,
    trackingNumber: createTrackingNumber(),
    createdAt: new Date().toISOString(),
    customer: {
      email,
      paymentMethod: String(body.customer?.paymentMethod || "").trim(),
      notes: String(body.customer?.notes || "").trim(),
      phone,
      firstName,
      lastName,
      address,
      city,
      country
    },
    delivery: hasPhysicalItems ? {
      method: deliveryOption,
      methodLabel: deliveryOption === "address_now"
        ? "Adresse communiquée"
        : deliveryOption === "current_location"
          ? "Position actuelle"
          : "Adresse à communiquer plus tard",
      status: deliveryOption === "communicate_later" ? "awaiting_address" : "address_confirmed",
      statusLabel: deliveryOption === "communicate_later" ? "En attente de l’adresse" : "Adresse confirmée",
      etaHours: 24,
      etaStartsAfter: "product_available_and_address_confirmed",
      address: deliveryOption === "address_now" ? { address, city, country } : null,
      coordinates: deliveryOption === "current_location" ? { latitude, longitude } : null
    } : null,
    items: orderItems,
    subtotal,
    shippingTotal,
    total: subtotal + shippingTotal,
    status: "pending",
    statusLabel: orderStatuses.pending,
    trackingProgress: 0,
    timeline: []
  };
  const payments = await readJsonFile(paymentsFile, []);
  const checkoutToken = randomBytes(32).toString("hex");
  const payment = {
    id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    orderId: order.id,
    provider: ["fedapay", "moneyfusion"].includes(order.customer.paymentMethod)
      ? order.customer.paymentMethod
      : (paymentProvider === "unconfigured" ? (order.customer.paymentMethod || "manual") : paymentProvider),
    providerReference: "",
    checkoutTokenHash: createHash("sha256").update(checkoutToken).digest("hex"),
    amount: order.total,
    currency: "FCFA",
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  order.payment = { id: payment.id, provider: payment.provider, status: payment.status };
  appendOrderEvent(order, "pending", "Commande reçue et en attente de traitement.", "SILVERSE SHOP");
  if (order.delivery) {
    appendOrderEvent(order, "pending", order.delivery.method === "communicate_later"
      ? "Paiement possible maintenant. L’adresse sera demandée dès que le produit sera disponible, puis la livraison interviendra sous 24 h."
      : "Informations de livraison enregistrées. Livraison prévue sous 24 h après disponibilité du produit et confirmation du paiement.", "Livraison SILVERSE SHOP");
  }
  if (orderItems.some((item) => item.provider === "astral")) {
    order.astral = { mode: astralMode, orders: [] };
    appendOrderEvent(order, "pending", "Livraison digitale en attente de confirmation du paiement.", "Paiement");
  }
  orders.unshift(order);
  payments.unshift(payment);
  await writeJsonFile(ordersFile, orders);
  await writeJsonFile(paymentsFile, payments);
  sendJson(response, 201, { order: publicOrderView(order), checkoutToken });
  return true;
};

const buildCustomers = (orders) => {
  const customers = new Map();
  orders.forEach((order) => {
    const email = String(order.customer?.email || "").trim().toLowerCase();
    const phone = String(order.customer?.phone || "").trim();
    const key = email || phone || `guest-${order.id}`;
    const current = customers.get(key) || {
      id: key,
      email,
      phone,
      name: [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" "),
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: order.createdAt
    };
    current.orderCount += 1;
    current.totalSpent += Number(order.total || 0);
    if (new Date(order.createdAt) > new Date(current.lastOrderAt)) current.lastOrderAt = order.createdAt;
    customers.set(key, current);
  });
  return [...customers.values()].sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));
};

const handleCustomersApi = async (request, response, pathname) => {
  if (request.method !== "GET" || pathname !== "/api/customers") return false;
  if (!requireAdmin(request, response)) return true;
  const orders = await readJsonFile(ordersFile, []);
  const customers = buildCustomers(orders);
  if (databasePool) {
    const accounts = await databasePool.query("SELECT id, email, full_name, phone, created_at FROM customer_accounts ORDER BY created_at DESC");
    accounts.rows.forEach((account) => {
      const email = String(account.email || "").toLowerCase();
      const existing = customers.find((customer) => customer.email === email);
      if (existing) {
        existing.accountId = account.id;
        existing.name = account.full_name || existing.name;
        existing.phone = account.phone || existing.phone;
        existing.registeredAt = account.created_at;
      } else {
        customers.push({
          id: account.id,
          accountId: account.id,
          email,
          phone: account.phone || "",
          name: account.full_name || "",
          orderCount: 0,
          totalSpent: 0,
          lastOrderAt: account.created_at,
          registeredAt: account.created_at
        });
      }
    });
    customers.sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));
  }
  sendJson(response, 200, { customers });
  return true;
};

const containsRawCardData = (value) => {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
    if (["cardnumber", "pan", "cvv", "cvc", "cryptogram"].includes(normalized)) return true;
    return typeof child === "object" && containsRawCardData(child);
  });
};

const verifyFedaPaySignature = (raw, header) => {
  if (!fedapayWebhookSecret || typeof header !== "string") return false;
  const parts = header.split(",").reduce((result, part) => {
    const [key, value] = part.split("=", 2);
    if (key === "t") result.timestamp = Number(value);
    if (key === "s") result.signatures.push(value);
    return result;
  }, { timestamp: 0, signatures: [] });
  if (!parts.timestamp || !parts.signatures.length) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - parts.timestamp) > 300) return false;
  const expected = createHmac("sha256", fedapayWebhookSecret).update(`${parts.timestamp}.${raw}`, "utf8").digest("hex");
  return parts.signatures.some((signature) => {
    if (signature.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  });
};

const moneyFusionStatusUrl = (token) => `${moneyFusionBaseUrl}/paiementNotif/${encodeURIComponent(token)}`;

const syncMoneyFusionPayment = async (payment, order) => {
  const token = String(payment.providerToken || payment.providerReference || "").trim();
  if (!token) {
    const error = new Error("Jeton Money Fusion introuvable.");
    error.statusCode = 422;
    throw error;
  }
  const result = await moneyFusionRequest(moneyFusionStatusUrl(token), { operation: "payment_status" });
  const remote = result?.data || {};
  const remoteToken = String(remote.tokenPay || "");
  if (!remoteToken || !safeTextEqual(remoteToken, token)) {
    const error = new Error("Le jeton retourné par Money Fusion ne correspond pas.");
    error.statusCode = 502;
    throw error;
  }
  const remoteOrderIds = Array.isArray(remote.personal_Info)
    ? remote.personal_Info.map((item) => String(item?.orderId || ""))
    : [];
  const orderMatches = remoteOrderIds.length === 0 || remoteOrderIds.includes(String(order.id));
  const remoteAmount = Number(remote.Montant);
  const remoteFees = Number(remote.frais || 0);
  const expectedAmount = Math.round(Number(payment.amount || order.total || 0));
  const amountMatches = Number.isFinite(remoteAmount)
    && (Math.round(remoteAmount) === expectedAmount || Math.round(remoteAmount + remoteFees) === expectedAmount);
  const remoteStatus = String(remote.statut || "pending").trim().toLowerCase();
  const previousStatus = payment.status;
  if (remoteStatus === "paid" && amountMatches && orderMatches) payment.status = "succeeded";
  else if (remoteStatus === "paid") {
    payment.status = "failed";
    payment.securityError = !amountMatches ? "amount_mismatch" : "order_mismatch";
  } else if (["failure", "failed"].includes(remoteStatus)) payment.status = "failed";
  else if (["no paid", "cancelled", "canceled"].includes(remoteStatus)) payment.status = "cancelled";
  else payment.status = "pending";
  payment.provider = "moneyfusion";
  payment.providerToken = token;
  payment.providerReference = token;
  payment.providerTransactionId = remote._id || payment.providerTransactionId || "";
  payment.paymentMethod = remote.moyen || payment.paymentMethod || "";
  payment.updatedAt = new Date().toISOString();
  payment.lastVerifiedAt = payment.updatedAt;
  order.payment = { id: payment.id, provider: payment.provider, status: payment.status };
  if (payment.status === "succeeded") {
    if (previousStatus !== "succeeded" && order.status === "pending") appendOrderEvent(order, "processing", "Paiement Money Fusion confirmé.", "Paiement");
    await processAstralFulfillments(order);
  }
  return { payment, order, remoteStatus, amountMatches, orderMatches };
};

const getFedaPayEntity = (event) => {
  const value = event?.entity || event?.data?.entity || event?.data || {};
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const handlePaymentsApi = async (request, response, pathname) => {
  if (request.method === "GET" && pathname === "/api/payments") {
    if (!requireAdmin(request, response)) return true;
    sendJson(response, 200, { payments: await readJsonFile(paymentsFile, []) });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/payments/intents") {
    const body = await parseBody(request);
    if (containsRawCardData(body)) {
      sendJson(response, 422, { error: "Les données bancaires brutes sont interdites. Utilisez un jeton du prestataire." });
      return true;
    }
    if (!paymentSecretKey || paymentProvider === "unconfigured") {
      sendJson(response, 503, { error: "Prestataire de paiement non configuré sur le serveur." });
      return true;
    }
    const orders = await readJsonFile(ordersFile, []);
    const order = orders.find((item) => item.id === String(body.orderId || ""));
    if (!order) {
      sendJson(response, 404, { error: "Commande introuvable." });
      return true;
    }
    const payments = await readJsonFile(paymentsFile, []);
    const payment = payments.find((item) => item.orderId === order.id);
    if (!payment) {
      sendJson(response, 404, { error: "Transaction introuvable." });
      return true;
    }
    payment.provider = paymentProvider;
    payment.status = "processing";
    payment.updatedAt = new Date().toISOString();
    payment.hasProviderToken = Boolean(body.paymentToken);
    order.payment = { id: payment.id, provider: payment.provider, status: payment.status };
    await writeJsonFile(paymentsFile, payments);
    await writeJsonFile(ordersFile, orders);
    sendJson(response, 202, { payment: { id: payment.id, orderId: order.id, provider: payment.provider, status: payment.status, amount: payment.amount, currency: payment.currency } });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/payments/fedapay/checkout") {
    const body = await parseBody(request);
    if (containsRawCardData(body)) {
      sendJson(response, 422, { error: "Les données bancaires brutes sont interdites." });
      return true;
    }
    if (!getFedaPayConfig().configured) {
      sendJson(response, 503, { error: "FedaPay exige une clé secrète, un secret webhook et HTTPS en mode live." });
      return true;
    }
    const orders = await readJsonFile(ordersFile, []);
    const orderIndex = orders.findIndex((item) => item.id === String(body.orderId || ""));
    if (orderIndex === -1) {
      sendJson(response, 404, { error: "Commande introuvable." });
      return true;
    }
    const order = orders[orderIndex];
    const payments = await readJsonFile(paymentsFile, []);
    const payment = payments.find((item) => item.orderId === order.id);
    if (!payment) {
      sendJson(response, 404, { error: "Transaction locale introuvable." });
      return true;
    }
    const checkoutTokenHash = createHash("sha256").update(String(body.checkoutToken || "")).digest("hex");
    if (!payment.checkoutTokenHash || !safeTextEqual(checkoutTokenHash, payment.checkoutTokenHash)) {
      sendJson(response, 403, { error: "Jeton de paiement invalide ou expiré." });
      return true;
    }
    if (payment.status === "succeeded") {
      sendJson(response, 409, { error: "Cette commande est déjà payée." });
      return true;
    }
    const countryCode = String(body.countryCode || "SN").trim().toUpperCase().slice(0, 2);
    let transactionId = payment.providerTransactionId;
    let transaction = null;
    if (!transactionId) {
      transaction = await fedapayRequest("/transactions", {
        method: "POST",
        body: {
          description: `Commande SILVERSE SHOP ${order.id}`,
          amount: Math.round(Number(order.total)),
          currency: { iso: "XOF" },
          callback_url: `${appBaseUrl}/tracking.html?ref=${encodeURIComponent(order.trackingNumber)}`,
          custom_metadata: { order_id: order.id, payment_id: payment.id },
          customer: {
            email: order.customer.email,
            firstname: order.customer.firstName,
            lastname: order.customer.lastName,
            phone_number: {
              number: String(order.customer.phone || "").replace(/[^0-9]/g, ""),
              country: countryCode
            }
          }
        }
      });
      transactionId = transaction.id;
    }
    const tokenResult = await fedapayRequest(`/transactions/${encodeURIComponent(transactionId)}/token`, { method: "POST" });
    payment.provider = "fedapay";
    payment.providerTransactionId = transactionId;
    payment.providerReference = transaction?.reference || payment.providerReference || "";
    payment.status = transaction?.status || "pending";
    payment.updatedAt = new Date().toISOString();
    order.payment = { id: payment.id, provider: "fedapay", status: payment.status };
    await Promise.all([writeJsonFile(paymentsFile, payments), writeJsonFile(ordersFile, orders)]);
    sendJson(response, 201, {
      payment: { id: payment.id, provider: "fedapay", status: payment.status, amount: payment.amount, currency: "XOF" },
      checkoutUrl: tokenResult.url
    });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/payments/moneyfusion/checkout") {
    if (!getMoneyFusionConfig().configured) {
      sendJson(response, 503, { error: "Money Fusion exige le lien API, le secret webhook et HTTPS." });
      return true;
    }
    const body = await parseBody(request);
    const orders = await readJsonFile(ordersFile, []);
    const order = orders.find((item) => item.id === String(body.orderId || ""));
    if (!order) {
      sendJson(response, 404, { error: "Commande introuvable." });
      return true;
    }
    const payments = await readJsonFile(paymentsFile, []);
    const payment = payments.find((item) => item.orderId === order.id);
    if (!payment) {
      sendJson(response, 404, { error: "Transaction locale introuvable." });
      return true;
    }
    const checkoutTokenHash = createHash("sha256").update(String(body.checkoutToken || "")).digest("hex");
    if (!payment.checkoutTokenHash || !safeTextEqual(checkoutTokenHash, payment.checkoutTokenHash)) {
      sendJson(response, 403, { error: "Jeton de paiement invalide ou expiré." });
      return true;
    }
    if (payment.status === "succeeded") {
      sendJson(response, 409, { error: "Cette commande est déjà payée." });
      return true;
    }
    if (payment.provider === "moneyfusion" && payment.providerToken && payment.checkoutUrl) {
      sendJson(response, 200, {
        payment: { id: payment.id, provider: payment.provider, status: payment.status, amount: payment.amount, currency: payment.currency },
        checkoutUrl: payment.checkoutUrl
      });
      return true;
    }
    const amount = Math.round(Number(order.total || 0));
    if (!Number.isFinite(amount) || amount < 200) {
      sendJson(response, 422, { error: "Money Fusion exige un montant minimum de 200 FCFA." });
      return true;
    }
    const webhookUrl = new URL("/api/webhooks/moneyfusion", appBaseUrl);
    webhookUrl.searchParams.set("secret", moneyFusionWebhookSecret);
    const result = await moneyFusionRequest(moneyFusionPaymentUrl, {
      method: "POST",
      operation: "create_payment",
      body: {
        totalPrice: amount,
        article: order.items.map((item) => ({
          nom: String(item.name || item.id).slice(0, 80),
          montant: Math.round(Number(item.subtotal || Number(item.unitPrice) * Number(item.qty || 1)))
        })),
        personal_Info: [{ userId: order.customer.email, orderId: order.id }],
        numeroSend: String(order.customer.phone || "").replace(/[^0-9+]/g, ""),
        nomclient: [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" "),
        return_url: `${appBaseUrl}/suivi?ref=${encodeURIComponent(order.trackingNumber)}`,
        webhook_url: webhookUrl.toString()
      }
    });
    const token = String(result.token || result.tokenPay || "").trim();
    const checkoutUrl = String(result.url || "").trim();
    if (!token || !isTrustedMoneyFusionUrl(checkoutUrl)) {
      sendJson(response, 502, { error: "Réponse de paiement Money Fusion invalide." });
      return true;
    }
    payment.provider = "moneyfusion";
    payment.providerToken = token;
    payment.providerReference = token;
    payment.checkoutUrl = checkoutUrl;
    payment.status = "pending";
    payment.updatedAt = new Date().toISOString();
    order.payment = { id: payment.id, provider: payment.provider, status: payment.status };
    await Promise.all([writeJsonFile(paymentsFile, payments), writeJsonFile(ordersFile, orders)]);
    sendJson(response, 201, {
      payment: { id: payment.id, provider: payment.provider, status: payment.status, amount: payment.amount, currency: payment.currency },
      checkoutUrl
    });
    return true;
  }

  if (request.method === "POST" && pathname.startsWith("/api/payments/webhooks/")) {
    if (!paymentWebhookSecret) {
      sendJson(response, 503, { error: "Secret webhook non configuré." });
      return true;
    }
    const raw = await readRequestBody(request);
    const received = String(request.headers["x-webhook-signature"] || "").replace(/^sha256=/, "");
    const expected = createHmac("sha256", paymentWebhookSecret).update(raw).digest("hex");
    const valid = received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
    if (!valid) {
      sendJson(response, 401, { error: "Signature webhook invalide." });
      return true;
    }
    const event = JSON.parse(raw || "{}");
    const payments = await readJsonFile(paymentsFile, []);
    const payment = payments.find((item) => item.id === event.paymentId || item.providerReference === event.providerReference);
    if (!payment) {
      sendJson(response, 404, { error: "Transaction introuvable." });
      return true;
    }
    const allowedStatuses = ["pending", "processing", "succeeded", "failed", "cancelled", "refunded"];
    payment.status = allowedStatuses.includes(event.status) ? event.status : payment.status;
    payment.providerReference = String(event.providerReference || payment.providerReference || "");
    payment.updatedAt = new Date().toISOString();
    const orders = await readJsonFile(ordersFile, []);
    const order = orders.find((item) => item.id === payment.orderId);
    if (order) {
      order.payment = { id: payment.id, provider: payment.provider, status: payment.status };
      if (payment.status === "succeeded") {
        if (order.status === "pending") appendOrderEvent(order, "processing", "Paiement confirmé par le prestataire.", "Paiement");
        await processAstralFulfillments(order);
      }
      await writeJsonFile(ordersFile, orders);
    }
    await writeJsonFile(paymentsFile, payments);
    sendJson(response, 200, { received: true });
    return true;
  }

  return false;
};

const handleFedaPayApi = async (request, response, pathname) => {
  if (request.method === "GET" && pathname === "/api/fedapay/config") {
    sendJson(response, 200, getFedaPayConfig());
    return true;
  }

  if (request.method === "GET" && pathname === "/api/fedapay/logs") {
    if (!requireAdmin(request, response)) return true;
    sendJson(response, 200, { logs: await readJsonFile(fedapayLogsFile, []) });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/fedapay/balances") {
    if (!requireStrictAdmin(request, response)) return true;
    const result = await fedapayRequest("/balances");
    const source = Array.isArray(result) ? result : result?.balances || result?.data || [];
    const balances = source.map((item) => ({
      id: item.id,
      amount: Number(item.amount || 0),
      mode: item.mode || "available",
      accountId: item.account_id,
      updatedAt: item.updated_at
    }));
    sendJson(response, 200, {
      balances,
      totalAvailable: balances.reduce((total, item) => total + item.amount, 0),
      currency: "XOF",
      environment: fedapayEnvironment
    });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/webhooks/fedapay") {
    if (!fedapayWebhookSecret) {
      sendJson(response, 503, { error: "Secret webhook FedaPay non configuré." });
      return true;
    }
    const raw = await readRequestBody(request);
    if (!verifyFedaPaySignature(raw, request.headers["x-fedapay-signature"])) {
      sendJson(response, 401, { error: "Signature FedaPay invalide." });
      return true;
    }
    let event;
    try { event = JSON.parse(raw); } catch {
      sendJson(response, 400, { error: "Événement FedaPay invalide." });
      return true;
    }
    const entity = getFedaPayEntity(event);
    const eventName = String(event.name || event.type || "");
    const eventKey = String(event.id || `${eventName}:${entity.id || entity.reference}:${entity.updated_at || ""}`);
    const processed = await readJsonFile(fedapayEventsFile, []);
    if (processed.some((item) => item.id === eventKey)) {
      sendJson(response, 200, { received: true, duplicate: true });
      return true;
    }
    const payments = await readJsonFile(paymentsFile, []);
    const metadata = entity.custom_metadata || entity.metadata || {};
    const payment = payments.find((item) =>
      String(item.providerTransactionId || "") === String(entity.id || "")
      || item.providerReference === entity.reference
      || item.id === metadata.payment_id
      || item.orderId === metadata.order_id);
    if (!payment && eventName.startsWith("payout.")) {
      const payouts = await readJsonFile(payoutsFile, []);
      const payout = payouts.find((item) => String(item.id) === String(entity.id || "") || item.reference === entity.reference);
      if (!payout) {
        sendJson(response, 404, { error: "Payout FedaPay non reconnu." });
        return true;
      }
      payout.status = entity.status || eventName.replace("payout.", "");
      payout.updatedAt = entity.updated_at || new Date().toISOString();
      payout.lastErrorCode = entity.last_error_code || undefined;
      processed.unshift({ id: eventKey, name: eventName, createdAt: new Date().toISOString() });
      await Promise.all([
        writeJsonFile(payoutsFile, payouts),
        writeJsonFile(fedapayEventsFile, processed.slice(0, 1000))
      ]);
      sendJson(response, 200, { received: true });
      return true;
    }
    if (!payment) {
      sendJson(response, 404, { error: "Transaction FedaPay non reconnue." });
      return true;
    }
    const amountMatches = !entity.amount || Math.round(Number(entity.amount)) === Math.round(Number(payment.amount));
    const approved = eventName === "transaction.approved" || entity.status === "approved";
    if (approved && !amountMatches) {
      payment.status = "failed";
      payment.securityError = "amount_mismatch";
    } else if (approved) payment.status = "succeeded";
    else if (eventName === "transaction.canceled" || entity.status === "canceled") payment.status = "cancelled";
    else if (eventName === "transaction.declined" || entity.status === "declined") payment.status = "failed";
    else if (eventName === "transaction.refunded" || entity.status === "refunded") payment.status = "refunded";
    else payment.status = entity.status || payment.status;
    payment.provider = "fedapay";
    payment.providerTransactionId = entity.id || payment.providerTransactionId;
    payment.providerReference = entity.reference || payment.providerReference;
    payment.updatedAt = new Date().toISOString();

    const orders = await readJsonFile(ordersFile, []);
    const order = orders.find((item) => item.id === payment.orderId);
    if (order) {
      order.payment = { id: payment.id, provider: "fedapay", status: payment.status };
      if (payment.status === "succeeded") {
        if (order.status === "pending") appendOrderEvent(order, "processing", "Paiement FedaPay confirmé.", "Paiement");
        await processAstralFulfillments(order);
      }
      if (["failed", "cancelled"].includes(payment.status)) appendOrderEvent(order, "pending", "Paiement FedaPay non finalisé.", "Paiement");
    }
    processed.unshift({ id: eventKey, name: eventName, createdAt: new Date().toISOString() });
    await Promise.all([
      writeJsonFile(paymentsFile, payments),
      writeJsonFile(ordersFile, orders),
      writeJsonFile(fedapayEventsFile, processed.slice(0, 1000))
    ]);
    sendJson(response, 200, { received: true });
    return true;
  }
  return false;
};

const handleMoneyFusionApi = async (request, response, pathname) => {
  if (request.method === "GET" && pathname === "/api/moneyfusion/config") {
    sendJson(response, 200, getMoneyFusionConfig());
    return true;
  }

  if (request.method === "GET" && pathname === "/api/moneyfusion/logs") {
    if (!requireAdmin(request, response)) return true;
    sendJson(response, 200, { logs: await readJsonFile(moneyFusionLogsFile, []) });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/moneyfusion/withdraw-methods") {
    if (!requireStrictAdmin(request, response)) return true;
    const result = await moneyFusionRequest(`${moneyFusionBaseUrl}/api/v1/withdraw/methods`, {
      usePrivateKey: true,
      operation: "withdraw_methods"
    });
    sendJson(response, 200, { methods: Array.isArray(result.data) ? result.data : [] });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/moneyfusion/withdrawals") {
    if (!requireStrictAdmin(request, response)) return true;
    if (!getMoneyFusionConfig().payoutConfigured) {
      sendJson(response, 503, { error: "Clé privée Money Fusion et secret webhook requis pour les retraits." });
      return true;
    }
    const body = await parseBody(request);
    if (body.confirm !== "WITHDRAW_MONEYFUSION_FUNDS") {
      sendJson(response, 409, { error: "Confirmation explicite requise avant le retrait." });
      return true;
    }
    const amount = Math.round(Number(body.amount));
    const countryCode = String(body.countryCode || "").trim().toLowerCase().slice(0, 2);
    const phone = String(body.phone || "").replace(/[^0-9+]/g, "");
    const withdrawMode = String(body.withdrawMode || "").trim();
    if (!Number.isFinite(amount) || amount < 200 || !countryCode || phone.length < 8 || !withdrawMode) {
      sendJson(response, 422, { error: "Pays, téléphone, méthode et montant d’au moins 200 FCFA requis." });
      return true;
    }
    const methodsResult = await moneyFusionRequest(`${moneyFusionBaseUrl}/api/v1/withdraw/methods`, {
      usePrivateKey: true,
      operation: "withdraw_methods_validation"
    });
    const countries = Array.isArray(methodsResult.data) ? methodsResult.data : [];
    const country = countries.find((item) => String(item.code || "").toLowerCase() === countryCode);
    const method = country?.paymentMethods?.find((item) => item.key === withdrawMode);
    if (!country || !method) {
      sendJson(response, 422, { error: "Méthode de retrait non autorisée pour ce pays." });
      return true;
    }
    const webhookUrl = new URL("/api/webhooks/moneyfusion/withdraw", appBaseUrl);
    webhookUrl.searchParams.set("secret", moneyFusionWebhookSecret);
    const result = await moneyFusionRequest(`${moneyFusionBaseUrl}/api/v1/withdraw`, {
      method: "POST",
      usePrivateKey: true,
      operation: "create_withdrawal",
      body: { countryCode, phone, amount, withdraw_mode: withdrawMode, webhook_url: webhookUrl.toString() }
    });
    const token = String(result.tokenPay || "").trim();
    if (!token) {
      sendJson(response, 502, { error: "Money Fusion n’a retourné aucun jeton de retrait." });
      return true;
    }
    const payouts = await readJsonFile(payoutsFile, []);
    const payout = {
      id: `MF-${token}`,
      provider: "moneyfusion",
      providerToken: token,
      reference: token,
      amount,
      currency: country.currency || "XOF",
      status: "pending",
      mode: withdrawMode,
      countryCode,
      phoneLast4: phone.slice(-4),
      environment: "live",
      kind: "merchant_withdrawal",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    payouts.unshift(payout);
    await writeJsonFile(payoutsFile, payouts);
    sendJson(response, 201, { payout });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/webhooks/moneyfusion") {
    const secret = new URL(request.url, appBaseUrl).searchParams.get("secret") || "";
    if (!moneyFusionWebhookSecret || !safeTextEqual(secret, moneyFusionWebhookSecret)) {
      sendJson(response, 401, { error: "Webhook Money Fusion non autorisé." });
      return true;
    }
    const event = await parseBody(request);
    const token = String(event.tokenPay || "").trim();
    if (!token) {
      sendJson(response, 400, { error: "Jeton de paiement absent." });
      return true;
    }
    const payments = await readJsonFile(paymentsFile, []);
    const payment = payments.find((item) => item.provider === "moneyfusion" && (item.providerToken === token || item.providerReference === token));
    if (!payment) {
      sendJson(response, 404, { error: "Paiement Money Fusion inconnu." });
      return true;
    }
    const orders = await readJsonFile(ordersFile, []);
    const order = orders.find((item) => item.id === payment.orderId);
    if (!order) {
      sendJson(response, 404, { error: "Commande associée introuvable." });
      return true;
    }
    const synced = await syncMoneyFusionPayment(payment, order);
    const events = await readJsonFile(moneyFusionEventsFile, []);
    const eventId = `${token}:${String(event.event || "notification")}:${synced.remoteStatus}`;
    if (!events.some((item) => item.id === eventId)) {
      events.unshift({ id: eventId, type: "payment", token, event: event.event, status: synced.remoteStatus, createdAt: new Date().toISOString() });
    }
    await Promise.all([
      writeJsonFile(paymentsFile, payments),
      writeJsonFile(ordersFile, orders),
      writeJsonFile(moneyFusionEventsFile, events.slice(0, 1000))
    ]);
    sendJson(response, 200, { received: true, paymentStatus: payment.status });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/webhooks/moneyfusion/withdraw") {
    const secret = new URL(request.url, appBaseUrl).searchParams.get("secret") || "";
    if (!moneyFusionWebhookSecret || !safeTextEqual(secret, moneyFusionWebhookSecret)) {
      sendJson(response, 401, { error: "Webhook de retrait non autorisé." });
      return true;
    }
    const event = await parseBody(request);
    const token = String(event.tokenPay || "").trim();
    const eventName = String(event.event || "").trim();
    if (!token || !["payout.session.completed", "payout.session.cancelled"].includes(eventName)) {
      sendJson(response, 400, { error: "Notification de retrait invalide." });
      return true;
    }
    const payouts = await readJsonFile(payoutsFile, []);
    const payout = payouts.find((item) => item.provider === "moneyfusion" && item.providerToken === token);
    if (!payout) {
      sendJson(response, 404, { error: "Retrait Money Fusion inconnu." });
      return true;
    }
    payout.status = eventName === "payout.session.completed" ? "succeeded" : "failed";
    payout.updatedAt = new Date().toISOString();
    const events = await readJsonFile(moneyFusionEventsFile, []);
    const eventId = `${token}:${eventName}`;
    if (!events.some((item) => item.id === eventId)) {
      events.unshift({ id: eventId, type: "withdrawal", token, event: eventName, status: payout.status, createdAt: new Date().toISOString() });
    }
    await Promise.all([
      writeJsonFile(payoutsFile, payouts),
      writeJsonFile(moneyFusionEventsFile, events.slice(0, 1000))
    ]);
    sendJson(response, 200, { received: true });
    return true;
  }

  return false;
};

const handlePayoutsApi = async (request, response, pathname) => {
  if (request.method === "GET" && pathname === "/api/payouts") {
    if (!requireStrictAdmin(request, response)) return true;
    sendJson(response, 200, { payouts: await readJsonFile(payoutsFile, []) });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/payouts") {
    if (!requireStrictAdmin(request, response)) return true;
    const body = await parseBody(request);
    if (containsRawCardData(body)) {
      sendJson(response, 422, { error: "Données bancaires brutes interdites." });
      return true;
    }
    const amount = Math.round(Number(body.amount));
    const customer = body.customer || {};
    if (!Number.isFinite(amount) || amount <= 0 || !customer.firstname || !customer.lastname || !customer.email) {
      sendJson(response, 422, { error: "Montant et bénéficiaire valides requis." });
      return true;
    }
    if (fedapayEnvironment === "live" && body.confirm !== "CREATE_LIVE_PAYOUT") {
      sendJson(response, 409, { error: "Confirmation explicite requise pour créer un payout live." });
      return true;
    }
    const result = await fedapayRequest("/payouts", {
      method: "POST",
      body: {
        amount,
        currency: { iso: "XOF" },
        customer: {
          firstname: String(customer.firstname).trim(),
          lastname: String(customer.lastname).trim(),
          email: String(customer.email).trim()
        },
        mode: String(body.mode || "mobile_money")
      }
    });
    const payouts = await readJsonFile(payoutsFile, []);
    const payout = {
      id: String(result.id), reference: result.reference, amount: result.amount || amount,
      status: result.status || "pending", mode: result.mode || body.mode || "mobile_money",
      beneficiary: { name: `${customer.firstname} ${customer.lastname}`, email: customer.email },
      environment: fedapayEnvironment, createdAt: result.created_at || new Date().toISOString(), updatedAt: result.updated_at || new Date().toISOString()
    };
    payouts.unshift(payout);
    await writeJsonFile(payoutsFile, payouts);
    sendJson(response, 201, { payout });
    return true;
  }

  const payoutId = pathname.startsWith("/api/payouts/") ? pathname.split("/")[3] : "";
  if (request.method === "POST" && payoutId && pathname.endsWith("/start")) {
    if (!requireStrictAdmin(request, response)) return true;
    const body = await parseBody(request);
    if (fedapayEnvironment === "live" && body.confirm !== "START_LIVE_PAYOUT") {
      sendJson(response, 409, { error: "Confirmation explicite requise pour démarrer un payout live." });
      return true;
    }
    const payouts = await readJsonFile(payoutsFile, []);
    const payout = payouts.find((item) => item.id === payoutId);
    if (!payout) {
      sendJson(response, 404, { error: "Payout introuvable." });
      return true;
    }
    const phone = String(body.phoneNumber || "").replace(/[^0-9+]/g, "");
    const country = String(body.country || "SN").toUpperCase().slice(0, 2);
    if (!phone) {
      sendJson(response, 422, { error: "Numéro du bénéficiaire requis." });
      return true;
    }
    const result = await fedapayRequest("/payouts/start", {
      method: "PUT",
      body: [{ id: Number(payout.id), scheduled_at: body.scheduledAt || new Date().toISOString(), phone_number: { number: phone, country } }]
    });
    const remote = Array.isArray(result) ? result[0] : result;
    payout.status = remote?.status || "scheduled";
    payout.updatedAt = remote?.updated_at || new Date().toISOString();
    payout.scheduledAt = remote?.scheduled_at || body.scheduledAt;
    await writeJsonFile(payoutsFile, payouts);
    sendJson(response, 200, { payout });
    return true;
  }
  return false;
};

const handleWithdrawalsApi = async (request, response, pathname) => {
  if (request.method !== "POST" || pathname !== "/api/withdrawals") return false;
  if (!requireStrictAdmin(request, response)) return true;
  const body = await parseBody(request);
  const amount = Math.round(Number(body.amount));
  const customer = body.customer || {};
  const phone = String(body.phoneNumber || "").replace(/[^0-9+]/g, "");
  const country = String(body.country || "SN").trim().toUpperCase().slice(0, 2);
  const mode = String(body.mode || "mobile_money");
  if (!Number.isFinite(amount) || amount <= 0 || !customer.firstname || !customer.lastname || !customer.email || !phone) {
    sendJson(response, 422, { error: "Montant, identité et téléphone du bénéficiaire requis." });
    return true;
  }
  if (fedapayEnvironment === "live" && body.confirm !== "WITHDRAW_LIVE_FUNDS") {
    sendJson(response, 409, { error: "Confirmation explicite requise pour retirer des fonds live." });
    return true;
  }
  const balanceResult = await fedapayRequest("/balances");
  const balanceSource = Array.isArray(balanceResult) ? balanceResult : balanceResult?.balances || balanceResult?.data || [];
  const totalAvailable = balanceSource.reduce((total, item) => total + Number(item.amount || 0), 0);
  if (amount > totalAvailable) {
    sendJson(response, 422, { error: `Solde insuffisant. Disponible : ${totalAvailable.toLocaleString("fr-FR")} XOF.` });
    return true;
  }
  const result = await fedapayRequest("/payouts", {
    method: "POST",
    body: {
      amount,
      currency: { iso: "XOF" },
      customer: {
        firstname: String(customer.firstname).trim(),
        lastname: String(customer.lastname).trim(),
        email: String(customer.email).trim()
      },
      mode
    }
  });
  const payouts = await readJsonFile(payoutsFile, []);
  const payout = {
    id: String(result.id), reference: result.reference, amount: result.amount || amount,
    status: result.status || "pending", mode: result.mode || mode,
    beneficiary: { name: `${customer.firstname} ${customer.lastname}`, email: customer.email },
    environment: fedapayEnvironment, kind: "merchant_withdrawal",
    createdAt: result.created_at || new Date().toISOString(), updatedAt: result.updated_at || new Date().toISOString()
  };
  payouts.unshift(payout);
  await writeJsonFile(payoutsFile, payouts);
  try {
    const startResult = await fedapayRequest("/payouts/start", {
      method: "PUT",
      body: [{ id: Number(payout.id), scheduled_at: body.scheduledAt || new Date().toISOString(), phone_number: { number: phone, country } }]
    });
    const remote = Array.isArray(startResult) ? startResult[0] : startResult;
    payout.status = remote?.status || "scheduled";
    payout.scheduledAt = remote?.scheduled_at || body.scheduledAt || new Date().toISOString();
    payout.updatedAt = remote?.updated_at || new Date().toISOString();
    await writeJsonFile(payoutsFile, payouts);
    sendJson(response, 201, { payout, remainingEstimate: Math.max(0, totalAvailable - amount) });
  } catch (error) {
    payout.startError = error.message;
    payout.updatedAt = new Date().toISOString();
    await writeJsonFile(payoutsFile, payouts);
    sendJson(response, error.statusCode || 502, { error: `Payout créé mais non démarré : ${error.message}`, payout });
  }
  return true;
};

const handleAdminAuthApi = async (request, response, pathname) => {
  if (request.method === "POST" && pathname === "/api/admin/login") {
    if (!adminEmail || !adminPasswordHash) {
      sendJson(response, 503, { error: "Compte administrateur non configuré sur le serveur." });
      return true;
    }
    if (!requestHasValidOrigin(request)) {
      sendJson(response, 403, { error: "Origine de connexion refusée." });
      return true;
    }
    const clientIp = String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim();
    const now = Date.now();
    const attempt = adminLoginAttempts.get(clientIp);
    if (attempt?.blockedUntil > now) {
      const retryAfter = Math.max(1, Math.ceil((attempt.blockedUntil - now) / 1000));
      sendJson(response, 429, { error: "Trop de tentatives. Réessayez plus tard." }, { "Retry-After": String(retryAfter) });
      return true;
    }
    if (attempt && attempt.resetAt <= now) adminLoginAttempts.delete(clientIp);
    const body = await parseBody(request);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
    const password = String(body.password || "").slice(0, 256);
    const valid = safeTextEqual(email, adminEmail) && verifyAdminPassword(password);
    if (!valid) {
      const current = adminLoginAttempts.get(clientIp) || { failures: 0, resetAt: now + 15 * 60_000, blockedUntil: 0 };
      current.failures += 1;
      if (current.failures >= 5) current.blockedUntil = now + 15 * 60_000;
      adminLoginAttempts.set(clientIp, current);
      sendJson(response, 401, { error: "Adresse e-mail ou mot de passe incorrect." });
      return true;
    }
    adminLoginAttempts.delete(clientIp);
    for (const [token, session] of adminSessions) {
      if (session.expiresAt <= now) adminSessions.delete(token);
    }
    while (adminSessions.size >= 10) adminSessions.delete(adminSessions.keys().next().value);
    const token = randomBytes(32).toString("base64url");
    const session = {
      email: adminEmail,
      csrfToken: randomBytes(32).toString("base64url"),
      createdAt: now,
      expiresAt: now + adminSessionDurationMs
    };
    adminSessions.set(token, session);
    sendJson(response, 200, {
      authenticated: true,
      user: { email: session.email },
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString()
    }, { "Set-Cookie": adminCookie(token) });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/admin/session") {
    if (!requireAdmin(request, response)) return true;
    sendJson(response, 200, {
      authenticated: true,
      user: { email: request.adminSession.email },
      csrfToken: request.adminSession.csrfToken,
      expiresAt: new Date(request.adminSession.expiresAt).toISOString()
    });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/admin/logout") {
    if (!requireAdmin(request, response)) return true;
    adminSessions.delete(request.adminSession.token);
    sendJson(response, 200, { authenticated: false }, { "Set-Cookie": adminCookie("", 0) });
    return true;
  }

  return false;
};

const handleAdminApi = async (request, response, pathname) => {
  if (request.method !== "GET" || pathname !== "/api/admin/dashboard") return false;
  if (!requireAdmin(request, response)) return true;
  const [orders, products] = await Promise.all([readJsonFile(ordersFile, []), readJsonFile(productsFile, [])]);
  const customers = buildCustomers(orders);
  let registeredCustomerCount = 0;
  if (databasePool) {
    const result = await databasePool.query("SELECT COUNT(*)::int AS count FROM customer_accounts");
    registeredCustomerCount = result.rows[0]?.count || 0;
  }
  const now = new Date();
  const sales = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - offset));
    const next = new Date(day); next.setDate(next.getDate() + 1);
    return {
      label: day.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      count: orders.filter((order) => { const created = new Date(order.createdAt); return created >= day && created < next; }).length
    };
  });
  sendJson(response, 200, {
    stats: {
      revenue: orders.filter((order) => order.status !== "cancelled").reduce((total, order) => total + Number(order.total || 0), 0),
      orders: orders.length,
      pendingOrders: orders.filter((order) => ["pending", "processing", "prepared"].includes(order.status)).length,
      customers: Math.max(customers.length, registeredCustomerCount),
      products: products.length,
      lowStock: products.filter((product) => product.type === "physical" && Number(product.stock || 0) <= 5).length
    },
    sales,
    recentOrders: orders.slice(0, 6),
    services: {
      astral: getAstralConfig(),
      payments: getMoneyFusionConfig()
    }
  });
  return true;
};

const handleTrackingApi = async (request, response, pathname) => {
  if (request.method !== "GET" || !pathname.startsWith("/api/tracking/")) return false;
  if (!allowPublicApiRequest(request, response, "public-tracking", 60)) return true;
  const lookup = decodeURIComponent(pathname.replace("/api/tracking/", "")).trim();
  const orders = await readJsonFile(ordersFile, []);
  const index = orders.findIndex((item) => item.trackingNumber === lookup);
  let order = index === -1 ? null : orders[index];
  if (order?.payment?.provider === "moneyfusion") {
    const payments = await readJsonFile(paymentsFile, []);
    const payment = payments.find((item) => item.id === order.payment.id || item.orderId === order.id);
    const lastVerifiedAt = payment?.lastVerifiedAt ? new Date(payment.lastVerifiedAt).getTime() : 0;
    if (payment?.providerToken && (payment.status !== "succeeded" || Date.now() - lastVerifiedAt > 60_000)) {
      try {
        await syncMoneyFusionPayment(payment, order);
        await writeJsonFile(paymentsFile, payments);
      } catch {
        // Le suivi local reste disponible si Money Fusion est momentanément indisponible.
      }
    }
  }
  if (order) order = await syncOrderWithAstral(order);
  if (!order) sendJson(response, 404, { error: "Aucune commande trouvée pour cette référence." });
  else {
    orders[index] = order;
    await writeJsonFile(ordersFile, orders);
    sendJson(response, 200, { order: publicOrderView(order) });
  }
  return true;
};

await initializeDatabase();

const requestHandler = async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);

  if (request.method === "GET" && pathname === "/robots.txt") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" });
    response.end(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /panier\nDisallow: /paiement\nDisallow: /favoris\nDisallow: /suivi\nDisallow: /compte\nSitemap: ${publicSiteUrl}/sitemap.xml\n`);
    return;
  }

  if (request.method === "GET" && pathname === "/sitemap.xml") {
    const pages = ["/", "/boutique", "/jeux", "/produits-digitaux", "/categories"];
    const products = await readJsonFile(productsFile, []);
    const pageUrls = pages.map((page) => `<url><loc>${publicSiteUrl}${page}</loc><changefreq>${page === "/" ? "daily" : "weekly"}</changefreq><priority>${page === "/" ? "1.0" : "0.8"}</priority></url>`);
    const productUrls = products
      .filter((product) => product.type === "physical" || Boolean(product.photo && product.sourceImageUrl))
      .map((product) => `<url><loc>${publicSiteUrl}/produit?id=${encodeURIComponent(product.id)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
    const urls = [...pageUrls, ...productUrls].join("");
    response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" });
    response.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
    return;
  }

  if (request.method === "GET" && pathname === "/health") {
    let database = databasePool ? "connected" : "file-fallback";
    if (databasePool) {
      try { await databasePool.query("SELECT 1"); } catch { database = "unavailable"; }
    }
    sendJson(response, database === "unavailable" ? 503 : 200, { status: database === "unavailable" ? "degraded" : "ok", service: "silverse-shop", environment: process.env.NODE_ENV || "development", database });
    return;
  }

  try {
    if (pathname.startsWith("/api/admin/") && await handleAdminAuthApi(request, response, pathname)) return;
    if ((pathname.startsWith("/api/auth") || pathname.startsWith("/api/account")) && await handleCustomerAuthApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/product-images") && await handleProductImagesApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/products") && await handleProductsApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/cart") && await handleCartApi(request, response, pathname)) return;
    if ((pathname.startsWith("/api/astral") || pathname === "/api/catalog/player-lookup") && await handleAstralApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/orders") && await handleOrdersApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/customers") && await handleCustomersApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/payments") && await handlePaymentsApi(request, response, pathname)) return;
    if ((pathname.startsWith("/api/fedapay") || pathname === "/api/webhooks/fedapay") && await handleFedaPayApi(request, response, pathname)) return;
    if ((pathname.startsWith("/api/moneyfusion") || pathname.startsWith("/api/webhooks/moneyfusion")) && await handleMoneyFusionApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/payouts") && await handlePayoutsApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/withdrawals") && await handleWithdrawalsApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/admin") && await handleAdminApi(request, response, pathname)) return;
    if (pathname.startsWith("/api/tracking") && await handleTrackingApi(request, response, pathname)) return;
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.statusCode ? error.message : "Erreur serveur." });
    return;
  }

  const adminSession = getAdminSession(request);
  if (request.method === "GET" && pathname === "/admin-login" && adminSession) {
    response.writeHead(302, { "Location": "/admin", "Cache-Control": "no-store" });
    response.end();
    return;
  }
  if (pathname === "/admin.js" && !adminSession) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end("Not found");
    return;
  }

  const routeMap = {
    "/favoris": "/favorites.html",
    "/panier": "/cart.html",
    "/compte": "/contact.html",
    "/boutique": "/boutique.html",
    "/produits-digitaux": "/digital.html",
    "/jeux": "/gaming.html",
    "/categories": "/categories.html",
    "/paiement": "/checkout.html",
    "/produit": "/product.html",
    "/suivi": "/tracking.html",
    "/admin-login": "/admin-login.html",
    "/admin": adminSession ? "/admin.html" : "/admin-login.html",
    "/admin.html": adminSession ? "/admin.html" : "/admin-login.html"
  };
  const requestedPath = pathname === "/" ? "/index.html" : routeMap[pathname] || pathname;
  const publicRootExtensions = new Set([".html", ".css", ".js", ".webmanifest"]);
  const publicAssetExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);
  const isRootPublicFile = !requestedPath.slice(1).includes("/") && publicRootExtensions.has(extname(requestedPath).toLowerCase());
  const isPublicAsset = requestedPath.startsWith("/assets/") && publicAssetExtensions.has(extname(requestedPath).toLowerCase());
  if (!isRootPublicFile && !isPublicAsset) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    response.end("Not found");
    return;
  }
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
  };
  response.writeHead(200, headers);
  if (extname(filePath).toLowerCase() === ".html") {
    const html = (await readFile(filePath, "utf8")).replaceAll("__SITE_URL__", publicSiteUrl);
    response.end(html);
    return;
  }
  createReadStream(filePath).pipe(response);
};

export default requestHandler;

if (!process.env.VERCEL) {
  createServer(requestHandler).listen(port, host, () => {
    process.stdout.write(`SILVERSE SHOP: http://${host}:${port}\n`);
    const firstAstralReconciliation = setTimeout(() => void reconcilePaidAstralOrders(), 15_000);
    const recurringAstralReconciliation = setInterval(() => void reconcilePaidAstralOrders(), astralOrderRetryIntervalMs);
    firstAstralReconciliation.unref();
    recurringAstralReconciliation.unref();
  });
}
