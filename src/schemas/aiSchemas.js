// src/schemas/aiSchemas.js
import { z } from 'zod';

// === SCHEMAS D'ENTRÉE ===

export const ClientInputSchema = z.object({
  id: z.number().optional(),
  nom: z.string(),
  prenom: z.string(),
  email: z.string().email(),
  segment: z.enum(['Premium', 'Standard', 'Entreprise']).default('Standard'),
  dateInscription: z.string().optional(),
});

export const HistoriqueTicketSchema = z.object({
  id: z.number().optional(),
  categorie: z.string().optional(),
  description: z.string().optional(),
});

export const InteractionRecenteSchema = z.object({
  canal: z.string().optional(),
  date: z.string().optional(),
  resume: z.string().optional(),
});

export const TicketInputSchema = z.object({
  id: z.number().optional().default(0),
  description: z.string().min(1).max(2000),
  client: ClientInputSchema,
  priorite: z.enum(['Haute', 'Moyenne', 'Basse']).default('Moyenne'),
  categorieProduit: z.string().optional().default(''),
  historiqueTickets: z.array(HistoriqueTicketSchema).optional().default([]),
  interactionsRecentes: z.array(InteractionRecenteSchema).optional().default([]),
});

export const ChatInputSchema = z.object({
  message: z.string().min(1),
  clientId: z.number().optional().default(0),
  historique: z.array(HistoriqueTicketSchema).optional().default([]),
});

// === SCHEMAS DE SORTIE ===

// 7 catégories du cahier des charges
export const CategorieEnum = z.enum([
  'Facturation',
  'Livraison',
  'Reclamation',
  'Support Technique',
  'Compte Utilisateur',
  'Paiement',
  'Information',
]);

export const SentimentEnum = z.enum(['Positif', 'Neutre', 'Negatif']);

// 4 niveaux d'urgence du cahier des charges
export const UrgenceEnum = z.enum(['Faible', 'Moyenne', 'Elevee', 'Critique']);

export const ClassificationOutputSchema = z.object({
  categorie: CategorieEnum,
  sousCategorie: z.string(),
  themePrincipal: z.string(),
  sentiment: SentimentEnum,
  scoreSentiment: z.number().min(0).max(1),
  justificationSentiment: z.string(),
  urgence: UrgenceEnum,
  scoreUrgence: z.number().min(0).max(1),
  justificationUrgence: z.string(),
});

export const RoutageOutputSchema = z.object({
  equipeRecommandee: z.string(),
  agentRecommande: z.string().nullable().optional(),
  raison: z.string(),
});

export const ActionOutputSchema = z.object({
  actionRecommandee: z.string(),
  parametres: z.record(z.any()).default({}),
  confiance: z.enum(['Haute', 'Moyenne', 'Basse']),
  necessiteValidation: z.boolean().default(true),
});

export const PipelineOutputSchema = z.object({
  ticketId: z.number(),
  classification: ClassificationOutputSchema,
  routage: RoutageOutputSchema,
  resumeClient: z.string(),
  reponseProposee: z.string(),
  actionRecommandee: ActionOutputSchema,
  hitlStatus: z.string().optional(),
  scoreGlobal: z.number().optional(),
});

export const ChatOutputSchema = z.object({
  reponse: z.string(),
  classification: ClassificationOutputSchema.optional(),
  actionSuggeree: ActionOutputSchema.optional(),
  urgent: z.boolean().default(false),
});
