// src/config.js
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
  },

  pipeline: {
    confidenceThreshold: 0.75,
    maxHistoryTickets: 5,
    maxHistoryInteractions: 5,
  },

  // Catégories alignées sur le cahier des charges (partie 3 : Classification)
  categories: [
    'Facturation',
    'Livraison',
    'Reclamation',
    'Support Technique',
    'Compte Utilisateur',
    'Paiement',
    'Information',
  ],

  sentiments: ['Positif', 'Neutre', 'Negatif'],

  // 4 niveaux d'urgence demandés (faible/moyenne/élevée/critique)
  urgences: ['Faible', 'Moyenne', 'Elevee', 'Critique'],

  // Mapping catégorie -> équipe (partie "Routage intelligent")
  categoryToTeam: {
    Facturation: 'equipe_facturation',
    Livraison: 'equipe_support',
    Reclamation: 'equipe_support',
    'Support Technique': 'equipe_technique',
    'Compte Utilisateur': 'equipe_technique',
    Paiement: 'equipe_facturation',
    Information: 'equipe_commerciale',
  },

  teams: ['equipe_support', 'equipe_facturation', 'equipe_technique', 'equipe_commerciale'],

  availableTools: [
    { name: 'escalader_ticket', description: 'Transfère vers un niveau supérieur', parameters: ['ticketId', 'raison'] },
    { name: 'cloturer_ticket', description: 'Marque le ticket comme résolu', parameters: ['ticketId', 'resumeResolution'] },
    { name: 'planifier_rappel', description: 'Programme un suivi futur', parameters: ['ticketId', 'dateRappel'] },
    { name: 'transferer_departement', description: 'Change le département assigné', parameters: ['ticketId', 'departement'] },
    { name: 'demander_info_complementaire', description: 'Renvoie une demande de précision', parameters: ['ticketId', 'question'] },
  ],
};

/**
 * Vérifie que la configuration minimale est présente.
 * Lève une erreur claire au démarrage si la clé API manque.
 */
export function checkConfig() {
  if (!config.openrouter.apiKey || config.openrouter.apiKey.startsWith('sk-or-v1-xxxx')) {
    throw new Error(
      'OPENROUTER_API_KEY manquante ou invalide.\n' +
      "1) Copie .env.example vers .env\n" +
      '2) Remplace la valeur par ta vraie clé depuis https://openrouter.ai/keys'
    );
  }
}

export default config;
