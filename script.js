const routeAliases = {
  "": "index.html",
  "favoris": "favorites.html",
  "panier": "cart.html",
  "compte": "contact.html",
  "boutique": "boutique.html",
  "produits-digitaux": "digital.html",
  "jeux": "gaming.html",
  "categories": "categories.html",
  "paiement": "checkout.html",
  "produit": "product.html",
  "suivi": "tracking.html"
};
const routeSegment = window.location.pathname.split("/").filter(Boolean).pop() || "";
const currentPage = routeAliases[routeSegment] || routeSegment || "index.html";
const currentProductId = new URLSearchParams(window.location.search).get("id") || "";
const isApiProductRoute = currentProductId.startsWith("product-");
const activeUniverse = currentPage === "index.html"
  ? "home"
  : currentPage === "gaming.html"
  ? "gaming"
  : currentPage === "digital.html"
    ? "digital"
    : currentPage === "product.html" && isApiProductRoute
      ? "gaming"
      : currentPage === "product.html"
          ? "physical"
    : ["boutique.html", "categories.html"].includes(currentPage)
      ? "physical"
      : currentPage === "favorites.html"
        ? "favorites"
        : currentPage === "cart.html" || currentPage === "checkout.html" || currentPage === "tracking.html"
          ? "cart"
          : currentPage === "contact.html"
            ? "account"
      : "";

const navLink = (universe, href, label) => {
  const isActive = activeUniverse === universe;
  return `<a${isActive ? ' class="is-active" aria-current="page"' : ""} href="${href}">${label}</a>`;
};

const sharedHeader = `
  <button class="mobile-menu-button" type="button" aria-label="Ouvrir le menu" aria-expanded="false" data-open-mobile-menu>
    <span></span><span></span><span></span>
  </button>
  <div class="header-primary">
    <a class="brand" href="index.html" aria-label="SILVERSE SHOP accueil">
      <span class="brand-mark">S</span>
      <span>SILVERSE SHOP</span>
    </a>
    <nav class="main-nav" aria-label="Navigation principale">
      ${navLink("home", "index.html", "Accueil")}
      ${navLink("physical", "boutique.html", "Boutique Physique")}
      ${navLink("gaming", "gaming.html", "Jeux")}
      ${navLink("digital", "digital.html", "Produits Digitaux")}
    </nav>
  </div>
  <div class="header-tools" aria-label="Outils du compte">
    <button class="header-tool cart-button${activeUniverse === "cart" ? " is-active" : ""}" type="button" aria-label="Panier">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.5"></circle><circle cx="18" cy="20" r="1.5"></circle><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H7"></path></svg><span class="tool-count" data-cart-count>0</span>
    </button>
    <button class="header-tool${activeUniverse === "favorites" ? " is-active" : ""}" type="button" data-toggle-favorites aria-label="Favoris">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 0 1 7.1-7.1l.4.4.4-.4a5 5 0 1 1 7.1 7.1Z"></path></svg>
    </button>
    <button class="header-tool account-button${activeUniverse === "account" ? " is-active" : ""}" type="button" data-go="contact.html" aria-label="Compte">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg><span>Compte</span>
    </button>
  </div>
`;

document.querySelectorAll(".site-header").forEach((header) => {
  header.innerHTML = sharedHeader;
});

document.body.dataset.page = currentPage.replace(".html", "");

document.querySelector(".site-header")?.insertAdjacentHTML("afterend", `
  <div class="mobile-menu-shell" data-mobile-menu hidden>
    <div class="mobile-menu-backdrop" data-close-mobile-menu></div>
    <aside class="mobile-menu-drawer" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
      <header class="mobile-menu-header">
        <a class="brand" href="index.html"><span class="brand-mark">S</span><span id="mobile-menu-title">SILVERSE SHOP</span></a>
        <button class="mobile-menu-close" type="button" aria-label="Fermer le menu" data-close-mobile-menu>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
      </header>
      <nav class="mobile-menu-nav" aria-label="Navigation mobile">
        <a${currentPage === "index.html" ? ' class="is-active" aria-current="page"' : ""} href="index.html"><span>01</span><strong>Accueil</strong><i>→</i></a>
        <a${["boutique.html", "categories.html"].includes(currentPage) ? ' class="is-active" aria-current="page"' : ""} href="boutique.html"><span>02</span><strong>Boutique Physique</strong><i>→</i></a>
        <a${activeUniverse === "gaming" ? ' class="is-active" aria-current="page"' : ""} href="gaming.html"><span>03</span><strong>Jeux</strong><i>→</i></a>
        <a${currentPage === "digital.html" ? ' class="is-active" aria-current="page"' : ""} href="digital.html"><span>04</span><strong>Produits Digitaux</strong><i>→</i></a>
        <a${currentPage === "favorites.html" ? ' class="is-active" aria-current="page"' : ""} href="favorites.html"><span>05</span><strong>Favoris</strong><i>→</i></a>
        <a${currentPage === "cart.html" ? ' class="is-active" aria-current="page"' : ""} href="cart.html"><span>06</span><strong>Panier</strong><i>→</i></a>
      </nav>
      <div class="mobile-menu-account">
        <a class="mobile-login-button" href="contact.html"><span>Espace personnel</span><strong>Compte</strong></a>
      </div>
    </aside>
  </div>
`);

const renderProductImage = (product, extraClass = "") => `
  <span class="market-product-image ${product.photo ? "has-product-photo" : "product-image-placeholder"} ${escapeHtml(product.media || "media-blue")} ${escapeHtml(extraClass)}">
    ${product.photo ? `<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name || "Produit")}" loading="lazy" decoding="async">` : `<span class="product-fallback"><b>${escapeHtml(String(product.name || "S").split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase())}</b><small>${escapeHtml(product.name || "SILVERSE SHOP")}</small></span>`}
    ${product.badge ? `<span class="product-card-badge">${escapeHtml(product.badge)}</span>` : ""}
  </span>
`;

const renderHomeProduct = ({ id, name, brand, price, oldPrice = "", media, rating, reviews, badge = "", photo = "", hasVariations = false }) => `
  <article class="market-product-card home-commerce-card" role="link" tabindex="0" data-product-link="product.html?id=${encodeURIComponent(id)}" data-product-id="${escapeHtml(id)}" data-product-name="${escapeHtml(name)}" data-product-price="${escapeHtml(price)}" data-product-media="${escapeHtml(media)}" data-product-photo="${escapeHtml(photo)}">
    ${renderProductImage({ media, badge, photo })}
    <button class="favorite-toggle" type="button" aria-label="Ajouter ${escapeHtml(name)} aux favoris" data-favorite-product>♡</button>
    <div class="home-card-body">
      <p class="market-brand">SILVERSE SHOP</p>
      <h3>${escapeHtml(name)}</h3>
      <div class="market-rating">★★★★★ <span>${escapeHtml(rating)} · ${Number(reviews || 0)}</span></div>
      <div class="market-price"><strong>${escapeHtml(price)}</strong>${oldPrice ? `<del>${escapeHtml(oldPrice)}</del>` : ""}</div>
    </div>
  </article>
`;

const renderTypewriterLine = (text, offset = 0) => Array.from(text).map((char, index) => (
  `<span style="--char-index:${offset + index}">${char === " " ? "&nbsp;" : char}</span>`
)).join("");

const renderTypewriterLines = (lines) => {
  let offset = 0;
  return lines.map((line) => {
    const html = `<span class="typewriter-line">${renderTypewriterLine(line, offset)}</span>`;
    offset += line.length;
    return html;
  }).join("");
};

if (currentPage === "index.html") {
  document.body.classList.add("home-page");
  document.querySelector("main").innerHTML = `
    <section class="home-hero page-enter">
      <img src="assets/home-hero-champagne.png" width="1774" height="887" fetchpriority="high" decoding="async" alt="Sélection premium de produits technologiques">
      <div class="home-hero-content">
        <p class="eyebrow">SILVERSE SHOP</p>
        <h1 class="home-typewriter" aria-label="Tout ce qu'il vous faut au même endroit">${renderTypewriterLines(["Tout ce qu'il vous faut", "au même endroit"])}</h1>
        <p>Découvrez une plateforme unique pour vos achats quotidiens et vos services numériques.</p>
        <div class="home-hero-actions">
          <a class="primary-button" href="boutique.html">Explorer la boutique</a>
          <a class="home-secondary-link" href="digital.html">Produits digitaux <span>→</span></a>
        </div>
      </div>
    </section>

    <section class="home-mobile-search" aria-label="Recherche mobile">
      <div class="home-mobile-search-box">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4.2-4.2"></path></svg>
        <input type="search" placeholder="Rechercher produits, jeux, catégories..." aria-label="Rechercher sur SILVERSE SHOP" data-home-mobile-search>
      </div>
      <div class="home-mobile-search-results" data-home-mobile-search-results hidden></div>
    </section>

    <section class="home-categories section" data-reveal="up">
      <div class="section-heading">
        <div><p class="eyebrow">Catalogue physique</p><h2>Catégories principales</h2></div>
        <a class="section-link" href="boutique.html#catalogue">Toutes les catégories <span>→</span></a>
      </div>
      <div class="home-category-grid">
        <a href="boutique.html#catalogue"><span>01</span><strong>Électronique</strong><small>Audio, mobile et tech</small></a>
        <a href="boutique.html#catalogue"><span>02</span><strong>Mode</strong><small>Tenues et accessoires</small></a>
        <a href="boutique.html#catalogue"><span>03</span><strong>Maison</strong><small>Confort et décoration</small></a>
        <a href="boutique.html#catalogue"><span>04</span><strong>Beauté</strong><small>Soins et essentiels</small></a>
        <a href="boutique.html#catalogue"><span>05</span><strong>Sport</strong><small>Fitness et outdoor</small></a>
        <a href="boutique.html#catalogue"><span>06</span><strong>Accessoires</strong><small>Pour tous les jours</small></a>
      </div>
    </section>

    <section class="home-popular section" id="populaires" data-reveal="scale">
      <div class="section-heading">
        <div><p class="eyebrow">Sélection digitale</p><h2>Produits gaming disponibles</h2></div>
        <a class="section-link" href="gaming.html">Voir plus <span>→</span></a>
      </div>
      <div class="market-product-grid home-product-grid" data-home-catalog-grid><p>Chargement des produits...</p></div>
    </section>

    <section class="home-channel-section home-physical-entry section" data-reveal="left">
      <a class="home-channel-feature" href="boutique.html">
        <span class="home-channel-kicker">Boutique physique</span>
        <p>Une sélection fiable, claire et prête à être explorée.</p>
        <strong>Parcourir le catalogue <i>→</i></strong>
      </a>
      <div class="home-channel-stats" aria-label="Avantages de la boutique physique">
        <article><strong>6+</strong><span>catégories principales</span></article>
        <article><strong>4,8/5</strong><span>note moyenne</span></article>
        <article><strong>Suivi</strong><span>sur chaque commande</span></article>
      </div>
    </section>

    <section class="home-gaming-section section" data-reveal="right">
      <div class="section-heading">
        <div><p class="eyebrow">Univers des Jeux</p></div>
        <a class="section-link" href="gaming.html">Voir plus <span>→</span></a>
      </div>
      <div class="home-gaming-grid" data-home-gaming-grid>
        <div class="catalog-empty"><strong>Catalogue en attente</strong><p>Les jeux disponibles vont apparaître ici.</p></div>
      </div>
    </section>

    <section class="home-digital-section" data-reveal="zoom">
      <div class="home-digital-intro">
        <p class="eyebrow home-digital-label"><span aria-hidden="true"></span> Livraison instantanée</p>
        <h2>Cartes et recharges disponibles en quelques instants.</h2>
        <p>Une sélection de produits disponibles, actualisée automatiquement depuis notre catalogue sécurisé.</p>
        <ul class="home-digital-benefits" aria-label="Avantages des produits digitaux">
          <li><span>01</span> Activation rapide</li>
          <li><span>02</span> Paiement sécurisé</li>
          <li><span>03</span> Assistance disponible</li>
        </ul>
        <a class="home-digital-cta" href="digital.html">
          <span><strong>Explorer le catalogue</strong><small>Cartes cadeaux et codes prépayés</small></span>
          <i aria-hidden="true">→</i>
        </a>
      </div>

      <div class="home-mobile-universe-heading">
        <strong>Univers Produits Digitaux</strong>
        <a href="digital.html">Voir plus <span>→</span></a>
      </div>
      <div class="home-digital-showcase" data-home-digital-showcase aria-label="Sélection de produits digitaux">
        <div class="catalog-empty"><strong>Chargement de la sélection</strong><p>Récupération des produits disponibles…</p></div>
      </div>
    </section>

    <section class="home-trust section" data-reveal>
      <div class="section-heading"><div><p class="eyebrow">Pourquoi SILVERSE</p><h2>Une expérience conçue pour inspirer confiance</h2></div></div>
      <div class="benefit-grid">
        <article><span>01</span><h3>Paiement sécurisé</h3><p>Des transactions protégées et une confirmation immédiate à chaque commande.</p></article>
        <article><span>02</span><h3>Livraison adaptée</h3><p>Suivi pour les produits physiques et réception instantanée pour le digital.</p></article>
        <article><span>03</span><h3>Support disponible</h3><p>Une équipe accessible pour vous accompagner avant et après votre achat.</p></article>
      </div>
    </section>

    <section class="home-reviews section" data-reveal>
      <div class="section-heading"><div><p class="eyebrow">Avis clients</p><h2>Ils choisissent SILVERSE SHOP</h2></div></div>
      <div class="review-grid">
        <article><strong>“Simple et très rapide.”</strong><p>Ma recharge a été livrée immédiatement et le parcours était parfaitement clair.</p><span>★★★★★ · Afi K.</span></article>
        <article><strong>“Une boutique vraiment complète.”</strong><p>J’ai trouvé mon casque et une carte cadeau au même endroit, sans confusion.</p><span>★★★★★ · Daniel M.</span></article>
        <article><strong>“Service professionnel.”</strong><p>Commande bien suivie, support réactif et interface très agréable sur mobile.</p><span>★★★★★ · Sarah T.</span></article>
      </div>
    </section>
  `;
}

if (!document.querySelector("[data-search-panel]")) {
  document.querySelector(".site-header")?.insertAdjacentHTML("afterend", `
    <div class="search-panel unified-search-panel" data-search-panel hidden>
      <label for="global-search">Recherche globale</label>
      <div class="search-row">
        <input id="global-search" type="search" placeholder="Rechercher un produit, une catégorie ou un service...">
        <button type="button" data-close-search>Fermer</button>
      </div>
      <div class="global-search-results" data-global-search-results></div>
    </div>
  `);
}

const sharedFooter = `
  <div class="footer-top">
    <div class="footer-about">
      <a class="brand footer-brand" href="index.html" aria-label="SILVERSE SHOP accueil">
        <span class="brand-mark">S</span>
        <span>SILVERSE SHOP</span>
      </a>
      <p>Marketplace premium pour acheter des produits physiques, des produits digitaux et des recharges avec une expérience claire et sécurisée.</p>
      <div class="footer-contact" aria-label="Coordonnées du support">
        <a href="mailto:Amegafranck7@gmail.com">Amegafranck7@gmail.com</a>
        <a href="tel:+22890572457">+228 90 57 24 57</a>
      </div>
      <div class="footer-proof">
        <span>✓ Paiement sécurisé</span>
        <span>✓ Livraison suivie</span>
        <span>✓ Support client</span>
      </div>
    </div>
    <nav class="footer-column" aria-label="Catalogue footer">
      <h3>Catalogue</h3>
      <a href="index.html">Accueil</a>
      <a href="boutique.html#catalogue">Boutique physique</a>
      <a href="digital.html#catalogue">Produits digitaux</a>
      <a href="gaming.html">Jeux</a>
      <a href="categories.html">Catégories</a>
    </nav>
    <nav class="footer-column" aria-label="Compte footer">
      <h3>Compte</h3>
      <a href="favorites.html">Mes favoris</a>
      <a href="cart.html">Panier</a>
      <a href="checkout.html">Paiement</a>
      <a href="contact.html">Connexion</a>
      <a href="contact.html#support">Assistance</a>
    </nav>
    <nav class="footer-column" aria-label="Informations footer">
      <h3>Informations</h3>
      <a href="contact.html#faq">FAQ</a>
      <a href="contact.html#refund">Remboursement</a>
      <a href="contact.html#privacy">Confidentialité</a>
      <a href="contact.html#legal">Conditions</a>
    </nav>
  </div>
  <div class="footer-bottom">
    <p>© 2026 SILVERSE SHOP. Tous droits réservés.</p>
    <p>Une plateforme unique pour vos achats physiques et digitaux.</p>
  </div>
`;

let footer = document.querySelector(".site-footer");
if (!footer) {
  document.querySelector("main")?.insertAdjacentHTML("afterend", `<footer class="site-footer" data-reveal>${sharedFooter}</footer>`);
} else {
  footer.classList.remove("simple-footer");
  footer.innerHTML = sharedFooter;
}

const searchPanel = document.querySelector("[data-search-panel]");
const openSearchButtons = document.querySelectorAll("[data-open-search]");
const closeSearchButtons = document.querySelectorAll("[data-close-search]");
const globalSearchInput = searchPanel?.querySelector("input");
const globalSearchResults = document.querySelector("[data-global-search-results]");
const homeMobileSearchInput = document.querySelector("[data-home-mobile-search]");
const homeMobileSearchResults = document.querySelector("[data-home-mobile-search-results]");
const cartCount = document.querySelector("[data-cart-count]");
const addCartButtons = document.querySelectorAll("[data-add-cart]");
const revealItems = document.querySelectorAll("[data-reveal]");
const counters = document.querySelectorAll("[data-count]");
const toast = document.querySelector("[data-toast]");
const loader = document.querySelector("[data-loader]");
const localLinks = document.querySelectorAll('a[href]');
const categoryModal = document.querySelector("[data-category-modal]");
const openCategoryButtons = document.querySelectorAll("[data-open-categories]");
const closeCategoryButtons = document.querySelectorAll("[data-close-categories]");
const toggleFavoritesButtons = document.querySelectorAll("[data-toggle-favorites]");
const cartPageList = document.querySelector("[data-cart-page-list]");
const cartPageSummaries = document.querySelectorAll("[data-cart-summary]");
const favoritesPageList = document.querySelector("[data-favorites-page-list]");
const catalogGrid = document.querySelector("[data-catalog-grid]");
let catalogProducts = [...document.querySelectorAll("[data-catalog-product]")];
const catalogFilters = document.querySelector("[data-catalog-filters]");
const catalogSkeleton = document.querySelector("[data-catalog-skeleton]");
const catalogEmpty = document.querySelector("[data-catalog-empty]");
const resultsCount = document.querySelector("[data-results-count]");
const catalogSort = document.querySelector("[data-catalog-sort]");
const loadMoreButton = document.querySelector("[data-load-more]");
const loadStatus = document.querySelector("[data-load-status]");
const quickCategories = document.querySelectorAll("[data-category-quick]");
const digitalSearch = document.querySelector("[data-digital-search]");
const digitalFilterButtons = document.querySelectorAll("[data-digital-filter]");
const digitalSort = document.querySelector("[data-digital-sort]");
const digitalProducts = [...document.querySelectorAll("[data-digital-product]")];
const digitalGroups = [...document.querySelectorAll("[data-digital-group]")];
const digitalEmpty = document.querySelector("[data-digital-empty]");
const digitalEditorialRow = document.querySelector(".digital-editorial-row");
const gamingSearch = document.querySelector("[data-gaming-search]");
let gamingSearchItems = [];
const gamingLoadMore = document.querySelector("[data-gaming-load-more]");
const digitalCatalogGrid = document.querySelector("[data-digital-catalog-grid]");
const digitalCatalogCount = document.querySelector("[data-digital-catalog-count]");
const digitalCatalogLoadMore = document.querySelector("[data-digital-catalog-load-more]");
const digitalGiftSearch = document.querySelector("[data-digital-gift-search]");
let gamingProducts = [];
let gamingTotal = 0;
let gamingQuery = "";
let gamingSearchTimer;
let gamingLoading = false;
let giftCardProducts = [];
let giftCardTotal = 0;
let giftCardQuery = "";
let giftCardSearchTimer;
let giftCardLoading = false;
const mobileMenu = document.querySelector("[data-mobile-menu]");
const openMobileMenuButton = document.querySelector("[data-open-mobile-menu]");
const closeMobileMenuButtons = document.querySelectorAll("[data-close-mobile-menu]");
const orderStatusForm = document.querySelector("[data-order-status-form]");
const orderStatusResult = document.querySelector("[data-order-status-result]");
const trackingForm = document.querySelector("[data-tracking-form]");
const trackingResult = document.querySelector("[data-tracking-result]");
const orderConfirmation = document.querySelector("[data-order-confirmation]");
const playerLookupButton = document.querySelector("[data-player-lookup]");
const playerLookupResult = document.querySelector("[data-player-lookup-result]");
const checkoutForm = document.querySelector("[data-checkout-form]");
const physicalDeliveryBlock = document.querySelector("[data-physical-delivery]");
const digitalCheckoutFields = document.querySelector("[data-digital-checkout-fields]");
const deliveryAddressFields = document.querySelector("[data-delivery-address-fields]");
const deliveryLocationBox = document.querySelector("[data-delivery-location-box]");
const deliveryLaterNote = document.querySelector("[data-delivery-later-note]");
const useCurrentLocationButton = document.querySelector("[data-use-current-location]");
const locationStatus = document.querySelector("[data-location-status]");
const checkoutPayButton = document.querySelector("[data-checkout-submit]");

let count = 0;
let toastTimer;
let categoryCloseTimer;
let mobileMenuCloseTimer;
let lockedScrollY = 0;
let favorites = [];
let cart = [];
let catalogLimit = 8;
let catalogQuery = "";
let catalogTimer;
let digitalCategory = "all";
let customerSession = null;

const productCatalog = {};

const getCatalogProduct = (id) => productCatalog[id] || null;

Object.keys(productCatalog).forEach((id) => delete productCatalog[id]);

const slugify = (value) => String(value)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const formatMoney = (value, currency = "FCFA") => `${Number(value || 0).toLocaleString("fr-FR")} ${currency}`;
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

const normalizeBackendProduct = (product) => {
  const rawPrice = Number(product.price || 0);
  const rawOldPrice = Number(product.oldPrice || 0);
  const categorySlug = product.category || "autre";
  return {
    ...product,
    rawPrice,
    rawOldPrice: rawOldPrice || 0,
    price: product.priceLabel || formatMoney(rawPrice, product.currency),
    oldPrice: product.oldPriceLabel || (rawOldPrice ? formatMoney(rawOldPrice, product.currency) : ""),
    shippingFee: Number(product.shippingFee || 0),
    shippingFeeLabel: product.shippingFeeLabel || formatMoney(product.shippingFee || 0, product.currency),
    category: product.categoryLabel || categorySlug,
    categorySlug,
    availability: product.availability || (Number(product.stock || 0) > 0 ? "Disponible" : "Indisponible"),
    media: product.media || "media-blue",
    photo: product.photo || "",
    type: product.type || "physical"
  };
};

const productCardTemplate = (product) => {
  const brandSlug = slugify(product.brand || "silverse-shop");
  const isPromo = Boolean(product.oldPrice || product.badge?.includes("%"));
  const isAvailable = product.availability !== "Indisponible" && Number(product.stock || 0) !== 0;
  const id = encodeURIComponent(product.id);
  const hasVariations = Array.isArray(product.variations) && product.variations.length > 0;
  return `
    <article class="market-product-card shop-product-card" role="link" tabindex="0" data-product-link="product.html?id=${id}" data-catalog-product data-category="${escapeHtml(product.categorySlug)}" data-brand="${brandSlug}" data-price="${product.rawPrice}" data-rating="${Number(product.rating || 0)}" data-promo="${isPromo}" data-stock="${isAvailable}" data-product-id="${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.name)}" data-product-price="${escapeHtml(product.price)}" data-product-media="${escapeHtml(product.media)}" data-product-photo="${escapeHtml(product.photo || "")}">
      ${renderProductImage(product)}
      <button class="favorite-toggle" type="button" aria-label="Ajouter aux favoris" data-favorite-product>♡</button>
      <p class="market-brand">${product.categorySlug === "jeux" ? "TOP-UP DIRECT" : "SILVERSE SHOP"}</p>
      <h3>${escapeHtml(product.name)}</h3>
      <p class="market-product-description">${escapeHtml(product.short)}</p>
      <p class="market-availability ${isAvailable ? "is-available" : "is-unavailable"}">${escapeHtml(product.availability)}</p>
      <div class="market-rating">★★★★★ <span>${String(product.rating || 0).replace(".", ",")} · ${product.reviews || 0}</span></div>
      <div class="market-price"><strong>${hasVariations ? "Dès " : ""}${escapeHtml(product.price)}</strong>${product.oldPrice ? `<del>${escapeHtml(product.oldPrice)}</del>` : ""}</div>
    </article>
  `;
};

const renderHomeApiProducts = (products) => {
  const grid = document.querySelector("[data-home-catalog-grid]");
  if (!grid) return;
  const apiProducts = products.filter((product) => product.type === "digital").slice(0, 5);

  grid.innerHTML = apiProducts.length
    ? apiProducts.map((product) => renderHomeProduct({
      id: product.id,
      name: product.name,
      brand: "SILVERSE SHOP",
      price: product.price,
      oldPrice: product.oldPrice,
      media: product.media,
      photo: product.photo,
      rating: String(product.rating || 4.7).replace(".", ","),
      reviews: product.reviews || 0,
      badge: product.badge || "Digital",
      hasVariations: Array.isArray(product.variations) && product.variations.length > 0
    })).join("")
    : `<div class="catalog-empty"><strong>Aucun produit disponible</strong><p>Le catalogue sera actualisé prochainement.</p></div>`;
};

const renderHomeDigitalShowcase = (products) => {
  const showcase = document.querySelector("[data-home-digital-showcase]");
  if (!showcase) return;
  const selection = [...products]
    .filter((product) => product.categorySlug === "giftcards")
    .sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)))
    .slice(0, 5);
  if (!selection.length) {
    showcase.innerHTML = `<div class="catalog-empty"><strong>Aucune carte disponible</strong><p>Le catalogue sera actualisé prochainement.</p></div>`;
    return;
  }
  showcase.innerHTML = selection.map((product, index) => {
    const initials = String(product.name || "SS").split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
    return `<a class="home-digital-tile ${index === 0 ? "home-digital-featured" : ""}" href="product.html?id=${encodeURIComponent(product.id)}">
      <span class="home-digital-media ${product.photo ? "has-home-digital-photo" : "home-digital-fallback"}">${product.photo ? `<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">` : `<b>${escapeHtml(initials)}</b>`}</span>
      <span class="home-digital-tile-copy"><small>Carte cadeau</small><strong>${escapeHtml(product.name)}</strong><em>Dès ${escapeHtml(product.price)}</em></span>
      <i aria-hidden="true">→</i>
    </a>`;
  }).join("");
};

const renderGamingProducts = (products, total = products.length) => {
  const apiProducts = products.filter((product) => product.categorySlug === "jeux");
  const gamingGrid = document.querySelector("[data-gaming-catalog]");
  const homeGrid = document.querySelector("[data-home-gaming-grid]");
  const count = document.querySelector("[data-gaming-count]");
  if (count) count.textContent = `${total} produit${total > 1 ? "s" : ""}`;
  if (gamingGrid) {
    gamingGrid.innerHTML = apiProducts.length
      ? apiProducts.map(productCardTemplate).join("")
      : `<div class="catalog-empty"><strong>Catalogue en attente</strong><p>Aucune recharge n’est disponible actuellement.</p></div>`;
    gamingSearchItems = [...gamingGrid.querySelectorAll("[data-product-id]")];
  }
  if (gamingLoadMore) {
    gamingLoadMore.hidden = apiProducts.length >= total;
    gamingLoadMore.disabled = gamingLoading;
    gamingLoadMore.textContent = gamingLoading ? "Chargement…" : "Charger plus de produits";
  }
  if (homeGrid) {
    const freeFireMena = apiProducts.find((product) => /free\s*fire\s*\(mena\)/i.test(product.name));
    const homeProducts = freeFireMena && window.matchMedia("(max-width: 900px)").matches
      ? [freeFireMena, ...apiProducts.filter((product) => product.id !== freeFireMena.id)].slice(0, 3)
      : apiProducts.slice(0, 3);
    homeGrid.innerHTML = homeProducts.length
      ? homeProducts.map((product, index) => `<a class="home-game-card ${index === 0 ? "home-game-featured" : ""}" href="product.html?id=${encodeURIComponent(product.id)}"><span>${escapeHtml(product.name)}</span><p>${escapeHtml(product.short)}</p><i>Découvrir →</i></a>`).join("")
      : `<div class="catalog-empty"><strong>Catalogue en attente</strong><p>Les jeux disponibles vont apparaître ici.</p></div>`;
  }
};

const refreshGlobalSearchItems = () => {
  globalSearchItems = [
    { title: "Accueil", meta: "Vue d'ensemble", href: "index.html" },
    { title: "Boutique physique", meta: "Produits, accessoires et équipements", href: "boutique.html#catalogue" },
    { title: "Produits digitaux", meta: "Cartes cadeaux, abonnements et recharges", href: "digital.html#catalogue" },
    { title: "Jeux", meta: "Recharges et contenus gaming", href: "gaming.html" },
    { title: "Électronique", meta: "Catégorie physique · audio, mobile et tech", href: "boutique.html#catalogue" },
    { title: "Mode", meta: "Catégorie physique · sacs, chaussures et accessoires", href: "boutique.html#catalogue" },
    { title: "Maison", meta: "Catégorie physique · décoration et confort", href: "boutique.html#catalogue" },
    { title: "Beauté", meta: "Catégorie physique · soins et essentiels", href: "boutique.html#catalogue" },
    { title: "Sport", meta: "Catégorie physique · fitness et outdoor", href: "boutique.html#catalogue" },
    { title: "Cartes cadeaux", meta: "Produits digitaux disponibles immédiatement", href: "digital.html#catalogue" },
    { title: "Recharges gaming", meta: "Livraison digitale sécurisée", href: "gaming.html#catalogue" },
    { title: "Crédits de jeux", meta: "Jeux et contenus disponibles en ligne", href: "gaming.html" },
    { title: "Mes favoris", meta: "Produits enregistrés", href: "favorites.html" },
    { title: "Panier", meta: "Commande en cours", href: "cart.html" },
    { title: "Compte", meta: "Connexion et création de compte", href: "contact.html" },
    ...Object.values(productCatalog).map((product) => ({
      title: product.name,
      meta: `${product.category} · ${product.price}`,
      href: `product.html?id=${product.id}`
    }))
  ];
};

const addProductsToCatalog = (products) => {
  products.forEach((product) => {
    productCatalog[product.id] = product;
  });
  refreshGlobalSearchItems();
};

const fetchProductPage = async ({ type = "", provider = "", category = "", query = "", limit = 60, offset = 0 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) params.set("type", type);
  if (provider) params.set("provider", provider);
  if (category) params.set("category", category);
  if (query) params.set("q", query);
  const response = await fetch(`/api/products?${params}`);
  if (!response.ok) throw new Error("Impossible de charger les produits.");
  const data = await response.json();
  return { ...data, products: (data.products || []).map(normalizeBackendProduct) };
};

const loadGamingProducts = async ({ reset = false, query = gamingQuery } = {}) => {
  if (gamingLoading) return;
  gamingLoading = true;
  gamingQuery = query;
  if (reset) gamingProducts = [];
  renderGamingProducts(gamingProducts, gamingTotal);
  try {
    const data = await fetchProductPage({ type: "digital", category: "jeux", query, limit: 48, offset: gamingProducts.length });
    gamingTotal = data.total || 0;
    const known = new Set(gamingProducts.map((product) => product.id));
    gamingProducts = [...gamingProducts, ...data.products.filter((product) => !known.has(product.id))];
    addProductsToCatalog(data.products);
  } finally {
    gamingLoading = false;
    renderGamingProducts(gamingProducts, gamingTotal);
    enhanceCatalogCards();
    syncFavoriteButtons();
  }
};

const renderGiftCardProducts = () => {
  if (!digitalCatalogGrid) return;
  digitalCatalogGrid.innerHTML = giftCardProducts.length
    ? giftCardProducts.map(productCardTemplate).join("")
    : `<div class="catalog-empty"><strong>Aucune carte cadeau trouvée</strong><p>Essayez une autre recherche.</p></div>`;
  if (digitalCatalogCount) digitalCatalogCount.textContent = `${giftCardTotal} carte${giftCardTotal > 1 ? "s" : ""}`;
  if (digitalCatalogLoadMore) {
    digitalCatalogLoadMore.hidden = giftCardProducts.length >= giftCardTotal;
    digitalCatalogLoadMore.disabled = giftCardLoading;
    digitalCatalogLoadMore.textContent = giftCardLoading ? "Chargement…" : "Charger plus de cartes";
  }
  syncFavoriteButtons();
};

const loadGiftCardProducts = async ({ reset = false, query = giftCardQuery } = {}) => {
  if (giftCardLoading) return;
  giftCardLoading = true;
  giftCardQuery = query;
  if (reset) giftCardProducts = [];
  renderGiftCardProducts();
  try {
    const data = await fetchProductPage({ type: "digital", category: "giftcards", query, limit: 48, offset: giftCardProducts.length });
    giftCardTotal = data.total || 0;
    const known = new Set(giftCardProducts.map((product) => product.id));
    giftCardProducts = [...giftCardProducts, ...data.products.filter((product) => !known.has(product.id))];
    addProductsToCatalog(data.products);
  } finally {
    giftCardLoading = false;
    renderGiftCardProducts();
  }
};

const loadBackendProducts = async () => {
  if (currentPage === "gaming.html") {
    await loadGamingProducts({ reset: true, query: "" });
    return;
  }
  if (currentPage === "digital.html") {
    await loadGiftCardProducts({ reset: true, query: "" });
    return;
  }
  if (currentPage === "index.html") {
    const mobileViewport = window.matchMedia("(max-width: 900px)").matches;
    const [giftCards, directRecharges, freeFireMena] = await Promise.all([
      fetchProductPage({ type: "digital", category: "giftcards", limit: 24 }),
      fetchProductPage({ type: "digital", category: "jeux", limit: 6 }),
      mobileViewport
        ? fetchProductPage({ type: "digital", category: "jeux", query: "Free Fire (MENA)", limit: 1 })
        : Promise.resolve({ products: [] })
    ]);
    const featuredGames = [...freeFireMena.products, ...directRecharges.products]
      .filter((product, index, products) => products.findIndex((candidate) => candidate.id === product.id) === index);
    const homeProducts = [...giftCards.products, ...featuredGames];
    addProductsToCatalog(homeProducts);
    renderHomeApiProducts(homeProducts);
    renderHomeDigitalShowcase(giftCards.products);
    renderGamingProducts(featuredGames, directRecharges.total || featuredGames.length);
    return;
  }

  const type = ["boutique.html", "categories.html"].includes(currentPage) ? "physical" : "";
  const page = await fetchProductPage({ type, limit: 60 });
  const backendProducts = page.products;
  addProductsToCatalog(backendProducts);

  if (currentPage === "product.html" && currentProductId && !productCatalog[currentProductId]) {
    const detailResponse = await fetch(`/api/products/${encodeURIComponent(currentProductId)}`);
    if (detailResponse.ok) {
      const detail = await detailResponse.json();
      addProductsToCatalog([normalizeBackendProduct(detail.product)]);
    }
  }
  renderHomeApiProducts(backendProducts);

  if (catalogGrid) {
    const physicalProducts = backendProducts.filter((product) => product.type !== "digital");
    catalogGrid.innerHTML = physicalProducts.map(productCardTemplate).join("");
    catalogProducts = [...catalogGrid.querySelectorAll("[data-catalog-product]")];
  }
};

const normalizeProduct = (product) => {
  const full = getCatalogProduct(product.id) || {};
  return { ...full, ...product };
};

let globalSearchItems = [];
refreshGlobalSearchItems();

const renderGlobalSearch = () => {
  if (!globalSearchResults || !globalSearchInput) return;
  const query = globalSearchInput.value.trim().toLowerCase();
  if (!query) {
    globalSearchResults.innerHTML = `<p>Recherchez un produit, une catégorie ou une page.</p>`;
    return;
  }

  const matches = globalSearchItems
    .filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(query))
    .slice(0, 6);

  globalSearchResults.innerHTML = matches.length
    ? matches.map((item) => `<a href="${item.href}"><strong>${item.title}</strong><span>${item.meta}</span></a>`).join("")
    : `<p>Aucun résultat. Essayez avec un autre mot-clé.</p>`;
};

const renderHomeMobileSearch = () => {
  if (!homeMobileSearchInput || !homeMobileSearchResults) return;
  const query = homeMobileSearchInput.value.trim().toLowerCase();

  if (!query) {
    homeMobileSearchResults.hidden = false;
    homeMobileSearchResults.innerHTML = `<p>Recherchez un produit, un jeu ou une catégorie.</p>`;
    return;
  }

  const matches = globalSearchItems
    .filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(query))
    .slice(0, 5);

  homeMobileSearchResults.hidden = false;
  homeMobileSearchResults.innerHTML = matches.length
    ? matches.map((item) => `<a href="${item.href}"><strong>${item.title}</strong><span>${item.meta}</span></a>`).join("")
    : `<p>Aucun résultat trouvé.</p>`;
};

homeMobileSearchInput?.addEventListener("focus", renderHomeMobileSearch);
homeMobileSearchInput?.addEventListener("input", renderHomeMobileSearch);
homeMobileSearchInput?.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (!homeMobileSearchInput.value.trim() && homeMobileSearchResults) homeMobileSearchResults.hidden = true;
  }, 150);
});

const showToast = (message) => {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
};

const gamingCarousel = document.querySelector("[data-gaming-carousel]");

if (gamingCarousel) {
  const gamingHero = gamingCarousel.closest(".gaming-hero");
  const slides = [...gamingCarousel.querySelectorAll("[data-gaming-slide]")];
  const dots = [...document.querySelectorAll("[data-gaming-carousel-dots] button")];
  const canAutoPlay = slides.length > 1;
  let activeSlide = Math.max(0, slides.findIndex((slide) => slide.classList.contains("is-active")));
  let carouselTimer;
  let touchStartX = 0;

  const setGamingSlide = (nextIndex) => {
    if (!slides.length) return;
    activeSlide = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === activeSlide);
    });
    dots.forEach((dot, index) => {
      const isActive = index === activeSlide;
      dot.classList.toggle("is-active", isActive);
      if (isActive) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
  };

  const stopGamingCarousel = () => {
    window.clearInterval(carouselTimer);
  };

  const startGamingCarousel = () => {
    if (!canAutoPlay) return;
    stopGamingCarousel();
    carouselTimer = window.setInterval(() => setGamingSlide(activeSlide + 1), 3000);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      setGamingSlide(index);
      startGamingCarousel();
    });
  });

  gamingHero?.addEventListener("mouseenter", stopGamingCarousel);
  gamingHero?.addEventListener("mouseleave", startGamingCarousel);
  gamingHero?.addEventListener("focusin", stopGamingCarousel);
  gamingHero?.addEventListener("focusout", startGamingCarousel);

  gamingHero?.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0]?.clientX || 0;
    stopGamingCarousel();
  }, { passive: true });

  gamingHero?.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0]?.clientX || touchStartX;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) > 42) setGamingSlide(activeSlide + (deltaX < 0 ? 1 : -1));
    startGamingCarousel();
  }, { passive: true });

  setGamingSlide(activeSlide);
  startGamingCarousel();
}

gamingSearch?.addEventListener("input", () => {
  window.clearTimeout(gamingSearchTimer);
  gamingSearchTimer = window.setTimeout(() => {
    void loadGamingProducts({ reset: true, query: gamingSearch.value.trim() }).catch(() => showToast("Recherche momentanément indisponible"));
  }, 300);
});

gamingLoadMore?.addEventListener("click", () => {
  void loadGamingProducts().catch(() => showToast("Chargement momentanément indisponible"));
});

digitalGiftSearch?.addEventListener("input", () => {
  window.clearTimeout(giftCardSearchTimer);
  giftCardSearchTimer = window.setTimeout(() => {
    void loadGiftCardProducts({ reset: true, query: digitalGiftSearch.value.trim() }).catch(() => showToast("Recherche momentanément indisponible"));
  }, 300);
});

digitalCatalogLoadMore?.addEventListener("click", () => {
  void loadGiftCardProducts().catch(() => showToast("Chargement momentanément indisponible"));
});

const getCatalogMatches = () => {
  if (!catalogGrid) return [];
  const category = catalogFilters?.querySelector('[name="catalog-category"]:checked')?.value || "all";
  const price = catalogFilters?.querySelector('[name="catalog-price"]:checked')?.value || "all";
  const brands = [...(catalogFilters?.querySelectorAll('[name="catalog-brand"]:checked') || [])].map((input) => input.value);
  const promotionsOnly = catalogFilters?.querySelector("[data-filter-promo]")?.checked;
  const inStockOnly = catalogFilters?.querySelector("[data-filter-stock]")?.checked;
  const ratedOnly = catalogFilters?.querySelector("[data-filter-rating]")?.checked;

  const matches = catalogProducts.filter((product) => {
    const productPrice = Number(product.dataset.price);
    const productName = product.dataset.productName.toLowerCase();
    const matchesQuery = !catalogQuery || productName.includes(catalogQuery);
    const matchesCategory = category === "all" || product.dataset.category === category;
    const matchesBrand = brands.length === 0 || brands.includes(product.dataset.brand);
    const matchesPromotion = !promotionsOnly || product.dataset.promo === "true";
    const matchesStock = !inStockOnly || product.dataset.stock === "true";
    const matchesRating = !ratedOnly || Number(product.dataset.rating) >= 4;
    const matchesPrice = price === "all"
      || (price === "under-20000" && productPrice < 20000)
      || (price === "20000-40000" && productPrice >= 20000 && productPrice <= 40000)
      || (price === "over-40000" && productPrice > 40000);
    return matchesQuery && matchesCategory && matchesBrand && matchesPromotion && matchesStock && matchesRating && matchesPrice;
  });

  const sort = catalogSort?.value || "popular";
  return matches.sort((a, b) => {
    if (sort === "price-asc") return Number(a.dataset.price) - Number(b.dataset.price);
    if (sort === "price-desc") return Number(b.dataset.price) - Number(a.dataset.price);
    if (sort === "rating") return Number(b.dataset.rating) - Number(a.dataset.rating);
    return Number(b.dataset.rating) - Number(a.dataset.rating) || Number(b.dataset.promo === "true") - Number(a.dataset.promo === "true");
  });
};

const renderCatalog = () => {
  if (!catalogGrid) return;
  const matches = getCatalogMatches();
  catalogProducts.forEach((product) => product.hidden = true);
  matches.forEach((product) => catalogGrid.append(product));
  matches.slice(0, catalogLimit).forEach((product) => product.hidden = false);
  if (resultsCount) resultsCount.textContent = String(matches.length);
  if (catalogEmpty) catalogEmpty.hidden = matches.length > 0;
  if (loadMoreButton) loadMoreButton.hidden = matches.length <= catalogLimit;
  if (loadStatus) loadStatus.textContent = `${Math.min(catalogLimit, matches.length)} sur ${matches.length}`;
};

const applyCatalog = ({ resetLimit = true, animate = true } = {}) => {
  if (!catalogGrid) return;
  if (resetLimit) catalogLimit = 8;
  window.clearTimeout(catalogTimer);
  if (!animate) {
    renderCatalog();
    return;
  }
  catalogGrid.hidden = true;
  if (catalogSkeleton) catalogSkeleton.hidden = false;
  catalogTimer = window.setTimeout(() => {
    if (catalogSkeleton) catalogSkeleton.hidden = true;
    catalogGrid.hidden = false;
    renderCatalog();
  }, 260);
};

const applyDigitalCatalog = () => {
  if (!digitalProducts.length) return;
  const query = digitalSearch?.value.trim().toLowerCase() || "";
  const sort = digitalSort?.value || "popular";
  let visibleCount = 0;

  digitalGroups.forEach((group) => {
    const grid = group.querySelector("[data-digital-grid]");
    if (!grid) return;
    const products = [...group.querySelectorAll("[data-digital-product]")];
    products.sort((a, b) => {
      if (sort === "new") return Number(b.dataset.new) - Number(a.dataset.new);
      if (sort === "price-asc") return Number(a.dataset.price) - Number(b.dataset.price);
      return Number(a.dataset.rank) - Number(b.dataset.rank);
    });
    products.forEach((product) => grid.append(product));

    let groupCount = 0;
    products.forEach((product) => {
      const matchesCategory = digitalCategory === "all" || product.dataset.digitalCategory === digitalCategory;
      const matchesQuery = !query || product.dataset.productName.toLowerCase().includes(query);
      product.hidden = !(matchesCategory && matchesQuery);
      if (!product.hidden) {
        groupCount += 1;
        visibleCount += 1;
      }
    });
    group.hidden = groupCount === 0;
  });

  if (digitalEmpty) digitalEmpty.hidden = visibleCount > 0;
  if (digitalEditorialRow) digitalEditorialRow.hidden = digitalCategory !== "all" || Boolean(query);
};

catalogFilters?.addEventListener("change", () => applyCatalog());
catalogSort?.addEventListener("change", () => applyCatalog({ resetLimit: false }));

quickCategories.forEach((button) => {
  button.addEventListener("click", () => {
    quickCategories.forEach((item) => item.classList.toggle("is-active", item === button));
    const radio = catalogFilters?.querySelector(`[name="catalog-category"][value="${button.dataset.categoryQuick}"]`);
    if (radio) radio.checked = true;
    applyCatalog();
  });
});

document.querySelector("[data-reset-filters]")?.addEventListener("click", () => {
  catalogFilters?.querySelectorAll('input[type="checkbox"]').forEach((input) => input.checked = false);
  const category = catalogFilters?.querySelector('[name="catalog-category"][value="all"]');
  const price = catalogFilters?.querySelector('[name="catalog-price"][value="all"]');
  if (category) category.checked = true;
  if (price) price.checked = true;
  quickCategories.forEach((item) => item.classList.toggle("is-active", item.dataset.categoryQuick === "all"));
  catalogQuery = "";
  applyCatalog();
});

document.querySelector("[data-toggle-filters]")?.addEventListener("click", () => {
  catalogFilters?.classList.toggle("is-open");
});

loadMoreButton?.addEventListener("click", () => {
  catalogLimit += 8;
  applyCatalog({ resetLimit: false });
});

renderCatalog();

digitalSearch?.addEventListener("input", applyDigitalCatalog);
digitalSort?.addEventListener("change", applyDigitalCatalog);
digitalFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    digitalCategory = button.dataset.digitalFilter;
    digitalFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    applyDigitalCatalog();
  });
});

document.querySelectorAll("[data-digital-jump]").forEach((button) => {
  button.addEventListener("click", () => {
    if (digitalSort) digitalSort.value = button.dataset.digitalJump === "new" ? "new" : "popular";
    digitalCategory = "all";
    digitalFilterButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.digitalFilter === "all"));
    if (digitalSearch) digitalSearch.value = "";
    applyDigitalCatalog();
    document.querySelector(".digital-recharges-collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

applyDigitalCatalog();

window.addEventListener("load", () => {
  window.setTimeout(() => {
    document.body.classList.add("is-loaded");
    if (loader) loader.setAttribute("aria-hidden", "true");
  }, 420);
});

const useLightweightMotion = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const sectionVariants = ["fade", "left", "right", "zoom", "down", "scale"];
  const cardVariants = ["up", "zoom", "rotate", "left", "right"];

  revealItems.forEach((item, index) => {
    const isCard = item.matches(".product-card, .digital-card, .deal-card, .mini-product, .activity-card, .page-list-item, .gaming-categories a, .gaming-products > article") || item.closest(".product-grid, .deal-grid, .digital-product-grid, .gaming-categories, .gaming-products");
    const section = item.closest("section");
    const sectionIndex = section ? [...document.querySelectorAll("main > section")].indexOf(section) : index;
    item.dataset.reveal = isCard
      ? cardVariants[index % cardVariants.length]
      : sectionVariants[Math.max(sectionIndex, 0) % sectionVariants.length];
    item.style.setProperty("--delay", `${Math.min(index % 6, 5) * (useLightweightMotion ? 28 : 55)}ms`);
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: useLightweightMotion ? 0.06 : 0.16, rootMargin: useLightweightMotion ? "0px 0px -12px 0px" : "0px 0px -40px 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  const parallaxTargets = useLightweightMotion
    ? []
    : document.querySelectorAll(".hero-image, .digital-hero, .page-hero");
  let parallaxFrame;
  const updateParallax = () => {
    parallaxFrame = undefined;
    parallaxTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const offset = Math.max(-10, Math.min(10, (window.innerHeight / 2 - rect.top - rect.height / 2) * 0.025));
      target.style.setProperty("--parallax-y", `${offset}px`);
    });
  };

  if (parallaxTargets.length) {
    window.addEventListener("scroll", () => {
      if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateParallax);
    }, { passive: true });
    updateParallax();
  }
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const gamingInteractiveCards = document.querySelectorAll(".gaming-categories a, .gaming-products > article, .gaming-popular-card");
const supportsGamingTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches
  && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (supportsGamingTilt) {
  gamingInteractiveCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
      const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.setProperty("--gaming-rotate-x", `${vertical * -4}deg`);
      card.style.setProperty("--gaming-rotate-y", `${horizontal * 5}deg`);
      card.style.setProperty("--gaming-light-x", `${(horizontal + 0.5) * 100}%`);
      card.style.setProperty("--gaming-light-y", `${(vertical + 0.5) * 100}%`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--gaming-rotate-x");
      card.style.removeProperty("--gaming-rotate-y");
      card.style.removeProperty("--gaming-light-x");
      card.style.removeProperty("--gaming-light-y");
      card.classList.remove("is-pressed");
    });

    card.addEventListener("pointerdown", () => card.classList.add("is-pressed"));
    card.addEventListener("pointerup", () => card.classList.remove("is-pressed"));
  });
}

const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const target = Number(element.dataset.count || 0);
      const duration = 900;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased).toLocaleString("fr-FR");
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
      countObserver.unobserve(element);
    });
  },
  { threshold: 0.5 }
);

counters.forEach((counter) => countObserver.observe(counter));

const saveFavorites = () => {
  localStorage.setItem("silverse:favorites", JSON.stringify(favorites));
};

const saveCart = () => {
  localStorage.setItem("silverse:cart", JSON.stringify(cart));
};

const loadCart = () => {
  try {
    cart = JSON.parse(localStorage.getItem("silverse:cart") || "[]");
  } catch {
    cart = [];
  }
};

const inferGameRegion = (name = "") => {
  const normalized = String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const explicit = normalized.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (explicit) return explicit.replace(/\s*\/\s*/g, "/");
  const aliases = ["GLOBAL", "EUROPE", "THAILAND", "SINGAPORE", "SAUDI ARABIA", "INDONESIA", "HONG KONG", "BRAZIL", "SOUTH AFRICA", "AUSTRALIA", "MALAYSIA", "MENA", "LATAM", "CIS", "EU", "VN", "TW", "PH", "SG", "TH", "ID", "BR", "BD"];
  return aliases.find((alias) => normalized.includes(alias)) || "GLOBAL";
};

const findLookupValue = (payload, keys, depth = 0) => {
  if (depth > 7 || payload == null || typeof payload !== "object") return "";
  for (const [key, value] of Object.entries(payload)) {
    if (keys.includes(key.toLowerCase()) && ["string", "number"].includes(typeof value) && String(value).trim()) return String(value).trim();
  }
  for (const value of Object.values(payload)) {
    const match = findLookupValue(value, keys, depth + 1);
    if (match) return match;
  }
  return "";
};

const refreshCheckoutDelivery = () => {
  if (!checkoutForm) return;
  const hasPhysical = cart.some((item) => item.type === "physical");
  const hasDigital = cart.some((item) => item.type === "digital" || item.categorySlug === "jeux" || item.categorySlug === "giftcards");
  const mobileViewport = window.matchMedia("(max-width: 900px)").matches;
  const hasGame = cart.some((item) => item.categorySlug === "jeux" && (!mobileViewport || item.requiresPlayerId === true));
  const cartReady = cart.length > 0 && cart.every((item) => item.type === "physical" || item.type === "digital");
  if (checkoutPayButton && !checkoutPayButton.dataset.submitting) {
    checkoutPayButton.disabled = !cartReady;
    checkoutPayButton.textContent = cartReady ? "Payer avec Money Fusion" : (cart.length ? "Vérification du panier…" : "Panier vide");
  }
  if (physicalDeliveryBlock) physicalDeliveryBlock.hidden = !hasPhysical;
  if (digitalCheckoutFields) digitalCheckoutFields.hidden = !hasGame;
  const playerIdField = checkoutForm.querySelector('[name="playerId"]');
  if (playerIdField) playerIdField.required = hasGame;
  if (hasGame) {
    const game = cart.find((item) => item.categorySlug === "jeux" && (!mobileViewport || item.requiresPlayerId === true));
    const regionField = checkoutForm.querySelector('[name="region"]');
    if (regionField && !regionField.value) regionField.value = inferGameRegion(game?.name || "");
  }
  const digitalStep = document.querySelector("[data-checkout-step]");
  const paymentStep = document.querySelector("[data-payment-step]");
  if (digitalStep) digitalStep.textContent = hasPhysical ? "03" : "02";
  if (paymentStep) paymentStep.textContent = hasPhysical && hasDigital ? "04" : "03";

  const option = checkoutForm.querySelector('[name="deliveryOption"]:checked')?.value || "address_now";
  if (deliveryAddressFields) deliveryAddressFields.hidden = !hasPhysical || option !== "address_now";
  if (deliveryLocationBox) deliveryLocationBox.hidden = !hasPhysical || option !== "current_location";
  if (deliveryLaterNote) deliveryLaterNote.hidden = !hasPhysical || option !== "communicate_later";
};

checkoutForm?.querySelectorAll('[name="deliveryOption"]').forEach((input) => {
  input.addEventListener("change", refreshCheckoutDelivery);
});

useCurrentLocationButton?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    if (locationStatus) locationStatus.textContent = "La géolocalisation n’est pas disponible sur cet appareil.";
    return;
  }
  useCurrentLocationButton.disabled = true;
  useCurrentLocationButton.textContent = "Localisation en cours…";
  navigator.geolocation.getCurrentPosition((position) => {
    const latitude = position.coords.latitude.toFixed(6);
    const longitude = position.coords.longitude.toFixed(6);
    checkoutForm.querySelector('[name="latitude"]').value = latitude;
    checkoutForm.querySelector('[name="longitude"]').value = longitude;
    if (locationStatus) locationStatus.textContent = `Position enregistrée avec une précision d’environ ${Math.round(position.coords.accuracy)} m.`;
    useCurrentLocationButton.textContent = "✓ Position enregistrée";
    useCurrentLocationButton.disabled = false;
  }, (error) => {
    const messages = {
      1: "Autorisation refusée. Vous pouvez saisir une adresse ou la communiquer plus tard.",
      2: "Position indisponible. Réessayez ou choisissez une autre option.",
      3: "La localisation a pris trop de temps. Réessayez."
    };
    if (locationStatus) locationStatus.textContent = messages[error.code] || "Impossible de récupérer votre position.";
    useCurrentLocationButton.textContent = "⌖ Réessayer la localisation";
    useCurrentLocationButton.disabled = false;
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
});

const loadFavorites = () => {
  try {
    favorites = JSON.parse(localStorage.getItem("silverse:favorites") || "[]");
  } catch {
    favorites = [];
  }
};

const getProductFromElement = (element) => {
  const card = element.closest("[data-product-id]");
  if (card) {
    return normalizeProduct({
      id: card.dataset.productId,
      name: card.dataset.productName,
      price: card.dataset.productPrice,
      media: card.dataset.productMedia,
      photo: card.dataset.productPhoto,
      variationId: card.dataset.productVariationId || "",
    });
  }

  const container = element.closest("article");
  const name = container?.querySelector("h3")?.textContent?.trim() || "Produit";
  const price = container?.querySelector("p")?.textContent?.trim() || "Prix disponible";
  const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return normalizeProduct({ id, name, price, media: "" });
};

const enhanceCatalogCards = () => {
  catalogProducts.forEach((card) => {
    const product = getCatalogProduct(card.dataset.productId);
    if (!product || card.dataset.enhanced === "true") return;
    card.dataset.productDescription = product.short;
    card.dataset.productAvailability = product.availability;
    card.dataset.productMedia = product.media;
    card.classList.add("shop-product-card");

    const title = card.querySelector("h3");
    const rating = card.querySelector(".market-rating");
    const actions = card.querySelector(".market-actions");

    if (title && !card.querySelector(".market-product-description")) {
      title.insertAdjacentHTML("afterend", `<p class="market-product-description">${product.short}</p>`);
    }

    if (rating && !card.querySelector(".market-availability")) {
      rating.insertAdjacentHTML("afterend", `<p class="market-availability ${product.availability === "Disponible" ? "is-available" : "is-unavailable"}">${product.availability}</p>`);
    }

    const actionButton = actions?.querySelector("button");
    if (actionButton) actionButton.textContent = "Ajouter au panier";
    card.dataset.enhanced = "true";
  });
};

const renderProductDetail = () => {
  const detailRoot = document.querySelector("[data-product-detail]");
  if (!detailRoot) return;

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id") || "";
  const product = getCatalogProduct(requestedId);
  if (!product) {
    detailRoot.innerHTML = `<section class="page-panel catalog-empty"><strong>Ce produit n’est pas disponible</strong><p>Il ne fait pas partie du catalogue actuellement autorisé.</p><a class="primary-button" href="gaming.html">Voir les produits disponibles</a></section>`;
    document.title = "Produit indisponible | SILVERSE SHOP";
    return;
  }
  const variations = Array.isArray(product.variations) ? product.variations : [];
  const initialVariation = variations[0] || null;
  const initialPrice = initialVariation ? formatMoney(initialVariation.price, product.currency) : product.price;
  const cartProductName = initialVariation ? `${product.name} — ${initialVariation.name}` : product.name;
  const isDigitalProduct = product.type === "digital" || product.categorySlug === "jeux" || product.categorySlug === "giftcards";
  const productRef = `NB-${product.id.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 18)}`;
  const productType = isDigitalProduct ? "Produit numérique" : "Produit physique";
  const deliveryInfo = isDigitalProduct
    ? {
      title: "Livraison digitale rapide",
      items: ["Réception par e-mail ou espace compte après validation", "Instructions d'obtention envoyées avec la confirmation", "Support disponible en cas de difficulté d'activation"]
    }
    : {
      title: "Livraison physique sous 24 h",
      items: ["Adresse saisie, position actuelle ou coordonnées communiquées plus tard", "Livraison sous 24 h après disponibilité du produit et confirmation de l’adresse", "Suivi de commande disponible dans votre espace client"]
    };
  const similar = Object.values(productCatalog)
    .filter((item) => item.id !== product.id && (item.category === product.category || product.category === "Produit"))
    .slice(0, 4);
  const fallbackRecommendations = Object.values(productCatalog)
    .filter((item) => item.id !== product.id && !similar.some((similarItem) => similarItem.id === item.id))
    .slice(0, 4);
  let recentProducts = [];
  try {
    recentProducts = JSON.parse(localStorage.getItem("silverse:recent-products") || "[]")
      .filter((item) => item.id !== product.id)
      .slice(0, 4)
      .map(normalizeProduct);
  } catch {
    recentProducts = [];
  }
  const recommendations = recentProducts.length ? recentProducts : fallbackRecommendations;
  localStorage.setItem("silverse:recent-products", JSON.stringify([
    { id: product.id, name: product.name, price: product.price, media: product.media, photo: product.photo },
    ...recentProducts
  ].slice(0, 8)));
  const productCard = (item) => `
    <article class="market-product-card shop-product-card product-reco-card" data-product-id="${item.id}" data-product-name="${item.name}" data-product-price="${item.price}" data-product-media="${item.media}" data-product-photo="${item.photo || ""}">
      <a class="market-product-image ${item.photo ? "has-product-photo" : "product-image-placeholder"} ${escapeHtml(item.media)}" href="product.html?id=${encodeURIComponent(item.id)}" aria-label="Voir ${escapeHtml(item.name)}">${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<i aria-hidden="true">◇</i>`}</a>
      <button class="favorite-toggle" type="button" aria-label="Ajouter aux favoris" data-favorite-product>♡</button>
      <p class="market-brand">SILVERSE SHOP</p>
      <h3>${item.name}</h3>
      <p class="market-product-description">${item.short || "Produit recommandé par SILVERSE SHOP."}</p>
      <p class="market-availability ${item.availability === "Indisponible" ? "is-unavailable" : "is-available"}">${item.availability || "Disponible"}</p>
      <div class="market-price"><strong>${item.price}</strong></div>
      <div class="market-actions"><a href="product.html?id=${item.id}">Voir</a><button type="button" data-add-cart>Ajouter au panier</button></div>
    </article>
  `;

  document.title = `${product.name} | SILVERSE SHOP`;
  detailRoot.innerHTML = `
    <section class="product-detail-hero" data-product-id="${escapeHtml(product.id)}" data-product-name="${escapeHtml(cartProductName)}" data-product-price="${escapeHtml(initialPrice)}" data-product-media="${escapeHtml(product.media)}" data-product-photo="${escapeHtml(product.photo || "")}" data-product-variation-id="${escapeHtml(initialVariation?.id || "")}">
      <div class="product-gallery">
        <div class="product-gallery-main market-product-image ${product.photo ? "has-product-photo" : "product-image-placeholder"} ${escapeHtml(product.media)}" data-product-gallery-main role="img" aria-label="${escapeHtml(product.name)}">${product.photo ? `<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" decoding="async">` : `<i aria-hidden="true">◇</i>`}</div>
        <div class="product-gallery-thumbs" aria-label="Galerie produit">
          <button class="is-active market-product-image ${product.photo ? "has-product-photo" : "product-image-placeholder"} ${escapeHtml(product.media)}" type="button" aria-label="Vue principale" data-product-gallery-thumb="${escapeHtml(product.media)}" data-product-gallery-photo="${escapeHtml(product.photo || "")}">${product.photo ? `<img src="${escapeHtml(product.photo)}" alt="">` : `<i aria-hidden="true">◇</i>`}</button>
        </div>
      </div>
      <article class="product-detail-info">
        <div class="product-detail-kicker"><span>${product.category}</span><em>${productRef}</em></div>
        <h1>${product.name}</h1>
        <div class="product-detail-price"><strong data-product-detail-price>${escapeHtml(initialPrice)}</strong>${product.oldPrice ? `<del>${escapeHtml(product.oldPrice)}</del>` : ""}</div>
        <div class="product-detail-status">
          <p class="market-availability ${product.availability === "Disponible" ? "is-available" : "is-unavailable"}">${product.availability}</p>
          <span>En stock</span>
        </div>
        <p class="product-detail-lead">${product.short || product.description}</p>
        ${variations.length ? `<label class="product-variation-field">Choisissez une option<select data-product-variation>${variations.map((variation) => `<option value="${escapeHtml(variation.id)}" data-price="${Number(variation.price)}" data-name="${escapeHtml(variation.name)}">${escapeHtml(variation.name)} — ${escapeHtml(formatMoney(variation.price, product.currency))}</option>`).join("")}</select></label>` : ""}
        <div class="product-detail-actions" aria-label="Actions produit">
          <button class="product-buy-now" type="button" data-buy-now>Acheter maintenant</button>
          <button class="product-add-cart" type="button" data-add-cart>Ajouter au panier</button>
          <button class="product-detail-favorite" type="button" aria-label="Ajouter aux favoris" data-favorite-product><span>♡</span><strong>Favoris</strong></button>
        </div>
        <dl class="product-detail-meta">
        <div><dt>Marque</dt><dd>SILVERSE SHOP</dd></div>
          <div><dt>Catégorie</dt><dd>${product.category}</dd></div>
          <div><dt>Référence</dt><dd>${productRef}</dd></div>
          <div><dt>Type</dt><dd>${productType}</dd></div>
          <div><dt>Livraison</dt><dd>${isDigitalProduct ? "Digitale rapide" : "Suivie"}</dd></div>
          <div><dt>Paiement</dt><dd>Sécurisé</dd></div>
        </dl>
      </article>
    </section>
    <section class="product-detail-section">
      <div class="page-panel">
        <h2>Description complète</h2>
        <div class="product-detail-copy-grid">
          <article><h3>Présentation</h3><p>${product.description}</p></article>
          <article><h3>Utilisation</h3><p>${isDigitalProduct ? "Après validation du paiement, les informations d'accès ou d'activation sont transmises selon le produit choisi." : "Ce produit est pensé pour un usage quotidien, avec une préparation soignée et un suivi clair après commande."}</p></article>
          <article><h3>Avantages</h3><p>${product.short || "Une sélection claire, fiable et adaptée aux besoins courants."}</p></article>
        </div>
      </div>
    </section>
    <section class="product-detail-section">
      <div class="page-panel product-extra-panel">
        <p class="eyebrow">Détails</p>
        <h2>Informations complémentaires</h2>
        <dl class="product-detail-meta product-extra-meta">
          <div><dt>Type de produit</dt><dd>${productType}</dd></div>
          <div><dt>Conditions d'utilisation</dt><dd>${isDigitalProduct ? "Activation selon les instructions reçues" : "Usage conforme aux indications du produit"}</dd></div>
          <div><dt>Compatibilité</dt><dd>${isDigitalProduct ? "Selon compte, région ou service sélectionné" : "Usage quotidien et accessoires compatibles selon besoin"}</dd></div>
          <div><dt>Assistance</dt><dd>Support SILVERSE SHOP disponible</dd></div>
        </dl>
      </div>
    </section>
    <section class="product-detail-section">
      <div class="product-info-panels">
        <article class="page-panel"><p class="eyebrow">Caractéristiques</p><h2>Points clés</h2><ul class="product-detail-list">${product.details.map((detail) => `<li>${detail}</li>`).join("")}</ul></article>
        <article class="page-panel"><p class="eyebrow">Pourquoi choisir ce produit</p><h2>Ce qui fait la différence</h2><ul class="product-detail-list"><li>Produit sélectionné par SILVERSE SHOP</li><li>Paiement sécurisé</li><li>Parcours d'achat clair</li><li>Assistance disponible</li></ul></article>
      </div>
    </section>
    <section class="product-detail-section">
      <div class="page-panel product-delivery-panel"><p class="eyebrow">${deliveryInfo.title}</p><h2>Informations de livraison</h2><ul class="product-detail-list">${deliveryInfo.items.map((item) => `<li>${item}</li>`).join("")}</ul></div>
    </section>
    <section class="product-detail-section">
      <div class="section-heading"><div><p class="eyebrow">Suggestions</p><h2>Produits similaires</h2></div><a class="section-link" href="boutique.html#catalogue">Voir la boutique <span>→</span></a></div>
      <div class="market-product-grid product-similar-grid">
        ${similar.map(productCard).join("")}
      </div>
    </section>
    <section class="product-detail-section">
      <div class="section-heading"><div><p class="eyebrow">Recommandations</p><h2>Vous pourriez également aimer</h2></div></div>
      <div class="market-product-grid product-similar-grid">
        ${recommendations.map(productCard).join("")}
      </div>
    </section>
  `;

  const variationSelect = detailRoot.querySelector("[data-product-variation]");
  variationSelect?.addEventListener("change", () => {
    const option = variationSelect.selectedOptions[0];
    const detailCard = detailRoot.querySelector("[data-product-id]");
    const priceLabel = formatMoney(Number(option?.dataset.price || 0), product.currency);
    if (detailCard) {
      detailCard.dataset.productVariationId = variationSelect.value;
      detailCard.dataset.productName = `${product.name} — ${option?.dataset.name || "Option"}`;
      detailCard.dataset.productPrice = priceLabel;
    }
    const priceNode = detailRoot.querySelector("[data-product-detail-price]");
    if (priceNode) priceNode.textContent = priceLabel;
  });
};

const updateCartCount = () => {
  count = cart.reduce((total, item) => total + (item.qty || 1), 0);
  const total = cart.reduce((sum, item) => sum + (Number(item.rawPrice || 0) * Number(item.qty || 1)) + Number(item.shippingFee || 0), 0);
  if (cartCount) cartCount.textContent = String(count);
  cartPageSummaries.forEach((summary) => {
    summary.textContent = count
      ? `${count} article${count > 1 ? "s" : ""} · Total confirmé : ${formatMoney(total)}`
      : "0 article dans le panier";
  });
};

const bumpCart = () => {
  const cartButton = document.querySelector(".cart-button");
  if (!cartButton) return;
  cartButton.classList.remove("bump");
  void cartButton.offsetWidth;
  cartButton.classList.add("bump");
};

const addToCart = (product) => {
  const cartKey = `${product.id}:${product.variationId || "base"}`;
  const existing = cart.find((item) => (item.cartKey || `${item.id}:${item.variationId || "base"}`) === cartKey);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart = [{ ...product, cartKey, qty: 1 }, ...cart];
  }

  saveCart();
  updateCartCount();
  renderCartPage();
  bumpCart();
  void validateCartWithBackend();
};

const removeFromCart = (id) => {
  cart = cart.filter((item) => (item.cartKey || item.id) !== id);
  saveCart();
  updateCartCount();
  renderCartPage();
  void validateCartWithBackend();
};

const renderCompactItems = (items, emptyMessage, actionType = "cart") => {
  if (items.length === 0) {
    const isFavoriteState = actionType === "favorite";
    return `
      <div class="state-empty favorites-empty-state">
        <span class="empty-illustration" aria-hidden="true">${isFavoriteState ? "♡" : "0"}</span>
        <strong>${emptyMessage}</strong>
        <p>${isFavoriteState ? "Enregistrez vos produits préférés pour les retrouver facilement lors de vos prochaines visites." : "Ajoutez des produits au panier pour préparer votre commande."}</p>
        <a class="page-action" href="boutique.html#catalogue">Découvrir les produits</a>
      </div>
    `;
  }

  return items.map((rawItem) => {
    const item = normalizeProduct(rawItem);
    return `
    <article class="page-list-item favorite-page-card" data-product-id="${item.id}" data-product-name="${item.name}" data-product-price="${item.price}" data-product-media="${item.media || ""}" data-product-photo="${item.photo || ""}">
      <span class="favorite-thumb ${item.photo ? "has-product-photo" : "product-image-placeholder"} ${escapeHtml(item.media || "")}">${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<i aria-hidden="true">◇</i>`}</span>
      <div>
        <strong>${item.name}</strong>
        <em>${item.price}</em>
        ${actionType === "favorite" && item.short ? `<small>${item.short}</small>` : ""}
        ${item.qty ? `<small>Quantité : ${item.qty}</small>` : ""}
        ${actionType === "cart" && item.shippingFeeLabel ? `<small>Livraison : ${item.shippingFeeLabel}</small>` : ""}
      </div>
      ${actionType === "cart" ? `
        <button type="button" data-cart-remove="${item.cartKey || item.id}">Supprimer</button>
      ` : `
        <div class="favorite-page-actions">
          <a href="product.html?id=${item.id}">Voir</a>
          <button type="button" data-favorite-page-add-cart="${item.id}">Ajouter au panier</button>
          <button type="button" data-favorite-page-remove="${item.id}">Supprimer</button>
        </div>
      `}
    </article>
  `;
  }).join("");
};

const renderCartPage = () => {
  if (!cartPageList) return;
  cartPageList.innerHTML = renderCompactItems(cart, "Votre panier est vide", "cart");
};

const validateCartWithBackend = async () => {
  if (!cart.length) {
    refreshCheckoutDelivery();
    return false;
  }
  const previousPrices = new Map(cart.map((item) => [`${item.id}:${item.variationId || "base"}`, Number(item.rawPrice || 0)]));
  let priceChanged = false;
  try {
    const response = await fetch("/api/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.map((item) => ({ id: item.id, variationId: item.variationId || "", qty: item.qty || 1 })) })
    });
    if (!response.ok) return false;
    const data = await response.json();
    priceChanged = data.items.some((item) => {
      const key = `${item.id}:${item.variationId || "base"}`;
      const previous = previousPrices.get(key);
      return Number.isFinite(previous) && previous > 0 && Math.abs(previous - Number(item.price || 0)) >= 0.01;
    });
    cart = data.items.map((item) => ({ ...normalizeBackendProduct(item), price: item.priceLabel || item.price, variationId: item.variationId || "", cartKey: `${item.id}:${item.variationId || "base"}`, qty: item.qty }));
    saveCart();
    updateCartCount();
    renderCartPage();
  } catch {
    showToast("Le panier sera resynchronisé plus tard");
  } finally {
    refreshCheckoutDelivery();
  }
  return priceChanged;
};

const renderFavoritesPage = () => {
  if (!favoritesPageList) return;
  favoritesPageList.innerHTML = renderCompactItems(favorites, "Aucun produit en favoris", "favorite");
};

const syncFavoriteButtons = () => {
  document.querySelectorAll("[data-favorite-product]").forEach((button) => {
    const card = button.closest("[data-product-id]");
    if (!card) return;
    const isActive = favorites.some((item) => item.id === card.dataset.productId);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-label", isActive ? "Retirer des favoris" : "Ajouter aux favoris");
  });
};

const lockBodyScroll = () => {
  lockedScrollY = window.scrollY;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  if (window.matchMedia("(max-width: 900px)").matches) {
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.right = "0";
    document.body.style.left = "0";
    document.body.style.width = "100%";
  }
  document.body.classList.add("modal-open");
};

const unlockBodyScroll = (restoreScroll = true) => {
  document.body.classList.remove("modal-open");
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.right = "";
  document.body.style.left = "";
  document.body.style.width = "";
  if (restoreScroll) window.scrollTo(0, lockedScrollY);
};

const openMobileMenu = () => {
  if (!mobileMenu) return;
  window.clearTimeout(mobileMenuCloseTimer);
  if (mobileMenu.hidden) lockBodyScroll();
  mobileMenu.hidden = false;
  mobileMenu.classList.remove("is-closing");
  openMobileMenuButton?.setAttribute("aria-expanded", "true");
  mobileMenu.querySelector(".mobile-menu-close")?.focus();
};

const closeMobileMenu = () => {
  if (!mobileMenu || mobileMenu.hidden) return;
  mobileMenu.classList.add("is-closing");
  openMobileMenuButton?.setAttribute("aria-expanded", "false");
  mobileMenuCloseTimer = window.setTimeout(() => {
    mobileMenu.hidden = true;
    mobileMenu.classList.remove("is-closing");
    unlockBodyScroll();
    openMobileMenuButton?.focus();
  }, 280);
};

openMobileMenuButton?.addEventListener("click", openMobileMenu);
closeMobileMenuButtons.forEach((button) => button.addEventListener("click", closeMobileMenu));
mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  openMobileMenuButton?.setAttribute("aria-expanded", "false");
}));

const openCategoryModal = () => {
  if (!categoryModal) return;
  window.clearTimeout(categoryCloseTimer);
  if (categoryModal.hidden) lockBodyScroll();
  categoryModal.hidden = false;
  categoryModal.classList.remove("is-closing");
  categoryModal.querySelector(".modal-close")?.focus();
};

const closeCategoryModal = ({ restoreScroll = true, scrollTarget = null } = {}) => {
  if (!categoryModal || categoryModal.hidden) return;
  categoryModal.classList.add("is-closing");
  categoryCloseTimer = window.setTimeout(() => {
    categoryModal.hidden = true;
    categoryModal.classList.remove("is-closing");
    unlockBodyScroll(restoreScroll);
    if (scrollTarget) scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 280);
};

openCategoryButtons.forEach((button) => {
  button.addEventListener("click", openCategoryModal);
});

closeCategoryButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const href = button.getAttribute("href");
    if (!href || !href.startsWith("#")) {
      closeCategoryModal();
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      closeCategoryModal();
      return;
    }

    event.preventDefault();
    closeCategoryModal({ restoreScroll: false, scrollTarget: target });
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileMenu();
    closeCategoryModal();
    if (searchPanel && !searchPanel.hidden) searchPanel.hidden = true;
  }
});

toggleFavoritesButtons.forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = "favorites.html";
  });
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-favorite-product]");
  if (!button) return;
  const card = button.closest("[data-product-id]");
  if (!card) return;
  const product = normalizeProduct({
    id: card.dataset.productId,
    name: card.dataset.productName,
    price: card.dataset.productPrice,
    media: card.dataset.productMedia,
  });
  const exists = favorites.some((item) => item.id === product.id);

  if (exists) {
    favorites = favorites.filter((item) => item.id !== product.id);
    showToast("Produit retiré des favoris");
  } else {
    favorites = [product, ...favorites];
    showToast("Produit ajouté aux favoris");
  }

  saveFavorites();
  void syncFavoriteWithAccount(product.id, !exists);
  syncFavoriteButtons();
  renderFavoritesPage();
});

const initializeCommerce = async () => {
  loadFavorites();
  loadCart();
  refreshCheckoutDelivery();

  try {
    await loadBackendProducts();
  } catch {
    refreshGlobalSearchItems();
    showToast("Catalogue local chargé, API indisponible");
  }

  enhanceCatalogCards();
  renderProductDetail();
  syncFavoriteButtons();
  updateCartCount();
  renderCatalog();
  renderCartPage();
  renderFavoritesPage();
  await validateCartWithBackend();
};

void initializeCommerce();

cartPageList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-remove]");
  if (!button) return;
  removeFromCart(button.dataset.cartRemove);
  showToast("Produit retiré du panier");
});

favoritesPageList?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-favorite-page-remove]");
  const addButton = event.target.closest("[data-favorite-page-add-cart]");

  if (removeButton) {
    favorites = favorites.filter((item) => item.id !== removeButton.dataset.favoritePageRemove);
    saveFavorites();
    void syncFavoriteWithAccount(removeButton.dataset.favoritePageRemove, false);
    syncFavoriteButtons();
    renderFavoritesPage();
    showToast("Produit retiré des favoris");
  }

  if (addButton) {
    const item = favorites.find((favorite) => favorite.id === addButton.dataset.favoritePageAddCart);
    if (item) {
      addToCart(item);
      showToast("Favori ajouté au panier");
    }
  }
});

document.addEventListener("click", (event) => {
  const thumb = event.target.closest("[data-product-gallery-thumb]");
  if (!thumb) return;
  const gallery = thumb.closest(".product-gallery");
  const main = gallery?.querySelector("[data-product-gallery-main]");
  if (!main) return;
  gallery.querySelectorAll("[data-product-gallery-thumb]").forEach((item) => item.classList.toggle("is-active", item === thumb));
  main.className = `product-gallery-main market-product-image ${thumb.dataset.productGalleryThumb}`;
  const photo = thumb.dataset.productGalleryPhoto || "";
  main.classList.add(photo ? "has-product-photo" : "product-image-placeholder");
  main.innerHTML = photo ? `<img src="${escapeHtml(photo)}" alt="">` : '<i aria-hidden="true">◇</i>';
});

openSearchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!searchPanel) return;
    searchPanel.hidden = false;
    renderGlobalSearch();
    searchPanel.querySelector("input").focus();
    showToast("Recherche globale ouverte");
  });
});

closeSearchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!searchPanel) return;
    searchPanel.hidden = true;
    showToast("Recherche fermée");
  });
});

globalSearchInput?.addEventListener("input", renderGlobalSearch);

document.addEventListener("click", (event) => {
  const card = event.target.closest("[data-product-link]");
  if (!card || event.target.closest("button, a, input, select, textarea")) return;
  window.location.href = card.dataset.productLink;
});

document.addEventListener("keydown", (event) => {
  const card = event.target.closest("[data-product-link]");
  if (!card || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  window.location.href = card.dataset.productLink;
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-cart]");
  if (!button) return;
  const originalText = button.dataset.originalText || button.textContent;
  button.dataset.originalText = originalText;
  const product = getProductFromElement(button);
  addToCart(product);
  button.classList.add("is-confirmed");
  button.textContent = "Ajouté";
  showToast("Produit ajouté au panier");
  window.setTimeout(() => {
    button.classList.remove("is-confirmed");
    button.textContent = originalText;
  }, 1200);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-buy-now]");
  if (!button) return;
  const product = getProductFromElement(button);
  addToCart(product);
  showToast("Produit ajouté. Redirection vers le paiement");
  window.setTimeout(() => {
    window.location.href = "checkout.html";
  }, 520);
});

document.querySelectorAll(".cart-button").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = "cart.html";
  });
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = button.dataset.go;
  });
});

document.querySelectorAll("[data-support-submit]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast("Message envoyé au support");
  });
});

const setFieldError = (field, message = "") => {
  const label = field.closest("label");
  const error = label?.querySelector("[data-field-error]");
  field.classList.toggle("is-invalid", Boolean(message));
  if (error) error.textContent = message;
};

const validateAccountForm = (form) => {
  const fields = [...form.querySelectorAll("input")];
  let isValid = true;

  fields.forEach((field) => {
    let message = "";
    if (field.required && field.type === "checkbox" && !field.checked) {
      message = "Ce choix est obligatoire.";
    } else if (field.required && !field.value.trim()) {
      message = "Ce champ est obligatoire.";
    } else if (field.type === "email" && field.value && !field.validity.valid) {
      message = "Adresse e-mail invalide.";
    } else if (field.name === "password" && field.value && field.value.length < 6) {
      message = "Utilisez au moins 6 caractères.";
    }

    setFieldError(field, message);
    if (message) isValid = false;
  });

  const password = form.querySelector('[name="password"]');
  const confirm = form.querySelector('[name="confirmPassword"]');
  if (password && confirm && password.value && confirm.value && password.value !== confirm.value) {
    setFieldError(confirm, "Les mots de passe ne correspondent pas.");
    isValid = false;
  }

  return isValid;
};

const giftCardDeliveries = (order) => (order.items || [])
  .filter((item) => item.category === "giftcards")
  .flatMap((item) => (item.deliveryCodes || []).map((code) => ({ name: item.name, code })));

const renderOrderTracking = (order) => {
  const deliveries = giftCardDeliveries(order);
  const waitingForGiftCode = order.payment?.status === "succeeded"
    && (order.items || []).some((item) => item.category === "giftcards")
    && deliveries.length === 0;
  return `
  <h2>${order.statusLabel}</h2>
  <p><strong>${order.id}</strong> · ${order.trackingNumber}</p>
  <p>Total : ${order.totalLabel}</p>
  ${deliveries.length ? `<section class="digital-delivery-box"><p class="eyebrow">Livraison numérique</p><h3>Votre carte cadeau est disponible</h3><p>Copiez le code ci-dessous ou téléchargez-le pour le conserver.</p><div class="digital-code-list">${deliveries.map(({ name, code }) => `<article><span>${escapeHtml(name)}</span><code>${escapeHtml(code)}</code><button type="button" data-copy-digital-code="${escapeHtml(code)}">Copier</button></article>`).join("")}</div><button type="button" class="checkout-secondary-button" data-download-digital-codes>Télécharger mes codes</button></section>` : ""}
  ${waitingForGiftCode ? `<section class="digital-delivery-box is-waiting"><h3>Paiement confirmé</h3><p>Votre code est en cours de récupération. Cette page s’actualise automatiquement.</p></section>` : ""}
  <div class="catalog-load-more"><span>${order.trackingProgress}% du traitement</span></div>
  <div class="page-list">
    ${(order.timeline || []).map((event) => `
      <article class="page-list-item">
        <div>
          <strong>${event.label}</strong>
          <em>${new Date(event.createdAt).toLocaleString("fr-FR")}</em>
          <small>${event.location || "SILVERSE SHOP"}</small>
          <small>${event.note || "Mise à jour de commande"}</small>
        </div>
      </article>
    `).join("")}
  </div>
`;
};

let trackingRefreshTimer;
let trackingRefreshAttempts = 0;
const scheduleGiftCardRefresh = (reference, order) => {
  window.clearTimeout(trackingRefreshTimer);
  const needsRefresh = order.payment?.status === "succeeded"
    && (order.items || []).some((item) => item.category === "giftcards")
    && giftCardDeliveries(order).length === 0;
  if (!needsRefresh || trackingRefreshAttempts >= 24) return;
  trackingRefreshTimer = window.setTimeout(async () => {
    trackingRefreshAttempts += 1;
    try {
      const refreshedOrder = await fetchOrderTracking(reference);
      if (trackingResult) trackingResult.innerHTML = renderOrderTracking(refreshedOrder);
      scheduleGiftCardRefresh(reference, refreshedOrder);
    } catch {
      scheduleGiftCardRefresh(reference, order);
    }
  }, 5000);
};

const fetchOrderTracking = async (reference) => {
  const response = await fetch(`/api/tracking/${encodeURIComponent(reference)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Commande introuvable");
  return data.order;
};

const refreshCustomerSession = async () => {
  try {
    const response = await fetch("/api/auth/session", { credentials: "same-origin", headers: { "Accept": "application/json" } });
    const data = await response.json();
    customerSession = response.ok && data.authenticated ? data : null;
  } catch {
    customerSession = null;
  }
  return customerSession;
};

const customerSecurityHeaders = () => customerSession?.csrfToken ? { "X-CSRF-Token": customerSession.csrfToken } : {};

const syncFavoriteWithAccount = async (productId, shouldExist) => {
  if (!customerSession?.authenticated || !productId) return;
  try {
    await fetch(`/api/account/favorites/${encodeURIComponent(productId)}`, {
      method: shouldExist ? "POST" : "DELETE",
      credentials: "same-origin",
      headers: { "Accept": "application/json", ...customerSecurityHeaders() }
    });
  } catch {
    // Le favori reste disponible localement et sera resynchronisé plus tard.
  }
};

const renderCustomerAccount = async () => {
  const forms = document.querySelector("[data-account-forms]");
  const sessionPanel = document.querySelector("[data-account-session]");
  if (!forms || !sessionPanel) return;
  forms.hidden = Boolean(customerSession?.authenticated);
  sessionPanel.hidden = !customerSession?.authenticated;
  if (!customerSession?.authenticated) return;
  sessionPanel.querySelector("[data-account-name]").textContent = customerSession.account.fullName;
  sessionPanel.querySelector("[data-account-email]").textContent = customerSession.account.email;
  try {
    const response = await fetch("/api/account/overview", { credentials: "same-origin", headers: { "Accept": "application/json" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Compte indisponible");
    const root = sessionPanel.querySelector("[data-account-orders]");
    root.innerHTML = data.orders.length ? data.orders.map((order) => `
      <a class="account-order" href="tracking.html?ref=${encodeURIComponent(order.trackingNumber)}">
        <span><strong>${escapeHtml(order.id)}</strong><small>${new Date(order.createdAt).toLocaleDateString("fr-FR")}</small></span>
        <span><b>${escapeHtml(order.totalLabel)}</b><small>${escapeHtml(order.statusLabel)}</small></span>
      </a>
    `).join("") : `<p class="account-empty">Aucune commande pour le moment.</p>`;
    const remoteFavorites = data.favorites || [];
    const localIds = new Set(favorites.map((item) => item.id));
    remoteFavorites.forEach((item) => {
      if (!localIds.has(item.id)) favorites.push(normalizeBackendProduct(item));
    });
    saveFavorites();
    renderFavoritesPage();
    await Promise.all(favorites.map((item) => syncFavoriteWithAccount(item.id, true)));
  } catch (error) {
    sessionPanel.querySelector("[data-account-orders]").innerHTML = `<p class="account-empty">${escapeHtml(error.message)}</p>`;
  }
};

const initializeCustomerAccount = async () => {
  await refreshCustomerSession();
  await renderCustomerAccount();
};

document.querySelectorAll("[data-account-form]").forEach((form) => {
  const message = form.querySelector("[data-form-message]");
  form.addEventListener("input", (event) => {
    if (event.target.matches("input")) setFieldError(event.target);
    form.classList.remove("has-success");
    if (message) message.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const isValid = validateAccountForm(form);
    form.classList.toggle("has-errors", !isValid);
    form.classList.toggle("has-success", isValid);

    if (!isValid) {
      if (message) message.textContent = "Veuillez corriger les champs indiqués.";
      showToast("Formulaire incomplet");
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    const originalLabel = submit.textContent;
    submit.textContent = "Vérification…";
    const values = Object.fromEntries(new FormData(form));
    try {
      const endpoint = form.dataset.accountForm === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Connexion impossible.");
      customerSession = data;
      form.reset();
      if (message) message.textContent = "Connexion réussie.";
      showToast(form.dataset.accountForm === "login" ? "Vous êtes connecté" : "Votre compte est créé");
      await renderCustomerAccount();
    } catch (error) {
      form.classList.add("has-errors");
      if (message) message.textContent = error.message;
      showToast(error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = originalLabel;
    }
  });
});

document.querySelector("[data-account-logout]")?.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", ...customerSecurityHeaders() }, body: "{}" });
  } finally {
    customerSession = null;
    await renderCustomerAccount();
    showToast("Vous êtes déconnecté");
  }
});

void initializeCustomerAccount();

trackingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const reference = String(new FormData(trackingForm).get("reference") || "").trim();
  if (!reference) return;
  const submitButton = trackingForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Recherche...";
  }

  try {
    const order = await fetchOrderTracking(reference);
    if (trackingResult) trackingResult.innerHTML = renderOrderTracking(order);
    trackingRefreshAttempts = 0;
    scheduleGiftCardRefresh(reference, order);
    showToast("Suivi commande chargé");
  } catch (error) {
    if (trackingResult) trackingResult.innerHTML = `<h2>Commande introuvable</h2><p>${error.message}</p>`;
    showToast(error.message || "Commande introuvable");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Suivre la commande";
    }
  }
});

trackingResult?.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-digital-code]");
  if (copyButton) {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copyDigitalCode || "");
      copyButton.textContent = "Copié ✓";
      showToast("Code copié");
    } catch {
      showToast("Copie impossible sur ce navigateur");
    }
    return;
  }
  if (!event.target.closest("[data-download-digital-codes]")) return;
  const reference = String(trackingForm?.querySelector('[name="reference"]')?.value || "commande").trim();
  const codes = [...trackingResult.querySelectorAll(".digital-code-list article")]
    .map((item) => `${item.querySelector("span")?.textContent || "Carte cadeau"}\n${item.querySelector("code")?.textContent || ""}`)
    .join("\n\n");
  if (!codes) return;
  const url = URL.createObjectURL(new Blob([`SILVERSE SHOP — ${reference}\n\n${codes}\n`], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `silverse-${reference.replace(/[^a-z0-9-]+/gi, "-")}-codes.txt`;
  link.click();
  URL.revokeObjectURL(url);
});

orderStatusForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(orderStatusForm);
  const reference = String(formData.get("reference") || "").trim();
  const status = String(formData.get("status") || "processing");
  const note = String(formData.get("note") || "").trim();
  const location = String(formData.get("location") || "SILVERSE SHOP").trim();
  const submitButton = orderStatusForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Mise à jour...";
  }

  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(reference)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note, location })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Mise à jour refusée");
    if (orderStatusResult) orderStatusResult.innerHTML = renderOrderTracking(data.order);
    showToast("Commande mise à jour");
  } catch (error) {
    if (orderStatusResult) orderStatusResult.innerHTML = `<p>${error.message || "Impossible de mettre à jour la commande"}</p>`;
    showToast(error.message || "Impossible de mettre à jour la commande");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Mettre à jour la commande";
    }
  }
});

const verifyCheckoutPlayer = async () => {
  const form = playerLookupButton.closest("form");
  const playerId = form?.querySelector('[name="playerId"]')?.value.trim() || "";
  const mobileViewport = window.matchMedia("(max-width: 900px)").matches;
  const game = cart.find((item) => item.categorySlug === "jeux" && (!mobileViewport || item.requiresPlayerId === true));
  const gameName = game?.name || "";
  const region = inferGameRegion(gameName);
  const regionField = form?.querySelector('[name="region"]');
  const nicknameField = form?.querySelector('[name="nickname"]');
  if (regionField) regionField.value = region;
  if (!playerId) {
    showToast("Renseignez votre UID joueur");
    return;
  }
  if (!/free\s*fire/i.test(gameName)) {
    if (nicknameField) nicknameField.value = "";
    if (playerLookupResult) playerLookupResult.innerHTML = `<p class="is-success"><strong>UID enregistré.</strong> Région détectée : ${escapeHtml(region)}.</p>`;
    showToast("UID prêt pour la recharge");
    return;
  }
  playerLookupButton.disabled = true;
  playerLookupButton.textContent = "Vérification...";
  try {
    const lookupController = new AbortController();
    const lookupTimeout = window.setTimeout(() => lookupController.abort(), 15_000);
    const response = await fetch("/api/catalog/player-lookup", {
      method: "POST",
      signal: lookupController.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: playerId, region: region.toUpperCase().replace(/[^A-Z-]/g, "") || "GLOBAL" })
    });
    window.clearTimeout(lookupTimeout);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "UID non vérifié");
    const nickname = findLookupValue(data, ["nickname", "playernickname", "player_nickname", "username", "playername", "player_name", "accountname", "account_name", "pseudo", "nom", "name"]);
    if (!nickname) throw new Error("Le service de vérification n’a retourné aucun pseudo pour cet UID.");
    const detectedRegion = findLookupValue(data, ["region", "server", "zone"]) || region;
    if (nicknameField) nicknameField.value = nickname;
    if (regionField) regionField.value = detectedRegion;
    if (playerLookupResult) playerLookupResult.innerHTML = `<p class="is-success"><strong>Compte vérifié${nickname ? ` : ${escapeHtml(nickname)}` : ""}.</strong> Région : ${escapeHtml(detectedRegion)}.</p>`;
    showToast("UID Free Fire vérifié");
  } catch (error) {
    const message = error.name === "AbortError"
      ? "Le service de vérification met trop de temps à répondre. Votre UID reste utilisable pour la recharge."
      : (error.message || "Vérification UID impossible");
    if (playerLookupResult) playerLookupResult.innerHTML = `<p><strong>Pseudo non vérifié.</strong> ${escapeHtml(message)}</p>`;
    showToast(message);
  } finally {
    playerLookupButton.disabled = false;
    playerLookupButton.textContent = "Vérifier mon UID";
  }
};

playerLookupButton?.addEventListener("click", verifyCheckoutPlayer);
checkoutForm?.querySelector('[name="playerId"]')?.addEventListener("blur", () => {
  if (checkoutForm.querySelector('[name="playerId"]')?.value.trim()) void verifyCheckoutPlayer();
});

document.querySelectorAll("[data-checkout-submit]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (cart.length === 0) {
      showToast("Votre panier est vide");
      return;
    }

    const form = button.closest("form");
    const email = form?.querySelector('[name="email"]')?.value.trim() || "";
    const phone = form?.querySelector('[name="phone"]')?.value.trim() || "";
    const firstName = form?.querySelector('[name="firstName"]')?.value.trim() || "";
    const lastName = form?.querySelector('[name="lastName"]')?.value.trim() || "";
    const address = form?.querySelector('[name="address"]')?.value.trim() || "";
    const city = form?.querySelector('[name="city"]')?.value.trim() || "";
    const country = form?.querySelector('[name="country"]')?.value.trim() || "";
    const countryCode = form?.querySelector('[name="countryCode"]')?.value.trim().toUpperCase() || "SN";
    const playerId = form?.querySelector('[name="playerId"]')?.value.trim() || "";
    const region = form?.querySelector('[name="region"]')?.value.trim() || "";
    const nickname = form?.querySelector('[name="nickname"]')?.value.trim() || "";
    const paymentMethod = form?.querySelector('[name="paymentMethod"]')?.value || "";
    const notes = form?.querySelector('[name="notes"]')?.value.trim() || "";
    const hasPhysical = cart.some((item) => item.type === "physical");
    const mobileViewport = window.matchMedia("(max-width: 900px)").matches;
    const hasGame = cart.some((item) => item.categorySlug === "jeux" && (!mobileViewport || item.requiresPlayerId === true));
    const deliveryOption = form?.querySelector('[name="deliveryOption"]:checked')?.value || "address_now";
    const latitude = form?.querySelector('[name="latitude"]')?.value || "";
    const longitude = form?.querySelector('[name="longitude"]')?.value || "";
    if (!email || !phone || !firstName || !lastName) {
      showToast("Complétez vos informations client");
      return;
    }
    if (hasGame && !playerId) {
      showToast("Renseignez l’UID du compte à recharger");
      form?.querySelector('[name="playerId"]')?.focus();
      return;
    }
    if (hasPhysical && deliveryOption === "address_now" && (!address || !city || !country)) {
      showToast("Renseignez l’adresse complète de livraison");
      return;
    }
    if (hasPhysical && deliveryOption === "current_location" && (!latitude || !longitude)) {
      showToast("Enregistrez votre position actuelle avant de payer");
      return;
    }
    button.disabled = true;
    button.dataset.submitting = "true";
    button.textContent = "Connexion à Money Fusion...";

    try {
      const priceChanged = await validateCartWithBackend();
      if (priceChanged) {
        showToast("Le prix fournisseur a changé. Le nouveau total est affiché : confirmez à nouveau pour payer.");
        return;
      }
      await refreshCustomerSession();
      const configResponse = await fetch("/api/moneyfusion/config");
      const config = await configResponse.json();
      if (!config.configured) throw new Error("Money Fusion n’est pas encore configuré sur le serveur.");
      const response = await fetch("/api/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...customerSecurityHeaders() },
        body: JSON.stringify({
          customer: { email, phone, firstName, lastName, address, city, country, paymentMethod, notes, deliveryOption, latitude, longitude },
          fulfillment: { playerId, region, nickname },
          items: cart.map((item) => ({ id: item.id, variationId: item.variationId || "", qty: item.qty || 1, expectedUnitPrice: Number(item.rawPrice || 0) }))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Commande refusée");

      const paymentResponse = await fetch("/api/payments/moneyfusion/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.order.id, checkoutToken: data.checkoutToken, countryCode })
      });
      const paymentData = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(`${paymentData.error || "Paiement Money Fusion indisponible"} Commande conservée : ${data.order.id}`);

      cart = [];
      saveCart();
      updateCartCount();
      renderCartPage();
      localStorage.setItem("silverse:last-order", JSON.stringify({ id: data.order.id, trackingNumber: data.order.trackingNumber }));
      if (orderConfirmation) {
        orderConfirmation.innerHTML = `<p><strong>Commande enregistrée</strong><br>${data.order.id}<br>Paiement : ${data.order.payment?.status === "succeeded" ? "confirmé" : "en attente"}<br>Suivi : ${data.order.trackingNumber}</p><a class="text-link more-link" href="tracking.html?ref=${encodeURIComponent(data.order.trackingNumber)}">Voir le suivi <span aria-hidden="true">→</span></a>`;
      }
      showToast(`Commande ${data.order.id} enregistrée`);
      if (paymentData.checkoutUrl) window.location.assign(paymentData.checkoutUrl);
    } catch (error) {
      showToast(error.message || "Impossible de confirmer la commande");
    } finally {
      delete button.dataset.submitting;
      button.disabled = false;
      button.textContent = "Payer avec Money Fusion";
    }
  });
});

if (trackingForm && trackingResult) {
  const reference = new URLSearchParams(window.location.search).get("ref");
  if (reference) {
    const input = trackingForm.querySelector('[name="reference"]');
    if (input) input.value = reference;
    trackingForm.requestSubmit();
  }
}

localLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const url = new URL(link.href, window.location.href);
    const samePath = url.pathname === window.location.pathname;
    if (url.origin !== window.location.origin || (samePath && url.hash)) return;
    if (samePath) return;
    if (window.matchMedia("(max-width: 900px)").matches) return;
    event.preventDefault();
    document.body.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.href = link.href;
    }, 180);
  });
});
