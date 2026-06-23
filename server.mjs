import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT) || 8010;
const root = process.cwd();
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  const routeMap = {
    "/favoris": "/favorites.html",
    "/panier": "/cart.html",
    "/compte": "/contact.html",
    "/boutique": "/boutique.html",
    "/produits-digitaux": "/digital.html",
    "/jeux": "/gaming.html",
    "/categories": "/categories.html",
    "/paiement": "/checkout.html",
    "/produit": "/product.html"
  };
  const requestedPath = pathname === "/" ? "/index.html" : routeMap[pathname] || pathname;
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  process.stdout.write(`Nebula Market: http://${host}:${port}\n`);
});
