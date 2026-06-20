// src/routes/analyze.js
import { z } from 'zod';
import { TicketInputSchema, ChatInputSchema, PipelineOutputSchema, ChatOutputSchema } from '../schemas/aiSchemas.js';
import { runPipeline } from '../services/aiPipeline.js';
import { config } from '../config.js';
import prisma from '../db.js';

export default async function analyzeRoutes(fastify) {
  // === POST /api/analyze ===
  fastify.post('/api/analyze', {
    schema: {
      description: "Analyse complète d'un ticket en 5 étapes (classification, routage, résumé, réponse, action) et persiste le résultat",
      tags: ['Analyse'],
      body: TicketInputSchema,
      response: {
        200: PipelineOutputSchema,
        500: z.object({ error: z.string(), detail: z.string() }),
      },
    },
    handler: async (request, reply) => {
      try {
        const ticketData = request.body;
        const result = await runPipeline(ticketData);

        if (ticketData.id && ticketData.id > 0) {
          const exists = await prisma.ticket.findUnique({ where: { id: ticketData.id } });
          if (exists) {
            const data = {
              categorie: result.classification.categorie,
              sousCategorie: result.classification.sousCategorie,
              themePrincipal: result.classification.themePrincipal,
              sentiment: result.classification.sentiment,
              scoreSentiment: result.classification.scoreSentiment,
              justificationSentiment: result.classification.justificationSentiment,
              urgence: result.classification.urgence,
              scoreUrgence: result.classification.scoreUrgence,
              justificationUrgence: result.classification.justificationUrgence,
              departementRecommande: result.routage.equipeRecommandee,
              agentRecommande: result.routage.agentRecommande,
              raisonRoutage: result.routage.raison,
              resumeClient: result.resumeClient,
              reponseProposee: result.reponseProposee,
              actionRecommandee: result.actionRecommandee.actionRecommandee,
              actionParametres: JSON.stringify(result.actionRecommandee.parametres),
              confiance: result.actionRecommandee.confiance,
              necessiteValidation: result.actionRecommandee.necessiteValidation,
              statutValidation: result.hitlStatus === 'A_VALIDER_MANUELLEMENT' ? 'En attente' : 'Valide',
            };

            await prisma.analyseTicket.upsert({
              where: { ticketId: ticketData.id },
              create: { ticketId: ticketData.id, ...data },
              update: data,
            });
          }
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Erreur interne du service d'analyse",
          detail: error.message,
        });
      }
    },
  });

  // === POST /api/chat ===
  fastify.post('/api/chat', {
    schema: {
      description: 'Mode chatbot : analyse simple avec réponse directe',
      tags: ['Chat'],
      body: ChatInputSchema,
      response: {
        200: ChatOutputSchema,
        500: z.object({ error: z.string(), detail: z.string() }),
      },
    },
    handler: async (request, reply) => {
      try {
        const { message, clientId, historique } = request.body;

        let client = { id: clientId || 0, nom: 'Client', prenom: '', email: '', segment: 'Standard' };

        if (clientId && clientId > 0) {
          const dbClient = await prisma.client.findUnique({ where: { id: clientId } });
          if (dbClient) {
            client = {
              id: dbClient.id,
              nom: dbClient.nom,
              prenom: dbClient.prenom,
              email: dbClient.email,
              segment: dbClient.segment,
            };
          }
        }

        const ticketData = {
          id: 0,
          description: message,
          client,
          priorite: 'Moyenne',
          historiqueTickets: historique,
          interactionsRecentes: [],
        };

        const result = await runPipeline(ticketData);

        return reply.status(200).send({
          reponse: result.reponseProposee,
          classification: result.classification,
          actionSuggeree: result.actionRecommandee,
          urgent: ['Elevee', 'Critique'].includes(result.classification.urgence),
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Erreur interne du service de chat',
          detail: error.message,
        });
      }
    },
  });

  // === GET /api/tools ===
  fastify.get('/api/tools', {
    schema: {
      description: "Liste des outils disponibles pour l'étape 5 (recommandation d'action)",
      tags: ['Outils'],
      response: {
        200: z.object({
          tools: z.array(z.any()),
          count: z.number(),
        }),
      },
    },
    handler: async (request, reply) => {
      return reply.status(200).send({
        tools: config.availableTools,
        count: config.availableTools.length,
      });
    },
  });

  // === GET /api/health ===
  fastify.get('/api/health', {
    schema: {
      description: "Vérification de l'état du service",
      tags: ['Health'],
      response: {
        200: z.object({
          status: z.string(),
          model: z.string(),
          provider: z.string(),
        }),
      },
    },
    handler: async (request, reply) => {
      return reply.status(200).send({
        status: 'healthy',
        model: config.openrouter.model,
        provider: 'OpenRouter',
      });
    },
  });
}
