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
  "produit": "product.html"
};
const routeSegment = window.location.pathname.split("/").filter(Boolean).pop() || "";
const currentPage = routeAliases[routeSegment] || routeSegment || "index.html";
const currentProductId = new URLSearchParams(window.location.search).get("id") || "";
const gamingProductIds = ["free-fire-diamonds", "cod-mobile-cp", "pubg-uc", "roblox", "ea-fc-points", "mobile-legends"];
const digitalProductIds = ["netflix", "spotify", "google-play", "apple-gift-card", "gift-cards"];
const activeUniverse = currentPage === "index.html"
  ? "home"
  : currentPage === "gaming.html"
  ? "gaming"
  : currentPage === "digital.html"
    ? "digital"
    : currentPage === "product.html" && gamingProductIds.includes(currentProductId)
      ? "gaming"
      : currentPage === "product.html" && digitalProductIds.includes(currentProductId)
        ? "digital"
        : currentPage === "product.html"
          ? "physical"
    : ["boutique.html", "categories.html"].includes(currentPage)
      ? "physical"
      : currentPage === "favorites.html"
        ? "favorites"
        : currentPage === "cart.html" || currentPage === "checkout.html"
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
    <a class="brand" href="index.html" aria-label="Nebula Market accueil">
      <span class="brand-mark">N</span>
      <span>Nebula Market</span>
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
        <a class="brand" href="index.html"><span class="brand-mark">N</span><span id="mobile-menu-title">Nebula Market</span></a>
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

const renderHomeProduct = ({ id, name, brand, price, oldPrice = "", media, rating, reviews, badge = "" }) => `
  <article class="market-product-card home-commerce-card" data-product-id="${id}" data-product-name="${name}" data-product-price="${price}" data-product-media="${media}">
    <div class="market-product-image ${media}">${badge ? `<span>${badge}</span>` : ""}</div>
    <button class="favorite-toggle" type="button" aria-label="Ajouter ${name} aux favoris" data-favorite-product>♡</button>
    <div class="home-card-body">
      <p class="market-brand">${brand}</p>
      <h3>${name}</h3>
      <div class="market-rating">★★★★★ <span>${rating} · ${reviews}</span></div>
      <div class="market-price"><strong>${price}</strong>${oldPrice ? `<del>${oldPrice}</del>` : ""}</div>
      <div class="market-actions"><a href="product.html?id=${id}">Voir</a><button type="button" data-add-cart>Acheter</button></div>
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
  const popularProducts = [
    { id: "headphones-studio", name: "Casque audio Studio Pro", brand: "Novatech", price: "34 900 FCFA", oldPrice: "42 500", media: "sheet-headphones", rating: "4,8", reviews: "326", badge: "-18%" },
    { id: "smartwatch-active", name: "Montre connectée Active", brand: "Novatech", price: "42 000 FCFA", media: "sheet-watch", rating: "4,7", reviews: "184", badge: "Top vente" },
    { id: "urban-backpack", name: "Sac urbain premium", brand: "Atelier", price: "31 500 FCFA", oldPrice: "35 900", media: "sheet-bag", rating: "4,9", reviews: "241", badge: "-12%" },
    { id: "halo-lamp", name: "Lampe de table Halo", brand: "PureHome", price: "18 500 FCFA", oldPrice: "23 000", media: "sheet-lamp", rating: "4,8", reviews: "167", badge: "-20%" },
    { id: "serum-glow", name: "Sérum visage Glow", brand: "Vita", price: "14 900 FCFA", oldPrice: "17 500", media: "sheet-serum", rating: "4,9", reviews: "412", badge: "Favori" }
  ];
  document.body.classList.add("home-page");
  document.querySelector("main").innerHTML = `
    <section class="home-hero page-enter">
      <img src="assets/home-hero-champagne.png" width="1774" height="887" fetchpriority="high" decoding="async" alt="Sélection premium de produits technologiques">
      <div class="home-hero-content">
        <p class="eyebrow">Nebula Market</p>
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
        <input type="search" placeholder="Rechercher produits, jeux, catégories..." aria-label="Rechercher sur Nebula Market" data-home-mobile-search>
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
        <div><p class="eyebrow">Sélection du moment</p><h2>Produits populaires</h2></div>
        <a class="section-link" href="boutique.html">Voir plus <span>→</span></a>
      </div>
      <div class="market-product-grid home-product-grid">${popularProducts.map(renderHomeProduct).join("")}</div>
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
      <div class="home-gaming-grid">
        <a class="home-game-card home-game-featured" href="product.html?id=free-fire-diamonds">
          <span>Free Fire</span>
          <p>Rechargez votre compte avec des diamants livrés rapidement.</p>
          <i>Découvrir →</i>
        </a>
        <a class="home-game-card home-game-pubg" href="product.html?id=pubg-uc">
          <span>PUBG Mobile</span>
          <p>Plusieurs packs de UC disponibles selon vos besoins.</p>
          <i>Voir →</i>
        </a>
        <a class="home-game-card home-game-cod" href="product.html?id=cod-mobile-cp">
          <span>Call of Duty</span>
          <p>Crédits CP prêts pour vos achats en jeu.</p>
          <i>Voir →</i>
        </a>
      </div>
    </section>

    <section class="home-digital-section" data-reveal="zoom">
      <div class="home-digital-intro">
        <p class="eyebrow home-digital-label"><span aria-hidden="true"></span> Livraison instantanée</p>
        <h2>Produits digitaux, disponibles en quelques instants.</h2>
        <p>Abonnements, cartes cadeaux et recharges activés rapidement après votre paiement.</p>
        <ul class="home-digital-benefits" aria-label="Avantages des produits digitaux">
          <li><span>01</span> Activation rapide</li>
          <li><span>02</span> Paiement sécurisé</li>
          <li><span>03</span> Assistance disponible</li>
        </ul>
        <a class="home-digital-cta" href="digital.html">
          <span><strong>Explorer le catalogue</strong><small>Cartes, recharges et abonnements</small></span>
          <i aria-hidden="true">→</i>
        </a>
      </div>

      <div class="home-mobile-universe-heading">
        <strong>Univers Produits Digitaux</strong>
        <a href="digital.html">Voir plus <span>→</span></a>
      </div>
      <div class="home-digital-showcase" aria-label="Sélection de produits digitaux">
        <a class="home-digital-tile home-digital-featured" href="product.html?id=netflix">
          <span class="home-digital-media home-digital-media-netflix"><b>NETFLIX</b></span>
          <span class="home-digital-tile-copy"><small>Streaming</small><strong>Abonnement Netflix</strong><em>Accès rapide</em></span>
          <i aria-hidden="true">→</i>
        </a>
        <a class="home-digital-tile" href="product.html?id=spotify">
          <span class="home-digital-media home-digital-media-spotify"><b>SP</b></span>
          <span class="home-digital-tile-copy"><small>Musique</small><strong>Spotify Premium</strong></span>
          <i aria-hidden="true">→</i>
        </a>
        <a class="home-digital-tile" href="product.html?id=google-play">
          <span class="home-digital-media home-digital-media-google"><b>GP</b></span>
          <span class="home-digital-tile-copy"><small>Carte cadeau</small><strong>Google Play</strong></span>
          <i aria-hidden="true">→</i>
        </a>
        <a class="home-digital-tile" href="product.html?id=apple-gift-card">
          <span class="home-digital-media home-digital-media-apple"><b>AP</b></span>
          <span class="home-digital-tile-copy"><small>Carte cadeau</small><strong>Apple Gift Card</strong></span>
          <i aria-hidden="true">→</i>
        </a>
        <a class="home-digital-tile" href="digital.html">
          <span class="home-digital-media home-digital-media-recharge"><b>RE</b></span>
          <span class="home-digital-tile-copy"><small>Recharge</small><strong>Crédit mobile</strong></span>
          <i aria-hidden="true">→</i>
        </a>
      </div>
    </section>

    <section class="home-trust section" data-reveal>
      <div class="section-heading"><div><p class="eyebrow">Pourquoi Nebula</p><h2>Une expérience conçue pour inspirer confiance</h2></div></div>
      <div class="benefit-grid">
        <article><span>01</span><h3>Paiement sécurisé</h3><p>Des transactions protégées et une confirmation immédiate à chaque commande.</p></article>
        <article><span>02</span><h3>Livraison adaptée</h3><p>Suivi pour les produits physiques et réception instantanée pour le digital.</p></article>
        <article><span>03</span><h3>Support disponible</h3><p>Une équipe accessible pour vous accompagner avant et après votre achat.</p></article>
      </div>
    </section>

    <section class="home-reviews section" data-reveal>
      <div class="section-heading"><div><p class="eyebrow">Avis clients</p><h2>Ils choisissent Nebula Market</h2></div></div>
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
      <a class="brand footer-brand" href="index.html" aria-label="Nebula Market accueil">
        <span class="brand-mark">N</span>
        <span>Nebula Market</span>
      </a>
      <p>Marketplace premium pour acheter des produits physiques, des produits digitaux et des recharges avec une expérience claire et sécurisée.</p>
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
    <p>© 2026 Nebula Market. Tous droits réservés.</p>
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
const catalogProducts = [...document.querySelectorAll("[data-catalog-product]")];
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
const gamingSearchItems = [...document.querySelectorAll(".gaming-categories a, .gaming-products > article")];
const mobileMenu = document.querySelector("[data-mobile-menu]");
const openMobileMenuButton = document.querySelector("[data-open-mobile-menu]");
const closeMobileMenuButtons = document.querySelectorAll("[data-close-mobile-menu]");

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

const productCatalog = {
  "free-fire-diamonds": {
    id: "free-fire-diamonds",
    name: "Diamants Free Fire",
    brand: "Nebula Gaming",
    price: "À partir de 520 FCFA",
    media: "media-blue",
    category: "Jeux",
    availability: "Disponible",
    short: "Diamants Free Fire livrés rapidement après validation.",
    description: "Rechargez votre compte Free Fire avec un parcours sécurisé et une livraison digitale rapide après confirmation du paiement.",
    details: ["Recharge gaming", "Livraison digitale", "Paiement sécurisé", "Support disponible"]
  },
  "pubg-uc": {
    id: "pubg-uc",
    name: "UC PUBG Mobile",
    brand: "Nebula Gaming",
    price: "À partir de 1 200 FCFA",
    media: "media-blue",
    category: "Jeux",
    availability: "Disponible",
    short: "Packs UC PUBG Mobile disponibles selon vos besoins.",
    description: "Choisissez votre montant UC PUBG Mobile et suivez une commande claire jusqu'à la livraison digitale.",
    details: ["UC PUBG Mobile", "Options flexibles", "Validation rapide", "Assistance client"]
  },
  "cod-mobile-cp": {
    id: "cod-mobile-cp",
    name: "CP Call of Duty Mobile",
    brand: "Nebula Gaming",
    price: "À partir de 1 000 FCFA",
    media: "media-blue",
    category: "Jeux",
    availability: "Disponible",
    short: "Crédits CP pour Call of Duty Mobile avec traitement rapide.",
    description: "Achetez vos CP Call of Duty Mobile sur une fiche claire, avec paiement sécurisé et suivi de commande.",
    details: ["CP mobile", "Traitement rapide", "Paiement sécurisé", "Support disponible"]
  },
  "headphones-studio": {
    id: "headphones-studio",
    name: "Casque audio Studio Pro",
    brand: "Novatech",
    price: "34 900 FCFA",
    oldPrice: "42 500",
    media: "sheet-headphones",
    category: "Électronique",
    availability: "Disponible",
    short: "Son immersif, réduction de bruit et confort longue durée.",
    description: "Un casque premium pensé pour le travail, les appels et les moments de détente. Sa conception enveloppante améliore l'isolation, tandis que la batterie longue durée accompagne les journées chargées.",
    details: ["Bluetooth stable", "Coussinets confort", "Micro intégré", "Garantie boutique"]
  },
  "smartwatch-active": {
    id: "smartwatch-active",
    name: "Montre connectée Active",
    brand: "Novatech",
    price: "42 000 FCFA",
    media: "sheet-watch",
    category: "Électronique",
    availability: "Disponible",
    short: "Suivi quotidien, notifications et design compact.",
    description: "Une montre connectée élégante pour suivre vos activités, recevoir vos notifications et garder l'essentiel à portée de poignet.",
    details: ["Suivi activité", "Notifications mobile", "Bracelet confortable", "Autonomie optimisée"]
  },
  "urban-backpack": {
    id: "urban-backpack",
    name: "Sac urbain premium",
    brand: "Atelier",
    price: "31 500 FCFA",
    oldPrice: "35 900",
    media: "sheet-bag",
    category: "Mode",
    availability: "Disponible",
    short: "Compartiments pratiques et finition résistante.",
    description: "Un sac structuré pour les déplacements quotidiens, avec un espace organisé pour ordinateur, accessoires et essentiels personnels.",
    details: ["Poche ordinateur", "Tissu résistant", "Bretelles ajustables", "Format urbain"]
  },
  "minimal-sneakers": {
    id: "minimal-sneakers",
    name: "Sneakers minimalistes",
    brand: "Atelier",
    price: "28 900 FCFA",
    media: "sheet-shoes",
    category: "Mode",
    availability: "Disponible",
    short: "Silhouette sobre, légère et facile à porter.",
    description: "Des sneakers polyvalentes avec une ligne épurée et une semelle confortable pour accompagner les journées actives.",
    details: ["Semelle souple", "Style minimal", "Usage quotidien", "Tailles variées"]
  },
  "halo-lamp": {
    id: "halo-lamp",
    name: "Lampe de table Halo",
    brand: "PureHome",
    price: "18 500 FCFA",
    oldPrice: "23 000",
    media: "sheet-lamp",
    category: "Maison",
    availability: "Disponible",
    short: "Éclairage doux pour bureau, chambre ou salon.",
    description: "Une lampe décorative au rendu chaleureux, idéale pour créer une ambiance soignée sans encombrer l'espace.",
    details: ["Lumière douce", "Format compact", "Design moderne", "Faible consommation"]
  },
  "air-purifier": {
    id: "air-purifier",
    name: "Purificateur d’air Compact",
    brand: "PureHome",
    price: "39 900 FCFA",
    media: "sheet-purifier",
    category: "Maison",
    availability: "Disponible",
    short: "Format discret pour améliorer le confort intérieur.",
    description: "Un purificateur compact conçu pour les pièces de vie, avec une utilisation simple et un design qui s'intègre facilement.",
    details: ["Filtration pratique", "Mode silencieux", "Entretien simple", "Design compact"]
  },
  "serum-glow": {
    id: "serum-glow",
    name: "Sérum visage Glow",
    brand: "Vita",
    price: "14 900 FCFA",
    oldPrice: "17 500",
    media: "sheet-serum",
    category: "Beauté",
    availability: "Disponible",
    short: "Soin léger pour une routine visage lumineuse.",
    description: "Un sérum agréable à appliquer, pensé pour compléter une routine quotidienne avec une texture légère et un fini confortable.",
    details: ["Texture légère", "Routine quotidienne", "Fini confortable", "Format pratique"]
  },
  "steel-bottle": {
    id: "steel-bottle",
    name: "Gourde isotherme Inox",
    brand: "Vita",
    price: "9 900 FCFA",
    media: "sheet-bottle",
    category: "Sport",
    availability: "Disponible",
    short: "Hydratation fiable au bureau, en sport ou en déplacement.",
    description: "Une gourde robuste et facile à transporter, conçue pour garder vos boissons à portée de main tout au long de la journée.",
    details: ["Acier inox", "Bouchon sécurisé", "Transport facile", "Usage quotidien"]
  },
  "headphones-lite": {
    id: "headphones-lite",
    name: "Casque sans fil Lite",
    brand: "Novatech",
    price: "27 900 FCFA",
    oldPrice: "31 000",
    media: "sheet-headphones",
    category: "Électronique",
    availability: "Disponible",
    short: "Casque léger pour appels, musique et mobilité.",
    description: "Une option sans fil accessible avec un son clair, une bonne autonomie et une prise en main rapide.",
    details: ["Connexion rapide", "Design léger", "Micro intégré", "Commandes simples"]
  },
  "city-backpack": {
    id: "city-backpack",
    name: "Sac à dos City",
    brand: "Atelier",
    price: "24 500 FCFA",
    media: "sheet-bag",
    category: "Mode",
    availability: "Indisponible",
    short: "Sac polyvalent pour les trajets quotidiens.",
    description: "Un sac compact et fonctionnel pour organiser facilement vos essentiels de journée.",
    details: ["Format léger", "Poche frontale", "Bretelles réglables", "Retour en stock prochainement"]
  },
  "desk-lamp": {
    id: "desk-lamp",
    name: "Lampe d’appoint Mini",
    brand: "PureHome",
    price: "12 500 FCFA",
    media: "sheet-lamp",
    category: "Maison",
    availability: "Disponible",
    short: "Petite lampe pratique pour bureau ou chevet.",
    description: "Une lampe d'appoint discrète qui apporte une lumière agréable aux petits espaces.",
    details: ["Format mini", "Lumière confortable", "Installation simple", "Design sobre"]
  },
  "serum-duo": {
    id: "serum-duo",
    name: "Duo sérums essentiels",
    brand: "Vita",
    price: "18 900 FCFA",
    oldPrice: "24 000",
    media: "sheet-serum",
    category: "Beauté",
    availability: "Disponible",
    short: "Deux soins complémentaires pour une routine complète.",
    description: "Un duo de sérums pour construire une routine visage simple, efficace et agréable au quotidien.",
    details: ["Pack duo", "Routine complète", "Texture agréable", "Prix avantageux"]
  }
};

const getCatalogProduct = (id) => productCatalog[id] || null;

const normalizeProduct = (product) => {
  const full = getCatalogProduct(product.id) || {};
  return { ...full, ...product };
};

const globalSearchItems = [
  { title: "Accueil", meta: "Vue d'ensemble", href: "index.html" },
  { title: "Boutique physique", meta: "Produits, accessoires et équipements", href: "boutique.html#catalogue" },
  { title: "Produits digitaux", meta: "Cartes cadeaux, abonnements et recharges", href: "digital.html#catalogue" },
  { title: "Jeux", meta: "Recharges et contenus gaming", href: "gaming.html" },
  { title: "Électronique", meta: "Catégorie physique · audio, mobile et tech", href: "boutique.html#catalogue" },
  { title: "Mode", meta: "Catégorie physique · sacs, chaussures et accessoires", href: "boutique.html#catalogue" },
  { title: "Maison", meta: "Catégorie physique · décoration et confort", href: "boutique.html#catalogue" },
  { title: "Beauté", meta: "Catégorie physique · soins et essentiels", href: "boutique.html#catalogue" },
  { title: "Sport", meta: "Catégorie physique · fitness et outdoor", href: "boutique.html#catalogue" },
  { title: "Cartes cadeaux", meta: "Produits digitaux · Google Play, Apple Gift Card", href: "digital.html#catalogue" },
  { title: "Abonnements", meta: "Produits digitaux · Netflix, Spotify et services", href: "digital.html#catalogue" },
  { title: "Recharges gaming", meta: "Jeux · Free Fire, PUBG Mobile, Call of Duty", href: "gaming.html" },
  { title: "Mes favoris", meta: "Produits enregistrés", href: "favorites.html" },
  { title: "Panier", meta: "Commande en cours", href: "cart.html" },
  { title: "Compte", meta: "Connexion et création de compte", href: "contact.html" },
  ...Object.values(productCatalog).map((product) => ({
    title: product.name,
    meta: `${product.category} · ${product.price}`,
    href: `product.html?id=${product.id}`
  }))
];

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
  const query = gamingSearch.value.trim().toLowerCase();
  gamingSearchItems.forEach((item) => {
    const haystack = item.textContent.toLowerCase();
    const productName = item.dataset.productName?.toLowerCase() || "";
    item.hidden = query.length > 0 && !haystack.includes(query) && !productName.includes(query);
  });
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
  localStorage.setItem("nebula:favorites", JSON.stringify(favorites));
};

const saveCart = () => {
  localStorage.setItem("nebula:cart", JSON.stringify(cart));
};

const loadCart = () => {
  try {
    cart = JSON.parse(localStorage.getItem("nebula:cart") || "[]");
  } catch {
    cart = [];
  }
};

const loadFavorites = () => {
  try {
    favorites = JSON.parse(localStorage.getItem("nebula:favorites") || "[]");
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
  const requestedId = params.get("id") || "headphones-studio";
  const fallbackName = requestedId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Produit sélectionné";
  const product = getCatalogProduct(requestedId) || {
    id: requestedId,
    name: fallbackName,
    brand: "Nebula Market",
    price: "Prix selon option",
    media: "media-blue",
    category: "Produit",
    availability: "Disponible",
    short: "Produit disponible selon les options du catalogue.",
    description: "Cette fiche présente les informations principales du produit sélectionné. Les options, montants ou variantes peuvent être confirmés au moment de la commande.",
    details: ["Paiement sécurisé", "Validation rapide", "Support disponible", "Options selon produit"]
  };
  const isDigitalProduct = product.category === "Produit" || digitalProductIds.includes(product.id) || gamingProductIds.includes(product.id);
  const productRef = `NB-${product.id.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 18)}`;
  const productType = isDigitalProduct ? "Produit numérique" : "Produit physique";
  const deliveryInfo = isDigitalProduct
    ? {
      title: "Livraison digitale rapide",
      items: ["Réception par e-mail ou espace compte après validation", "Instructions d'obtention envoyées avec la confirmation", "Support disponible en cas de difficulté d'activation"]
    }
    : {
      title: "Livraison physique suivie",
      items: ["Délai estimé communiqué lors de la commande", "Suivi de commande disponible dans le panier et le compte", "Préparation soigneuse avant expédition ou retrait"]
    };
  const similar = Object.values(productCatalog)
    .filter((item) => item.id !== product.id && (item.category === product.category || product.category === "Produit"))
    .slice(0, 4);
  const fallbackRecommendations = Object.values(productCatalog)
    .filter((item) => item.id !== product.id && !similar.some((similarItem) => similarItem.id === item.id))
    .slice(0, 4);
  let recentProducts = [];
  try {
    recentProducts = JSON.parse(localStorage.getItem("nebula:recent-products") || "[]")
      .filter((item) => item.id !== product.id)
      .slice(0, 4)
      .map(normalizeProduct);
  } catch {
    recentProducts = [];
  }
  const recommendations = recentProducts.length ? recentProducts : fallbackRecommendations;
  localStorage.setItem("nebula:recent-products", JSON.stringify([
    { id: product.id, name: product.name, price: product.price, media: product.media },
    ...recentProducts
  ].slice(0, 8)));
  const productCard = (item) => `
    <article class="market-product-card shop-product-card product-reco-card" data-product-id="${item.id}" data-product-name="${item.name}" data-product-price="${item.price}" data-product-media="${item.media}">
      <a class="market-product-image ${item.media}" href="product.html?id=${item.id}" aria-label="Voir ${item.name}"></a>
      <button class="favorite-toggle" type="button" aria-label="Ajouter aux favoris" data-favorite-product>♡</button>
      <p class="market-brand">${item.brand || "Nebula Market"}</p>
      <h3>${item.name}</h3>
      <p class="market-product-description">${item.short || "Produit recommandé par Nebula Market."}</p>
      <p class="market-availability ${item.availability === "Indisponible" ? "is-unavailable" : "is-available"}">${item.availability || "Disponible"}</p>
      <div class="market-price"><strong>${item.price}</strong></div>
      <div class="market-actions"><a href="product.html?id=${item.id}">Voir</a><button type="button" data-add-cart>Ajouter au panier</button></div>
    </article>
  `;

  document.title = `${product.name} | Nebula Market`;
  detailRoot.innerHTML = `
    <section class="product-detail-hero" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-media="${product.media}">
      <div class="product-gallery">
        <div class="product-gallery-main market-product-image ${product.media}" data-product-gallery-main role="img" aria-label="${product.name}"></div>
        <div class="product-gallery-thumbs" aria-label="Galerie produit">
          <button class="is-active market-product-image ${product.media}" type="button" aria-label="Image principale" data-product-gallery-thumb="${product.media}"></button>
          <button class="market-product-image ${product.media} product-gallery-variant product-gallery-variant-soft" type="button" aria-label="Vue détail" data-product-gallery-thumb="${product.media} product-gallery-variant product-gallery-variant-soft"></button>
          <button class="market-product-image ${product.media} product-gallery-variant product-gallery-variant-dark" type="button" aria-label="Vue contexte" data-product-gallery-thumb="${product.media} product-gallery-variant product-gallery-variant-dark"></button>
        </div>
      </div>
      <article class="product-detail-info">
        <div class="product-detail-kicker"><span>${product.category}</span><em>${productRef}</em></div>
        <h1>${product.name}</h1>
        <div class="product-detail-price"><strong>${product.price}</strong>${product.oldPrice ? `<del>${product.oldPrice}</del>` : ""}</div>
        <div class="product-detail-status">
          <p class="market-availability ${product.availability === "Disponible" ? "is-available" : "is-unavailable"}">${product.availability}</p>
          <span>En stock</span>
        </div>
        <p class="product-detail-lead">${product.short || product.description}</p>
        <div class="product-detail-actions" aria-label="Actions produit">
          <button class="product-buy-now" type="button" data-buy-now>Acheter maintenant</button>
          <button class="product-add-cart" type="button" data-add-cart>Ajouter au panier</button>
          <button class="product-detail-favorite" type="button" aria-label="Ajouter aux favoris" data-favorite-product><span>♡</span><strong>Favoris</strong></button>
        </div>
        <dl class="product-detail-meta">
          <div><dt>Marque</dt><dd>${product.brand}</dd></div>
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
          <div><dt>Assistance</dt><dd>Support Nebula Market disponible</dd></div>
        </dl>
      </div>
    </section>
    <section class="product-detail-section">
      <div class="product-info-panels">
        <article class="page-panel"><p class="eyebrow">Caractéristiques</p><h2>Points clés</h2><ul class="product-detail-list">${product.details.map((detail) => `<li>${detail}</li>`).join("")}</ul></article>
        <article class="page-panel"><p class="eyebrow">Pourquoi choisir ce produit</p><h2>Ce qui fait la différence</h2><ul class="product-detail-list"><li>Produit sélectionné par Nebula Market</li><li>Paiement sécurisé</li><li>Parcours d'achat clair</li><li>Assistance disponible</li></ul></article>
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
};

const updateCartCount = () => {
  count = cart.reduce((total, item) => total + (item.qty || 1), 0);
  if (cartCount) cartCount.textContent = String(count);
  cartPageSummaries.forEach((summary) => {
    summary.textContent = `${count} article${count > 1 ? "s" : ""} dans le panier`;
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
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart = [{ ...product, qty: 1 }, ...cart];
  }

  saveCart();
  updateCartCount();
  renderCartPage();
  bumpCart();
};

const removeFromCart = (id) => {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  updateCartCount();
  renderCartPage();
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
    <article class="page-list-item favorite-page-card" data-product-id="${item.id}" data-product-name="${item.name}" data-product-price="${item.price}" data-product-media="${item.media || ""}">
      <span class="favorite-thumb ${item.media || ""}" aria-hidden="true"></span>
      <div>
        <strong>${item.name}</strong>
        <em>${item.price}</em>
        ${actionType === "favorite" && item.short ? `<small>${item.short}</small>` : ""}
        ${item.qty ? `<small>Quantité : ${item.qty}</small>` : ""}
      </div>
      ${actionType === "cart" ? `
        <button type="button" data-cart-remove="${item.id}">Supprimer</button>
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
  document.body.classList.add("modal-open");
};

const unlockBodyScroll = (restoreScroll = true) => {
  document.body.classList.remove("modal-open");
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
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
  syncFavoriteButtons();
  renderFavoritesPage();
});

enhanceCatalogCards();
renderProductDetail();
loadFavorites();
loadCart();
syncFavoriteButtons();
updateCartCount();
renderCartPage();
renderFavoritesPage();

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

document.querySelectorAll("[data-account-form]").forEach((form) => {
  const message = form.querySelector("[data-form-message]");
  form.addEventListener("input", (event) => {
    if (event.target.matches("input")) setFieldError(event.target);
    form.classList.remove("has-success");
    if (message) message.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const isValid = validateAccountForm(form);
    form.classList.toggle("has-errors", !isValid);
    form.classList.toggle("has-success", isValid);

    if (!isValid) {
      if (message) message.textContent = "Veuillez corriger les champs indiqués.";
      showToast("Formulaire incomplet");
      return;
    }

    if (message) {
      message.textContent = form.dataset.accountForm === "login"
        ? "Informations validées. Connexion prête."
        : "Informations validées. Votre compte peut être créé.";
    }
    showToast(form.dataset.accountForm === "login" ? "Connexion validée" : "Compte validé");
  });
});

document.querySelectorAll("[data-checkout-submit]").forEach((button) => {
  button.addEventListener("click", () => {
    if (cart.length === 0) {
      showToast("Votre panier est vide");
      return;
    }
    cart = [];
    saveCart();
    updateCartCount();
    renderCartPage();
    showToast("Commande confirmée");
  });
});

localLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const url = new URL(link.href, window.location.href);
    const samePath = url.pathname === window.location.pathname;
    if (url.origin !== window.location.origin || (samePath && url.hash)) return;
    if (samePath) return;
    event.preventDefault();
    document.body.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.href = link.href;
    }, 180);
  });
});
