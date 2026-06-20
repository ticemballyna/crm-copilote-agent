// src/routes/data.js
import { z } from 'zod';
import prisma from '../db.js';

export default async function dataRoutes(fastify) {
  // === GET /api/clients ===
  // Liste paginée des clients, avec compteur de tickets/interactions
  fastify.get('/api/clients', {
    schema: {
      description: 'Liste les clients enregistrés (pagination simple)',
      tags: ['Données CRM'],
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
        segment: z.string().optional(),
      }),
    },
    handler: async (request, reply) => {
      try {
        const { page, limit, segment } = request.query;
        const where = segment ? { segment } : {};

        const [clients, total] = await Promise.all([
          prisma.client.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              _count: { select: { tickets: true, interactions: true } },
            },
          }),
          prisma.client.count({ where }),
        ]);

        return reply.status(200).send({
          data: clients,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la récupération des clients', detail: error.message });
      }
    },
  });

  // === GET /api/clients/:id ===
  // Fiche client complète : profil + tickets + interactions (utile pour la "vision 360°")
  fastify.get('/api/clients/:id', {
    schema: {
      description: 'Fiche client complète : profil, tickets, interactions (vision 360°)',
      tags: ['Données CRM'],
      params: z.object({ id: z.coerce.number() }),
    },
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const client = await prisma.client.findUnique({
          where: { id },
          include: {
            tickets: {
              orderBy: { createdAt: 'desc' },
              include: { analyse: true },
            },
            interactions: {
              orderBy: { dateInteraction: 'desc' },
            },
          },
        });

        if (!client) {
          return reply.status(404).send({ error: 'Client introuvable' });
        }

        return reply.status(200).send(client);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la récupération du client', detail: error.message });
      }
    },
  });

  // === GET /api/tickets ===
  // Liste des tickets avec filtres, inclut l'analyse IA si elle existe
  fastify.get('/api/tickets', {
    schema: {
      description: 'Liste les tickets, avec filtres optionnels (statut, urgence, catégorie)',
      tags: ['Données CRM'],
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
        statut: z.string().optional(),
        urgence: z.string().optional(),
        categorie: z.string().optional(),
        clientId: z.coerce.number().optional(),
      }),
    },
    handler: async (request, reply) => {
      try {
        const { page, limit, statut, urgence, categorie, clientId } = request.query;

        const where = {
          ...(statut && { statut }),
          ...(clientId && { clientId }),
          ...((urgence || categorie) && {
            analyse: {
              ...(urgence && { urgence }),
              ...(categorie && { categorie }),
            },
          }),
        };

        const [tickets, total] = await Promise.all([
          prisma.ticket.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              client: { select: { id: true, nom: true, prenom: true, segment: true } },
              analyse: true,
            },
          }),
          prisma.ticket.count({ where }),
        ]);

        return reply.status(200).send({
          data: tickets,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la récupération des tickets', detail: error.message });
      }
    },
  });

  // === GET /api/tickets/:id ===
  // Détail d'un ticket : infos + client + analyse IA complète
  fastify.get('/api/tickets/:id', {
    schema: {
      description: "Détail complet d'un ticket : infos, client, analyse IA",
      tags: ['Données CRM'],
      params: z.object({ id: z.coerce.number() }),
    },
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: {
            client: true,
            analyse: true,
          },
        });

        if (!ticket) {
          return reply.status(404).send({ error: 'Ticket introuvable' });
        }

        return reply.status(200).send(ticket);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la récupération du ticket', detail: error.message });
      }
    },
  });

  // === PATCH /api/tickets/:id/validation ===
  // Permet à l'agent humain de valider/modifier/rejeter une analyse IA (HITL)
  fastify.patch('/api/tickets/:id/validation', {
    schema: {
      description: "Met à jour le statut de validation humaine d'une analyse IA (HITL)",
      tags: ['Données CRM'],
      params: z.object({ id: z.coerce.number() }),
      body: z.object({
        statutValidation: z.enum(['Valide', 'Rejete', 'Modifie']),
        reponseProposee: z.string().optional(), // si l'agent modifie la réponse avant validation
      }),
    },
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const { statutValidation, reponseProposee } = request.body;

        const analyse = await prisma.analyseTicket.findUnique({ where: { ticketId: id } });
        if (!analyse) {
          return reply.status(404).send({ error: 'Aucune analyse IA trouvée pour ce ticket' });
        }

        const updated = await prisma.analyseTicket.update({
          where: { ticketId: id },
          data: {
            statutValidation,
            ...(reponseProposee && { reponseProposee }),
          },
        });

        return reply.status(200).send(updated);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erreur lors de la mise à jour de la validation', detail: error.message });
      }
    },
  });
}