const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
document.body.classList.add("is-loaded");
const state = { dashboard: null, products: [], orders: [], customers: [], payments: [], payouts: [], moneyfusion: null, moneyFusionMethods: [], session: null };
let toastTimer;
let csrfToken = "";

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const money = (value, currency = "FCFA") => `${Number(value || 0).toLocaleString("fr-FR")} ${currency}`;
const date = (value) => value ? new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const statusLabel = { pending: "En attente", processing: "En traitement", prepared: "Préparée", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée", succeeded: "Payé", failed: "Échoué" };
const status = (value = "pending") => `<span class="admin-status is-${escapeHtml(value)}">${statusLabel[value] || escapeHtml(value)}</span>`;

const showToast = (message) => {
  const toast = $("[data-admin-toast]");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
};

const adminFetch = async (url, options = {}) => {
  const method = String(options.method || "GET").toUpperCase();
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 401) {
    window.location.replace("/admin");
    throw new Error("Session administrateur expirée.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Opération impossible");
  return data;
};

const emptyRow = (columns, label = "Aucune donnée pour le moment") => `<tr><td colspan="${columns}" class="admin-empty">${label}</td></tr>`;
const deliveryLabel = (order) => {
  if (!order.delivery) return "Digital";
  if (order.delivery.method === "current_location") return "Position GPS";
  if (order.delivery.method === "communicate_later") return "Adresse plus tard";
  return "Adresse reçue";
};
const orderRow = (order, action = false) => `<tr><td><strong>${escapeHtml(order.id)}</strong><small>${escapeHtml(order.trackingNumber || "")}</small></td><td><strong>${escapeHtml(`${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim() || "Client invité")}</strong><small>${escapeHtml(order.customer?.email || "")}</small></td>${action ? `<td>${order.items?.length || 0}</td><td><span class="admin-delivery-pill ${order.delivery?.status === "awaiting_address" ? "is-waiting" : ""}">${escapeHtml(deliveryLabel(order))}</span></td>` : ""}<td>${money(order.total)}</td><td>${status(order.status)}</td>${action ? `<td><button class="admin-table-action" type="button" data-order-select="${escapeHtml(order.id)}">Voir et traiter</button></td>` : `<td>${date(order.createdAt)}</td>`}</tr>`;

const renderDashboard = () => {
  const data = state.dashboard;
  if (!data) return;
  $("[data-stat-revenue]").textContent = money(data.stats.revenue);
  $("[data-stat-orders]").textContent = data.stats.orders;
  $("[data-stat-pending]").textContent = data.stats.pendingOrders;
  $("[data-pending-badge]").textContent = data.stats.pendingOrders;
  $("[data-stat-customers]").textContent = data.stats.customers;
  $("[data-stat-products]").textContent = data.stats.products;
  $("[data-stat-low-stock]").textContent = data.stats.lowStock;
  $("[data-admin-mode]").textContent = data.services.astral.mode || "sandbox";
  const max = Math.max(1, ...data.sales.map((item) => item.count));
  $("[data-sales-chart]").innerHTML = data.sales.map((item) => `<div class="admin-bar" style="height:${Math.max(8, item.count / max * 100)}%" title="${item.count} commande(s)"><span>${escapeHtml(item.label)}</span></div>`).join("");
  $("[data-service-status]").innerHTML = [
    ["Backend API", true, "Opérationnel"], ["Stockage local", true, "Prêt pour migration DB"],
    ["Catalogue connecté", data.services.astral.configured, data.services.astral.configured ? data.services.astral.mode : "Clé requise"],
    ["Prestataire paiement", data.services.payments.configured, data.services.payments.configured ? data.services.payments.provider : "À connecter"]
  ].map(([name, online, text]) => `<div class="admin-service"><i class="${online ? "" : "is-off"}"></i><strong>${name}</strong><small>${text}</small></div>`).join("");
  $("[data-recent-orders]").innerHTML = data.recentOrders.length ? data.recentOrders.map((item) => orderRow(item)).join("") : emptyRow(5, "Les nouvelles commandes apparaîtront ici");
};

const renderOrders = () => { $("[data-all-orders]").innerHTML = state.orders.length ? state.orders.map((item) => orderRow(item, true)).join("") : emptyRow(7); };

const renderOrderDetail = (order) => {
  const root = $("[data-admin-order-detail]");
  const content = $("[data-admin-order-detail-content]");
  if (!root || !content || !order) return;
  const customer = order.customer || {};
  const delivery = order.delivery;
  const address = delivery?.address
    ? [delivery.address.address, delivery.address.city, delivery.address.country].filter(Boolean).join(", ")
    : [customer.address, customer.city, customer.country].filter(Boolean).join(", ");
  const coordinates = delivery?.coordinates;
  const locationLink = coordinates
    ? `<a class="admin-location-link" href="https://www.google.com/maps?q=${encodeURIComponent(`${coordinates.latitude},${coordinates.longitude}`)}" target="_blank" rel="noopener">Ouvrir la position sur la carte ↗</a>`
    : "";
  const pendingDigitalForms = (order.items || []).filter((item) => item.provider === "astral" && !item.fulfillment?.astralOrderId && !["accepted", "processing", "running", "pending", "queued", "shipped", "sent", "delivered", "completed", "success", "done"].includes(String(item.fulfillment?.state || "").toLowerCase())).map((item) => `
    <section class="admin-order-delivery-form"><span>Livraison numérique · ${escapeHtml(item.name)}</span><p>${escapeHtml(item.fulfillment?.error || "Informations à vérifier avant la transmission.")}</p><form class="admin-form" data-order-fulfillment-form data-order-id="${escapeHtml(order.id)}"><input type="hidden" name="itemId" value="${escapeHtml(item.id)}"><div class="admin-form-row"><label>UID / identifiant joueur<input name="playerId" value="${escapeHtml(item.fulfillment?.playerId || "")}" ${item.requiresPlayerId ? "required" : ""}></label><label>Région / serveur<input name="region" value="${escapeHtml(item.fulfillment?.region || "")}" ${item.requiresRegion ? "required" : ""}></label></div><label>Pseudo (facultatif)<input name="nickname" value="${escapeHtml(item.fulfillment?.nickname || "")}"></label><button class="admin-primary" type="submit">Enregistrer et transmettre</button></form></section>`).join("");
  content.innerHTML = `
    <section><span>Client</span><strong>${escapeHtml(`${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Client")}</strong><p>${escapeHtml(customer.email || "—")}<br>${escapeHtml(customer.phone || "—")}</p></section>
    <section><span>Livraison</span><strong>${escapeHtml(delivery?.methodLabel || "Commande digitale")}</strong><p>${escapeHtml(delivery?.statusLabel || "Livraison digitale")}${delivery ? " · délai annoncé : 24 h" : ""}</p>${address ? `<p>${escapeHtml(address)}</p>` : ""}${locationLink}</section>
    <section><span>Paiement</span><strong>${money(order.total)}</strong><p>${escapeHtml(order.payment?.status === "succeeded" ? "Paiement confirmé" : "Paiement en attente")}</p></section>
    <section class="admin-order-items"><span>Articles</span>${(order.items || []).map((item) => `<div><strong>${escapeHtml(item.name)}</strong><small>${item.qty || 1} × ${money(item.unitPrice)}</small></div>`).join("")}</section>
    ${pendingDigitalForms}
    ${delivery ? `<section class="admin-order-delivery-form"><span>Confirmer ou modifier l’adresse</span><form class="admin-form" data-order-delivery-form data-order-id="${escapeHtml(order.id)}"><label>Adresse<input name="address" value="${escapeHtml(address ? (delivery.address?.address || customer.address || "") : "")}" required placeholder="Quartier, rue, repère"></label><div class="admin-form-row"><label>Ville<input name="city" value="${escapeHtml(delivery.address?.city || customer.city || "")}" required></label><label>Pays<input name="country" value="${escapeHtml(delivery.address?.country || customer.country || "Togo")}" required></label></div><button class="admin-primary" type="submit">Enregistrer l’adresse</button></form></section>` : ""}
  `;
  root.hidden = false;
  root.scrollIntoView({ behavior: "smooth", block: "center" });
};
const renderCustomers = () => { $("[data-customers-table]").innerHTML = state.customers.length ? state.customers.map((item) => `<tr><td><strong>${escapeHtml(item.name || item.email || "Client")}</strong><small>${escapeHtml(item.email || "")}</small></td><td>${escapeHtml(item.phone || "—")}</td><td>${item.orderCount || 0}</td><td>${money(item.totalSpent)}</td><td>${date(item.lastOrderAt)}</td></tr>`).join("") : emptyRow(5); };
const renderPayments = () => { $("[data-payments-table]").innerHTML = state.payments.length ? state.payments.map((item) => `<tr><td><strong>${escapeHtml(item.id)}</strong><small>${escapeHtml(item.providerReference || "")}</small></td><td>${escapeHtml(item.orderId || "—")}</td><td>${escapeHtml(item.provider || "manual")}</td><td>${money(item.amount, item.currency)}</td><td>${status(item.status)}</td><td>${date(item.createdAt)}</td></tr>`).join("") : emptyRow(6, "Aucun paiement enregistré"); };

const renderProducts = () => {
  $("[data-product-count]").textContent = state.products.length;
  $("[data-products-list]").innerHTML = state.products.length ? state.products.map((item) => {
    const connected = String(item.id).startsWith("product-");
    return `<div class="admin-product-item" data-search-value="${escapeHtml(`${item.name} ${item.categoryLabel} ${item.id}`.toLowerCase())}"><span class="admin-product-placeholder">${escapeHtml(item.name.charAt(0).toUpperCase())}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.categoryLabel || item.category)} · Stock ${item.stock}${connected ? " · Synchronisé" : " · Boutique physique"}</small></div><div class="admin-product-controls"><b>${escapeHtml(item.priceLabel)}</b>${connected ? `<span class="admin-synced-label">Automatique</span>` : `<button type="button" data-product-edit="${escapeHtml(item.id)}">Modifier</button><button type="button" data-product-delete="${escapeHtml(item.id)}">Supprimer</button>`}</div></div>`;
  }).join("") : `<p class="admin-empty">Aucun produit</p>`;
  const categories = state.products.reduce((acc, product) => { const key = product.categoryLabel || product.category || "Autre"; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  $("[data-categories-grid]").innerHTML = Object.entries(categories).map(([name, count]) => `<article><i>${escapeHtml(name.charAt(0).toUpperCase())}</i><strong>${escapeHtml(name)}</strong><span>${count} produit${count > 1 ? "s" : ""}</span></article>`).join("");
};

const renderPayouts = () => {
  const root = $("[data-payouts-list]");
  if (!root) return;
  root.innerHTML = state.payouts.length ? state.payouts.map((item) => `<div class="admin-product-item"><span class="admin-product-placeholder">↗</span><div><strong>${escapeHtml(item.beneficiary?.name || item.reference || item.id)}</strong><small>${escapeHtml(item.reference || item.id)} · ${escapeHtml(item.mode || "")}</small></div><div><b>${money(item.amount, "XOF")}</b>${status(item.status)}</div></div>`).join("") : `<p class="admin-empty">Aucun payout</p>`;
};

const renderMoneyFusionMethods = () => {
  const countrySelect = $("[data-moneyfusion-country]");
  const methodSelect = $("[data-moneyfusion-method]");
  if (!countrySelect || !methodSelect) return;
  countrySelect.innerHTML = `<option value="">Choisissez un pays</option>${state.moneyFusionMethods.map((item) => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.country)} (${escapeHtml(item.currency || "XOF")})</option>`).join("")}`;
  methodSelect.innerHTML = `<option value="">Choisissez un pays</option>`;
};

const updateMoneyFusionMethodOptions = () => {
  const countryCode = $("[data-moneyfusion-country]")?.value || "";
  const country = state.moneyFusionMethods.find((item) => item.code === countryCode);
  const methodSelect = $("[data-moneyfusion-method]");
  if (!methodSelect) return;
  methodSelect.innerHTML = `<option value="">Choisissez une méthode</option>${(country?.paymentMethods || []).map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.name)}</option>`).join("")}`;
};

const loadMoneyFusion = async () => {
  const balanceNode = $("[data-fedapay-balance]");
  const modeNode = $("[data-fedapay-balance-mode]");
  try {
    state.moneyfusion = await adminFetch("/api/moneyfusion/config");
    const connection = $("[data-fedapay-connection]");
    connection.textContent = state.moneyfusion.configured ? "Encaissements connectés" : "Lien API requis";
    connection.classList.toggle("is-online", state.moneyfusion.configured);
    balanceNode.textContent = state.moneyfusion.paymentConfigured ? "Activé" : "Non configuré";
    modeNode.textContent = state.moneyfusion.paymentConfigured ? "Paiements Money Fusion disponibles" : "Ajoutez MONEYFUSION_PAYMENT_URL";
    $("[data-fedapay-environment]").textContent = state.moneyfusion.payoutConfigured ? "Activés" : "Non configurés";
    if (state.moneyfusion.payoutConfigured) {
      state.moneyFusionMethods = (await adminFetch("/api/moneyfusion/withdraw-methods")).methods || [];
    } else state.moneyFusionMethods = [];
    renderMoneyFusionMethods();
    try { state.payouts = (await adminFetch("/api/payouts")).payouts || []; } catch { state.payouts = []; }
    renderPayouts();
  } catch (error) {
    balanceNode.textContent = "Indisponible";
    modeNode.textContent = error.message;
  }
};

const loadAdmin = async () => {
  try {
    const [dashboard, products, orders, customers, payments, astral] = await Promise.all([
      adminFetch("/api/admin/dashboard"), adminFetch("/api/products?limit=2000&include_hidden=1"), adminFetch("/api/orders"), adminFetch("/api/customers"), adminFetch("/api/payments"), adminFetch("/api/astral/config")
    ]);
    state.dashboard = dashboard; state.products = products.products || []; state.orders = orders.orders || []; state.customers = customers.customers || []; state.payments = payments.payments || [];
    renderDashboard(); renderProducts(); renderOrders(); renderCustomers(); renderPayments();
    const connection = $("[data-astral-connection]");
    connection.textContent = astral.configured ? `Connecté · ${astral.mode}` : "Clé API requise";
    connection.classList.toggle("is-online", astral.configured);
    await loadMoneyFusion();
  } catch (error) { showToast(error.message); }
};

const showView = (view) => {
  $$("[data-admin-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.adminPanel === view));
  $$("[data-admin-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.adminView === view));
  $("[data-admin-sidebar]").classList.remove("is-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

$$('[data-admin-view]').forEach((button) => button.addEventListener("click", () => showView(button.dataset.adminView)));
$$('[data-admin-view-target]').forEach((button) => button.addEventListener("click", () => showView(button.dataset.adminViewTarget)));
$("[data-open-admin-menu]").addEventListener("click", () => $("[data-admin-sidebar]").classList.add("is-open"));
$("[data-close-admin-menu]").addEventListener("click", () => $("[data-admin-sidebar]").classList.remove("is-open"));
$("[data-refresh-admin]").addEventListener("click", loadAdmin);
$("[data-admin-search]").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  $$("[data-search-value]").forEach((item) => { item.hidden = query && !item.dataset.searchValue.includes(query); });
  if (query) showView("products");
});

$("[data-all-orders]").addEventListener("click", (event) => { const id = event.target.closest("[data-order-select]")?.dataset.orderSelect; if (!id) return; const order = state.orders.find((item) => item.id === id); renderOrderDetail(order); const input = $("[data-order-status-form] [name=reference]"); input.value = id; });
$("[data-close-order-detail]")?.addEventListener("click", () => { $("[data-admin-order-detail]").hidden = true; });
$("[data-admin-order-detail-content]")?.addEventListener("submit", async (event) => {
  const fulfillmentForm = event.target.closest("[data-order-fulfillment-form]");
  if (fulfillmentForm) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(fulfillmentForm));
    try {
      await adminFetch(`/api/orders/${encodeURIComponent(fulfillmentForm.dataset.orderId)}/fulfillment`, { method: "PATCH", body: JSON.stringify(values) });
      showToast("Informations enregistrées, transmission relancée");
      await loadAdmin();
      renderOrderDetail(state.orders.find((item) => item.id === fulfillmentForm.dataset.orderId));
    } catch (error) { showToast(error.message); }
    return;
  }
  const form = event.target.closest("[data-order-delivery-form]");
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  try {
    await adminFetch(`/api/orders/${encodeURIComponent(form.dataset.orderId)}/delivery`, { method: "PATCH", body: JSON.stringify(values) });
    showToast("Adresse de livraison enregistrée");
    await loadAdmin();
    renderOrderDetail(state.orders.find((item) => item.id === form.dataset.orderId));
  } catch (error) { showToast(error.message); }
});
$("[data-order-status-form]").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const body = Object.fromEntries(new FormData(form));
  try { await adminFetch(`/api/orders/${encodeURIComponent(body.reference)}/status`, { method: "PATCH", body: JSON.stringify({ status: body.status, note: body.note, location: "SILVERSE SHOP" }) }); showToast("Commande mise à jour"); form.reset(); await loadAdmin(); } catch (error) { showToast(error.message); }
});

const productForm = $("[data-product-admin-form]");
const resetProductForm = () => {
  productForm.reset(); productForm.dataset.editingId = "";
  $("[data-product-form-title]").textContent = "Ajouter un article physique";
  $("[data-product-submit]").textContent = "Ajouter l’article";
  $("[data-product-cancel]").hidden = true;
};

productForm.addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
  const details = String(values.details || "").split("\n").map((item) => item.trim()).filter(Boolean);
  const payload = { ...values, id: values.id || undefined, price: Number(values.price), oldPrice: values.oldPrice ? Number(values.oldPrice) : undefined, shippingFee: Number(values.shippingFee || 0), stock: Number(values.stock), details, photo: "", media: values.type === "digital" ? "media-blue" : "media-neutral", categoryLabel: values.category, requiresPlayerId: values.requiresPlayerId === "true", requiresRegion: values.requiresRegion === "true", astralProductId: values.astralProductId ? Number(values.astralProductId) : undefined, astralVariationId: values.astralVariationId || undefined };
  const editingId = form.dataset.editingId;
  try { const data = await adminFetch(editingId ? `/api/products/${encodeURIComponent(editingId)}` : "/api/products", { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }); showToast(`${data.product.name} ${editingId ? "modifié" : "ajouté"}`); resetProductForm(); await loadAdmin(); } catch (error) { showToast(error.message); }
});

$("[data-products-list]").addEventListener("click", async (event) => {
  const editId = event.target.closest("[data-product-edit]")?.dataset.productEdit;
  const deleteId = event.target.closest("[data-product-delete]")?.dataset.productDelete;
  if (editId) {
    const product = state.products.find((item) => item.id === editId); if (!product) return;
    productForm.dataset.editingId = editId;
    Object.entries(product).forEach(([key, value]) => { const field = productForm.elements.namedItem(key); if (!field || typeof value === "object") return; if (field.type === "checkbox") field.checked = Boolean(value); else field.value = value ?? ""; });
    productForm.elements.namedItem("details").value = (product.details || []).join("\n");
    $("[data-product-form-title]").textContent = `Modifier ${product.name}`; $("[data-product-submit]").textContent = "Enregistrer"; $("[data-product-cancel]").hidden = false; productForm.scrollIntoView({ behavior: "smooth" });
  }
  if (deleteId && window.confirm("Supprimer définitivement ce produit du catalogue ?")) {
    try { await adminFetch(`/api/products/${encodeURIComponent(deleteId)}`, { method: "DELETE" }); showToast("Produit supprimé"); await loadAdmin(); } catch (error) { showToast(error.message); }
  }
});
$("[data-product-cancel]").addEventListener("click", resetProductForm);

$("[data-payout-form]").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
  if (!values.confirmPayout) return;
  try {
    await adminFetch("/api/moneyfusion/withdrawals", { method: "POST", body: JSON.stringify({ amount: Number(values.amount), countryCode: values.countryCode, withdrawMode: values.withdrawMode, phone: values.phone, confirm: "WITHDRAW_MONEYFUSION_FUNDS" }) });
    showToast("Demande de retrait Money Fusion envoyée"); form.reset(); await loadMoneyFusion();
  } catch (error) { showToast(error.message); }
});
$("[data-refresh-balance]").addEventListener("click", loadMoneyFusion);
$("[data-moneyfusion-country]")?.addEventListener("change", updateMoneyFusionMethodOptions);

const showAstralResult = (value) => { $("[data-astral-admin-result]").textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2); };
$("[data-astral-balance]").addEventListener("click", async () => { showAstralResult("Chargement…"); try { showAstralResult(await adminFetch("/api/astral/balance")); } catch (error) { showAstralResult(error.message); } });
$("[data-astral-import]").addEventListener("click", async () => { showAstralResult("Import en cours…"); try { const data = await adminFetch("/api/astral/import-products", { method: "POST", body: JSON.stringify({ per_page: 200 }) }); showAstralResult(data); showToast(`${data.importedCount} produit(s) importé(s)`); await loadAdmin(); } catch (error) { showAstralResult(error.message); } });
$("[data-astral-lookup-form]").addEventListener("submit", async (event) => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); showAstralResult("Vérification…"); try { showAstralResult(await adminFetch("/api/astral/freefire/lookup", { method: "POST", body: JSON.stringify(body) })); } catch (error) { showAstralResult(error.message); } });

const initializeAdmin = async () => {
  const response = await fetch("/api/admin/session", { credentials: "same-origin", headers: { "Accept": "application/json" } });
  if (!response.ok) {
    window.location.replace("/admin");
    return;
  }
  state.session = await response.json();
  csrfToken = state.session.csrfToken || "";
  const emailNode = $("[data-admin-email]");
  if (emailNode) emailNode.textContent = state.session.user?.email || "Administrateur";
  await loadAdmin();
};

$('[data-admin-logout]')?.addEventListener("click", async () => {
  try {
    await adminFetch("/api/admin/logout", { method: "POST", body: "{}" });
  } finally {
    window.location.replace("/admin");
  }
});

void initializeAdmin();
