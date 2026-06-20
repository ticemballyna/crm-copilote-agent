# Copilote CRM IA — API indépendante

API REST autonome (Fastify + Prisma + SQLite + OpenRouter) qui analyse les tickets clients
en 5 étapes : classification, sentiment, urgence, routage, et assistance à l'agent
(résumé, réponse suggérée, action recommandée).

Cette API est indépendante de toute interface utilisateur : elle est conçue pour être
consommée par n'importe quelle application web via des appels HTTP REST.

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# Ouvre .env et remplace OPENROUTER_API_KEY par ta vraie clé
# (à récupérer sur https://openrouter.ai/keys)

# 3. Créer la base de données SQLite et appliquer le schéma
npx prisma generate
npx prisma migrate dev --name init

# 4. Démarrer le serveur (mode développement, redémarre automatiquement)
npm run dev
```

Le serveur démarre sur **http://localhost:8000**.

## Tester les endpoints

Le fichier `test_api.http` contient des exemples de requêtes prêtes à l'emploi
(utilisable avec l'extension VS Code "REST Client", ou copiable dans Postman/Insomnia/curl).

## Explorer la base de données

```bash
npx prisma studio
```
Ouvre une interface visuelle dans le navigateur pour voir/éditer les données SQLite.

## Endpoints disponibles

| Endpoint | Méthode | Description |
|---|---|---|
| `/` | GET | Informations sur le service |
| `/api/health` | GET | Vérifie que le service et le modèle LLM sont configurés |
| `/api/dataset` | GET | Génère un dataset synthétique (JSON, non inséré en base) |
| `/api/dataset/seed` | POST | Génère et insère un dataset dans la base SQLite |
| `/api/analyze` | POST | Pipeline complet : analyse un ticket en 5 étapes |
| `/api/chat` | POST | Mode simplifié : un message → une réponse assistée par l'IA |
| `/api/tools` | GET | Liste des outils disponibles pour l'étape 5 (action) |

## Intégration avec une autre application

Cette API n'a aucune dépendance à une interface utilisateur. Pour l'intégrer à une
application web existante, il suffit d'appeler `POST /api/analyze` avec un ticket et
son contexte client, et d'exploiter la réponse JSON (classification, routage, résumé,
réponse suggérée, action recommandée) côté frontend ou backend de l'application.

Exemple minimal d'appel depuis n'importe quel langage :

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Mon colis n'\''est jamais arrivé",
    "client": { "nom": "Dupont", "prenom": "Marie", "email": "marie@email.com", "segment": "Standard" },
    "priorite": "Moyenne"
  }'
```

## Notes de conception

- **Validation humaine (HITL)** : toute action à confiance "Basse" OU toute urgence
  "Critique" est automatiquement marquée `A_VALIDER_MANUELLEMENT` — aucune action
  irréversible n'est exécutée sans validation d'un agent humain.
- **Routage** : utilise des règles déterministes en priorité (mapping catégorie → équipe),
  et ne fait appel au LLM que si la catégorie est ambiguë — réduit le coût et la latence.
- **Robustesse** : chaque étape du pipeline a un comportement de repli (fallback) en cas
  d'erreur de l'API LLM, pour ne jamais bloquer le traitement d'un ticket.
