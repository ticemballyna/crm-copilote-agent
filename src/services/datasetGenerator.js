// src/services/datasetGenerator.js
import { faker } from '@faker-js/faker';
import { config } from '../config.js';

const TICKET_TEMPLATES = [
  {
    description:
      "Bonjour, je constate un double prélèvement de {montant}€ sur ma carte pour le service {produit}. Pouvez-vous procéder au remboursement ?",
    categorieAttendue: 'Facturation',
    sentimentAttendu: 'Negatif',
    urgenceAttendue: 'Elevee',
  },
  {
    description:
      "Bonjour, depuis la mise à jour de l'application sur mon {appareil}, celle-ci plante systématiquement à l'ouverture. J'ai essayé de réinstaller mais rien n'y fait.",
    categorieAttendue: 'Support Technique',
    sentimentAttendu: 'Negatif',
    urgenceAttendue: 'Moyenne',
  },
  {
    description:
      "Bonjour, je souhaiterais des informations sur les nouvelles fonctionnalités de la version {version}. Pourriez-vous me contacter pour une démo ?",
    categorieAttendue: 'Information',
    sentimentAttendu: 'Neutre',
    urgenceAttendue: 'Faible',
  },
  {
    description:
      "Bonjour, le produit {produit} reçu ne correspond pas à ma commande. J'ai commandé {commande} mais j'ai reçu {recu}. Merci de corriger cette erreur.",
    categorieAttendue: 'Livraison',
    sentimentAttendu: 'Negatif',
    urgenceAttendue: 'Moyenne',
  },
  {
    description:
      "Bonjour, j'ai un problème avec la facture {facture}. Le montant est trop élevé et personne ne me répond depuis 3 jours, c'est inadmissible !",
    categorieAttendue: 'Facturation',
    sentimentAttendu: 'Negatif',
    urgenceAttendue: 'Critique',
  },
  {
    description:
      "Bonjour, je n'arrive pas à me connecter à mon compte. J'ai oublié mon mot de passe et je n'arrive pas à le réinitialiser.",
    categorieAttendue: 'Compte Utilisateur',
    sentimentAttendu: 'Neutre',
    urgenceAttendue: 'Moyenne',
  },
  {
    description:
      "Bonjour, je suis très satisfait de votre service {service}. Le produit est excellent ! Merci pour votre travail.",
    categorieAttendue: 'Information',
    sentimentAttendu: 'Positif',
    urgenceAttendue: 'Faible',
  },
  {
    description:
      "Bonjour, mon paiement par carte a été refusé trois fois alors que mon compte est bien approvisionné. Je n'arrive pas à finaliser ma commande {commande}.",
    categorieAttendue: 'Paiement',
    sentimentAttendu: 'Negatif',
    urgenceAttendue: 'Elevee',
  },
  {
    description:
      "URGENT : mon colis {commande} devait arriver hier, le suivi indique 'livré' mais je n'ai rien reçu. J'ai besoin d'une solution rapide.",
    categorieAttendue: 'Livraison',
    sentimentAttendu: 'Negatif',
    urgenceAttendue: 'Critique',
  },
];

function fillTemplate(template) {
  return template
    .replace(/{montant}/g, faker.number.float({ min: 9.99, max: 199.99, fractionDigits: 2 }).toString())
    .replace(/{produit}/g, faker.helpers.arrayElement(['Premium', 'Pro', 'Essentiel', 'Entreprise']))
    .replace(/{appareil}/g, faker.helpers.arrayElement(['iPhone', 'Android', 'PC', 'Mac']))
    .replace(/{version}/g, `v${faker.number.float({ min: 1, max: 5, fractionDigits: 1 })}`)
    .replace(/{commande}/g, faker.helpers.arrayElement(['Pack Pro', 'Pack Premium', 'Pack Essentiel']))
    .replace(/{recu}/g, faker.helpers.arrayElement(['Pack Essentiel', 'Pack Standard', 'Autre produit']))
    .replace(/{facture}/g, `F-${faker.number.int({ min: 1000, max: 9999 })}`)
    .replace(/{service}/g, faker.helpers.arrayElement(['Premium', 'Pro', 'Support']));
}

export function generateClient() {
  const sex = faker.person.sexType();
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName(sex);

  return {
    nom: lastName,
    prenom: firstName,
    email: faker.internet.email({ firstName, lastName }),
    telephone: faker.phone.number(),
    segment: faker.helpers.arrayElement(['Premium', 'Standard', 'Entreprise']),
    dateInscription: faker.date.past({ years: 2 }).toISOString(),
  };
}

/**
 * Génère un ticket. clientEmail permet de relier le ticket à son client
 * de façon fiable lors de l'insertion en base (au lieu de deviner par index).
 */
export function generateTicket(clientEmail) {
  const template = faker.helpers.arrayElement(TICKET_TEMPLATES);

  return {
    clientEmail,
    description: fillTemplate(template.description),
    priorite: faker.helpers.arrayElement(['Haute', 'Moyenne', 'Basse']),
    categorieAttendue: template.categorieAttendue,
    sentimentAttendu: template.sentimentAttendu,
    urgenceAttendue: template.urgenceAttendue,
    dateCreation: faker.date.recent({ days: 30 }).toISOString(),
  };
}

export function generateInteraction(clientEmail) {
  return {
    clientEmail,
    canal: faker.helpers.arrayElement(['Email', 'Chat', 'Telephone', 'Reseaux sociaux']),
    typeInteraction: faker.helpers.arrayElement(['Entrant', 'Sortant']),
    date: faker.date.recent({ days: 60 }).toISOString(),
    resume: faker.lorem.sentence({ min: 8, max: 20 }),
  };
}

export function generateDataset(numClients = 10, numTickets = 25, numInteractions = 30) {
  const clients = Array.from({ length: numClients }, () => generateClient());
  const clientEmails = clients.map((c) => c.email);

  const tickets = Array.from({ length: numTickets }, () =>
    generateTicket(faker.helpers.arrayElement(clientEmails))
  );

  const interactions = Array.from({ length: numInteractions }, () =>
    generateInteraction(faker.helpers.arrayElement(clientEmails))
  );

  const ticketsParCategorie = {};
  for (const cat of config.categories) {
    ticketsParCategorie[cat] = tickets.filter((t) => t.categorieAttendue === cat).length;
  }

  const ticketsParSentiment = {};
  for (const s of config.sentiments) {
    ticketsParSentiment[s] = tickets.filter((t) => t.sentimentAttendu === s).length;
  }

  const ticketsParUrgence = {};
  for (const u of config.urgences) {
    ticketsParUrgence[u] = tickets.filter((t) => t.urgenceAttendue === u).length;
  }

  const stats = {
    totalClients: clients.length,
    totalTickets: tickets.length,
    totalInteractions: interactions.length,
    ticketsParCategorie,
    ticketsParSentiment,
    ticketsParUrgence,
  };

  return { clients, tickets, interactions, stats };
}

export default {
  generateClient,
  generateTicket,
  generateInteraction,
  generateDataset,
};
