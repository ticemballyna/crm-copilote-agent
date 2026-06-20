// src/server.js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { config, checkConfig } from './config.js';
import analyzeRoutes from './routes/analyze.js';
import datasetRoutes from './routes/dataset.js';
import dataRoutes from './routes/data.js';

// Vérifie la config (clé OpenRouter) avant de démarrer, message clair sinon
try {
  checkConfig();
} catch (err) {
  console.error('Erreur de configuration :', err.message);
  process.exit(1);
}

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await fastify.register(analyzeRoutes);
await fastify.register(datasetRoutes);
await fastify.register(dataRoutes);

fastify.get('/', async () => ({
  service: 'Copilote CRM IA',
  version: '1.0.0',
  endpoints: [
    "POST /api/analyze      -> Analyser un ticket (pipeline complet 5 etapes)",
    'POST /api/chat         -> Mode chatbot simple',
    'GET  /api/dataset      -> Generer un dataset de test (JSON)',
    'POST /api/dataset/seed -> Generer + inserer un dataset en BDD',
    'GET  /api/clients      -> Lister les clients',
    'GET  /api/clients/:id  -> Fiche client complete (vision 360)',
    'GET  /api/tickets      -> Lister les tickets (filtres: statut, urgence, categorie)',
    'GET  /api/tickets/:id  -> Detail d\'un ticket + analyse IA',
    'PATCH /api/tickets/:id/validation -> Valider/modifier/rejeter une analyse IA (HITL)',
    "GET  /api/tools        -> Liste des outils disponibles pour l'agent",
    'GET  /api/health       -> Verifier le statut du service',
  ],
}));

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Serveur demarre sur http://localhost:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();