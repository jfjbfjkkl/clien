# Intégration FedaPay — SILVERSE SHOP

Cette intégration utilise exclusivement l'API REST FedaPay depuis `server.mjs`. La clé secrète n'est jamais envoyée au navigateur. Le navigateur reçoit uniquement l'URL de paiement hébergée générée par FedaPay.

## Configuration

Copier les variables suivantes dans `.env` :

```env
FEDAPAY_ENVIRONMENT=sandbox
FEDAPAY_SECRET_KEY=sk_sandbox_...
FEDAPAY_WEBHOOK_SECRET=wh_...
APP_BASE_URL=https://votre-domaine.example
ADMIN_API_KEY=une-valeur-longue-et-aleatoire
```

- `FEDAPAY_ENVIRONMENT` accepte `sandbox` ou `live`.
- L'API sandbox est `https://sandbox-api.fedapay.com/v1`.
- L'API live est `https://api.fedapay.com/v1`.
- `APP_BASE_URL` doit être une URL HTTPS publique en production.
- `ADMIN_API_KEY` est obligatoire pour accéder aux payouts.

## Flux de collecte

1. Le navigateur envoie le panier et les informations client à `POST /api/orders`.
2. Le backend recalcule les montants depuis le catalogue local et crée une commande en attente.
3. Le navigateur demande `POST /api/payments/fedapay/checkout` avec l'identifiant de la commande.
4. Le backend crée une transaction FedaPay avec `POST /transactions`.
5. Le backend génère l'URL hébergée avec `POST /transactions/{id}/token`.
6. Le navigateur est redirigé vers l'URL FedaPay. Aucun numéro de carte ne passe par SILVERSE SHOP.
7. FedaPay appelle `POST /api/webhooks/fedapay`.
8. Le backend vérifie `X-FedaPay-Signature`, la fenêtre de cinq minutes, l'identifiant de commande et le montant.
9. Seul un événement `transaction.approved` valide le paiement et autorise la livraison Astral.

## Webhooks

Configurer dans le tableau de bord FedaPay :

```text
https://votre-domaine.example/api/webhooks/fedapay
```

Les événements sont idempotents et conservés dans `data/fedapay-events.json`. Les événements déjà traités ne déclenchent pas une seconde livraison. Les journaux techniques sont conservés dans `data/fedapay-logs.json` avec les informations client masquées.

Statuts gérés :

- `transaction.approved` → paiement réussi ;
- `transaction.canceled` → paiement annulé ;
- `transaction.declined` → paiement échoué ;
- `transaction.refunded` → paiement remboursé.

## Payouts

Les payouts sont disponibles uniquement dans l'administration et nécessitent une `ADMIN_API_KEY` configurée.

1. `POST /api/payouts` crée le payout chez FedaPay.
2. `POST /api/payouts/{id}/start` démarre ou programme le payout avec le téléphone et le code pays.
3. En environnement live, deux confirmations explicites distinctes sont exigées par le backend.

Le backend ne permet jamais au navigateur de choisir librement une clé, une URL API ou un identifiant de compte FedaPay.

### Retirer le solde du marchand

L'administration dispose d'un parcours « Retirer mon solde » :

1. `GET /api/fedapay/balances` lit les soldes disponibles directement chez FedaPay.
2. L'administrateur choisit un montant inférieur ou égal au solde disponible.
3. `POST /api/withdrawals` relit le solde côté serveur, crée le payout puis le démarre vers le compte du propriétaire.
4. Le retrait est conservé localement et ses changements de statut sont appliqués par webhook.

Le montant envoyé par le navigateur n'est jamais considéré comme un solde fiable : le backend vérifie systématiquement le montant disponible auprès de FedaPay avant la création du payout.

## Routes locales

| Méthode | Route | Accès | Usage |
|---|---|---|---|
| GET | `/api/fedapay/config` | Public, sans secret | État de la configuration |
| POST | `/api/payments/fedapay/checkout` | Client | Créer une transaction et son URL hébergée |
| POST | `/api/webhooks/fedapay` | Signature FedaPay | Confirmer le statut réel |
| GET | `/api/fedapay/logs` | Admin | Journaux techniques masqués |
| GET | `/api/fedapay/balances` | Admin strict | Lire le solde réellement disponible |
| POST | `/api/withdrawals` | Admin strict | Vérifier le solde, créer et démarrer un retrait marchand |
| GET | `/api/payouts` | Admin strict | Lister les payouts locaux |
| POST | `/api/payouts` | Admin strict | Créer un payout |
| POST | `/api/payouts/{id}/start` | Admin strict | Démarrer un payout |

## Avant la production

- utiliser HTTPS avec TLS 1.2 ou supérieur ;
- utiliser des clés FedaPay live uniquement sur le serveur ;
- définir une `ADMIN_API_KEY` longue et aléatoire ;
- enregistrer le webhook live dans FedaPay ;
- tester d'abord transactions, annulations et payouts en sandbox ;
- remplacer les fichiers JSON par PostgreSQL avec transactions et contraintes uniques ;
- appliquer une limitation de débit au proxy HTTP ;
- sauvegarder les commandes, paiements, événements et payouts ;
- ne jamais journaliser de carte, CVV, jeton de paiement ou clé secrète.

## Documentation officielle

- Index : https://docs.fedapay.com/llms.txt
- Création de transaction : https://docs.fedapay.com/api-reference/transactions/create
- URL de paiement : https://docs.fedapay.com/api-reference/transactions/create-token
- Création de payout : https://docs.fedapay.com/api-reference/payouts/create
- Démarrage de payout : https://docs.fedapay.com/api-reference/payouts/update-start
- Consultation des soldes : https://docs.fedapay.com/api-reference/balances/get-all
- Bonnes pratiques : https://docs.fedapay.com/security/en/best-practices-en
