// src/routes/dataset.js
import { z } from 'zod';
import { generateDataset } from '../services/datasetGenerator.js';
import prisma from '../db.js';

export default async function datasetRoutes(fastify) {
  // === GET /api/dataset ===
  fastify.get('/api/dataset', {
    schema: {
      description: 'Génère un dataset de test (JSON, non inséré en base)',
      tags: ['Dataset'],
      querystring: z.object({
        clients: z.coerce.number().min(1).max(100).default(10),
        tickets: z.coerce.number().min(1).max(200).default(25),
        interactions: z.coerce.number().min(0).max(200).default(30),
      }),
      response: {
        200: z.object({
          clients: z.array(z.any()),
          tickets: z.array(z.any()),
          interactions: z.array(z.any()),
          stats: z.object({
            totalClients: z.number(),
            totalTickets: z.number(),
            totalInteractions: z.number(),
            ticketsParCategorie: z.record(z.number()),
            ticketsParSentiment: z.record(z.number()),
            ticketsParUrgence: z.record(z.number()),
          }),
        }),
        500: z.object({ error: z.string(), detail: z.string() }),
      },
    },
    handler: async (request, reply) => {
      try {
        const { clients, tickets, interactions } = request.query;
        const dataset = generateDataset(clients, tickets, interactions);
        return reply.status(200).send(dataset);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Erreur lors de la génération du dataset',
          detail: error.message,
        });
      }
    },
  });

  // === POST /api/dataset/seed ===
  fastify.post('/api/dataset/seed', {
    schema: {
      description: 'Génère et insère un dataset dans la base de données SQLite',
      tags: ['Dataset'],
      body: z.object({
        clients: z.coerce.number().min(1).max(50).default(5),
        tickets: z.coerce.number().min(1).max(50).default(10),
        interactions: z.coerce.number().min(0).max(50).default(15),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          created: z.object({
            clients: z.number(),
            tickets: z.number(),
            interactions: z.number(),
          }),
        }),
        500: z.object({ error: z.string(), detail: z.string() }),
      },
    },
    handler: async (request, reply) => {
      try {
        const { clients: numClients, tickets: numTickets, interactions: numInteractions } = request.body;
        const dataset = generateDataset(numClients, numTickets, numInteractions);

        // 1. Insérer les clients et garder un mapping email -> id réel en BDD
        const emailToId = {};
        for (const client of dataset.clients) {
          const created = await prisma.client.create({
            data: {
              nom: client.nom,
              prenom: client.prenom,
              email: client.email,
              telephone: client.telephone || null,
              dateInscription: new Date(client.dateInscription),
              segment: client.segment,
              statut: 'Actif',
            },
          });
          emailToId[client.email] = created.id;
        }

        // 2. Insérer les tickets, reliés au bon client via son email
        let ticketsCreated = 0;
        for (const ticket of dataset.tickets) {
          const clientId = emailToId[ticket.clientEmail];
          if (!clientId) continue; // sécurité : ignore si jamais le mapping échoue
          await prisma.ticket.create({
            data: {
              description: ticket.description,
              categorieDeclaree: ticket.categorieAttendue,
              priorite: ticket.priorite,
              statut: 'Ouvert',
              clientId,
            },
          });
          ticketsCreated++;
        }

        // 3. Insérer les interactions, reliées au bon client via son email
        let interactionsCreated = 0;
        for (const interaction of dataset.interactions) {
          const clientId = emailToId[interaction.clientEmail];
          if (!clientId) continue;
          await prisma.interaction.create({
            data: {
              canal: interaction.canal,
              typeInteraction: interaction.typeInteraction,
              dateInteraction: new Date(interaction.date),
              resume: interaction.resume,
              clientId,
            },
          });
          interactionsCreated++;
        }

        return reply.status(200).send({
          success: true,
          message: 'Dataset généré et inséré avec succès',
          created: {
            clients: Object.keys(emailToId).length,
            tickets: ticketsCreated,
            interactions: interactionsCreated,
          },
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: "Erreur lors de l'insertion du dataset",
          detail: error.message,
        });
      }
    },
  });
}
