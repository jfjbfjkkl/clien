# Intégration Money Fusion / Fusion Pay

## Configuration serveur

Le service lit ses secrets dans `/etc/silverse-shop.env`. Ils ne doivent jamais être ajoutés au JavaScript public ou au dépôt Git.

```env
MONEYFUSION_PAYMENT_URL=https://pay.moneyfusion.net/VOTRE_APPLICATION/VOTRE_IDENTIFIANT/pay/
MONEYFUSION_PRIVATE_KEY=VOTRE_CLE_PRIVEE
MONEYFUSION_WEBHOOK_SECRET=UNE_VALEUR_ALEATOIRE_LONGUE
MONEYFUSION_API_BASE_URL=https://pay.moneyfusion.net
```

- `MONEYFUSION_PAYMENT_URL` : lien API d’encaissement généré dans le tableau de bord Money Fusion.
- `MONEYFUSION_PRIVATE_KEY` : clé envoyée uniquement par le backend dans l’en-tête `moneyfusion-private-key` pour les retraits.
- `MONEYFUSION_WEBHOOK_SECRET` : secret interne placé dans les URL de callback. Les accès à ces URL ne sont pas journalisés par Nginx.
- L’adresse IP `72.60.184.191` doit être autorisée dans l’application Money Fusion.

## Routes intégrées

### Paiement

- `GET /api/moneyfusion/config` : indique au frontend si Money Fusion est configuré, sans révéler les secrets.
- `POST /api/payments/moneyfusion/checkout` : crée une session de paiement à partir d’une commande calculée par le backend.
- `POST /api/webhooks/moneyfusion?secret=...` : reçoit les événements de paiement.
- `GET /api/tracking/:reference` : revérifie le statut Money Fusion au retour du client.

Le backend ne fait jamais confiance au statut envoyé directement dans le webhook. Il récupère l’état officiel via :

```text
GET https://pay.moneyfusion.net/paiementNotif/{token}
```

La commande est marquée payée seulement si le jeton, la référence de commande et le montant correspondent.

### Retrait

- `GET /api/moneyfusion/withdraw-methods` : charge dynamiquement les pays et méthodes autorisés.
- `POST /api/moneyfusion/withdrawals` : soumet un retrait après authentification administrateur et confirmation explicite.
- `POST /api/webhooks/moneyfusion/withdraw?secret=...` : reçoit les événements de retrait.

Les routes de retrait sont protégées par la session administrateur et le jeton CSRF. Les numéros complets ne sont pas conservés dans l’historique local ; seuls les quatre derniers chiffres sont enregistrés.

## Webhooks

Money Fusion documente les événements suivants :

- `payin.session.pending`
- `payin.session.completed`
- `payin.session.cancelled`
- `payout.session.completed`
- `payout.session.cancelled`

Les notifications peuvent être envoyées plusieurs fois. Leur traitement est idempotent grâce au couple jeton/événement/statut.

## Limites de la documentation fournisseur

- Aucune signature cryptographique de webhook n’est documentée. Le site utilise donc un secret d’URL fort et une revérification serveur pour les paiements.
- Aucun endpoint de solde marchand n’est documenté. L’administration ne prétend donc pas afficher un solde Money Fusion.
- Aucun endpoint de vérification d’un retrait n’est documenté. Le statut d’un retrait dépend du webhook protégé reçu de Money Fusion.

Documentation officielle :

- https://docs.moneyfusion.net/fr/webapi
- https://docs.moneyfusion.net/fr/payout
