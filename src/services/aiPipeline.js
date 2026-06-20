// src/services/aiPipeline.js
import { callLLMJson, callLLMText } from './openrouterClient.js';
import { config } from '../config.js';

// === PROMPTS SYSTÈME ===

const SYSTEM_PROMPTS = {
  classification: `Tu es un assistant d'analyse pour un service client.
Tu dois analyser les tickets clients et fournir une analyse structurée.

RÈGLES STRICTES :
1. Retourne UNIQUEMENT un objet JSON valide, sans texte additionnel.
2. Ne jamais inventer d'informations absentes du ticket.
3. Base-toi uniquement sur le contenu du ticket.

FORMAT DE SORTIE ATTENDU (JSON strict) :
{
  "categorie": "Facturation | Livraison | Reclamation | Support Technique | Compte Utilisateur | Paiement | Information",
  "sousCategorie": "précision courte sur le type de problème",
  "themePrincipal": "thème en 2-4 mots résumant le sujet central du ticket",
  "sentiment": "Positif | Neutre | Negatif",
  "scoreSentiment": nombre entre 0.0 et 1.0,
  "justificationSentiment": "explication courte (1 phrase)",
  "urgence": "Faible | Moyenne | Elevee | Critique",
  "scoreUrgence": nombre entre 0.0 et 1.0,
  "justificationUrgence": "explication courte (1 phrase)"
}

DÉFINITIONS DES CATÉGORIES :
- Facturation : prélèvements, factures, remboursements
- Livraison : colis, retards, erreurs de livraison
- Reclamation : plainte sur un produit, un service ou un comportement
- Support Technique : bugs, pannes, problèmes d'installation ou d'utilisation
- Compte Utilisateur : connexion, mot de passe, gestion du compte
- Paiement : échecs de paiement, moyens de paiement
- Information : demande d'information, documentation, aide générale

DÉFINITIONS DE L'URGENCE :
- Critique : bloquant, perte financière importante, menace de départ, colère explicite
- Elevee : impact significatif, client mécontent, besoin de réponse rapide
- Moyenne : problème gênant mais contournable
- Faible : question simple, demande d'information sans urgence`,

  routage: `Tu es un assistant de routage CRM.
À partir de la catégorie du ticket, suggère l'équipe et l'agent les plus adaptés.

RÈGLES :
1. Retourne UNIQUEMENT un objet JSON valide.
2. Justifie brièvement ta décision.

FORMAT DE SORTIE ATTENDU :
{
  "equipeRecommandee": "equipe_support | equipe_facturation | equipe_technique | equipe_commerciale",
  "agentRecommande": "nom de l'agent ou null",
  "raison": "justification courte (1 phrase)"
}

ÉQUIPES :
- equipe_facturation : problèmes de paiement, factures, remboursements
- equipe_support : livraison, réclamations générales
- equipe_technique : bugs, comptes utilisateurs, problèmes techniques
- equipe_commerciale : demandes d'information, prospection`,

  resume: `Tu es un assistant qui résume l'historique client.
Rédige un résumé court (3-5 lignes) pour qu'un agent comprenne rapidement :
- le profil du client
- les problèmes récurrents
- le contexte actuel

Sois concis, va à l'essentiel, ton professionnel. Réponds uniquement avec le résumé, sans préambule.`,

  reponse: `Tu es un expert en service client. Rédige une réponse personnalisée au client.

RÈGLES :
1. Adapte le ton au segment client (Premium = chaleureux, Entreprise = formel, Standard = professionnel)
2. Sois empathique et orienté solution
3. Ne promets pas de délais que tu ne peux pas tenir
4. Réponds en français, directement avec le texte de la réponse (sans JSON, sans préambule)`,

  action: `Tu es un agent CRM. Choisis UNE action parmi les outils suivants :

1. escalader_ticket : transfère vers un niveau supérieur (paramètres: ticketId, raison)
2. cloturer_ticket : marque le ticket comme résolu (paramètres: ticketId, resumeResolution)
3. planifier_rappel : programme un suivi futur (paramètres: ticketId, dateRappel)
4. transferer_departement : change le département assigné (paramètres: ticketId, departement)
5. demander_info_complementaire : renvoie une demande de précision (paramètres: ticketId, question)

RÈGLES :
1. Retourne UNIQUEMENT un objet JSON valide.
2. Choisis l'action la plus pertinente selon l'analyse et l'urgence.
3. Si le cas est ambigu, atypique, ou si l'urgence est Critique, mets confiance: "Basse" pour déclencher la validation humaine.

FORMAT DE SORTIE ATTENDU :
{
  "actionRecommandee": "nom_de_l_action",
  "parametres": { "param1": "valeur1" },
  "confiance": "Haute | Moyenne | Basse",
  "necessiteValidation": true
}`,
};

// === ÉTAPES INDIVIDUELLES ===

export async function etape1Classification(description, categorieProduit = '', priorite = 'Moyenne') {
  const userPrompt = `Ticket à analyser :

Description : ${description}
Contexte produit : ${categorieProduit || 'Non spécifié'}
Priorité déclarée par le client : ${priorite}

Analyse ce ticket et retourne le JSON demandé.`;

  try {
    return await callLLMJson(SYSTEM_PROMPTS.classification, userPrompt);
  } catch (error) {
    console.error('Erreur Étape 1 (classification):', error.message);
    return {
      categorie: 'Information',
      sousCategorie: 'Non déterminé',
      themePrincipal: 'Analyse indisponible',
      sentiment: 'Neutre',
      scoreSentiment: 0.5,
      justificationSentiment: 'Fallback suite à une erreur technique',
      urgence: 'Moyenne',
      scoreUrgence: 0.5,
      justificationUrgence: 'Fallback suite à une erreur technique',
    };
  }
}

export async function etape2Routage(categorie, description, agentsDisponibles = '') {
  if (categorie in config.categoryToTeam) {
    return {
      equipeRecommandee: config.categoryToTeam[categorie],
      agentRecommande: null,
      raison: `Routage basé sur la règle catégorie -> équipe (${categorie})`,
    };
  }

  const userPrompt = `Catégorie : ${categorie}
Description : ${description}
Agents disponibles : ${agentsDisponibles || 'Tous les agents'}

Suggère le routage approprié.`;

  try {
    return await callLLMJson(SYSTEM_PROMPTS.routage, userPrompt);
  } catch (error) {
    console.error('Erreur Étape 2 (routage):', error.message);
    return {
      equipeRecommandee: 'equipe_support',
      agentRecommande: null,
      raison: 'Fallback par défaut suite à une erreur technique',
    };
  }
}

export async function etape3ResumeClient(historiqueTickets, interactionsRecentes, profilClient) {
  const userPrompt = `Profil client : ${profilClient}
Historique des tickets : ${historiqueTickets || 'Aucun ticket récent'}
Interactions récentes : ${interactionsRecentes || 'Aucune interaction récente'}

Résume ce client en 3-5 lignes.`;

  try {
    return await callLLMText(SYSTEM_PROMPTS.resume, userPrompt, 0.3);
  } catch (error) {
    console.error('Erreur Étape 3 (résumé client):', error.message);
    return 'Résumé non disponible (erreur technique).';
  }
}

export async function etape4GenererReponse(description, analyse, resumeClient, segment = 'Standard') {
  const userPrompt = `Ticket : ${description}
Analyse : ${JSON.stringify(analyse)}
Contexte client : ${resumeClient}
Segment client : ${segment}

Rédige une réponse personnalisée.`;

  try {
    return await callLLMText(SYSTEM_PROMPTS.reponse, userPrompt, 0.7);
  } catch (error) {
    console.error('Erreur Étape 4 (génération réponse):', error.message);
    return 'Réponse non disponible (erreur technique). Veuillez traiter ce ticket manuellement.';
  }
}

export async function etape5RecommanderAction(analyse, reponse, resumeClient) {
  const userPrompt = `Analyse du ticket : ${JSON.stringify(analyse)}
Réponse proposée : ${reponse}
Historique client : ${resumeClient}

Choisis l'action la plus pertinente.`;

  try {
    return await callLLMJson(SYSTEM_PROMPTS.action, userPrompt);
  } catch (error) {
    console.error('Erreur Étape 5 (recommandation action):', error.message);
    return {
      actionRecommandee: 'demander_info_complementaire',
      parametres: { question: 'Pouvez-vous préciser votre demande ?' },
      confiance: 'Basse',
      necessiteValidation: true,
    };
  }
}

/**
 * Pipeline complet en 5 étapes.
 * Les étapes 3 et 4 dépendent du résultat des étapes précédentes,
 * l'exécution reste donc séquentielle.
 */
export async function runPipeline(ticketData) {
  const ticketId = ticketData.id || 0;
  const description = ticketData.description;
  const client = ticketData.client || {};
  const priorite = ticketData.priorite || 'Moyenne';
  const categorieProduit = ticketData.categorieProduit || '';
  const historiqueTickets = ticketData.historiqueTickets || [];
  const interactionsRecentes = ticketData.interactionsRecentes || [];

  const historiqueStr = historiqueTickets
    .slice(0, config.pipeline.maxHistoryTickets)
    .map((t) => `- Ticket #${t.id ?? '?'} : ${t.categorie ?? '?'} - ${(t.description || '').slice(0, 80)}...`)
    .join('\n');

  const interactionsStr = interactionsRecentes
    .slice(0, config.pipeline.maxHistoryInteractions)
    .map((i) => `- ${i.canal ?? '?'} le ${i.date ?? '?'} : ${(i.resume || '').slice(0, 80)}...`)
    .join('\n');

  const profilStr = `${client.prenom || ''} ${client.nom || ''} - Segment: ${client.segment || 'Standard'}`;

  const classification = await etape1Classification(description, categorieProduit, priorite);
  const routage = await etape2Routage(classification.categorie, description);
  const resumeClient = await etape3ResumeClient(historiqueStr, interactionsStr, profilStr);

  const segment = client.segment || 'Standard';
  const reponse = await etape4GenererReponse(description, classification, resumeClient, segment);

  const action = await etape5RecommanderAction(classification, reponse, resumeClient);

  // HITL : déclenché si confiance Basse, OU si urgence Critique (garde-fou supplémentaire)
  const hitlRequired = action.confiance === 'Basse' || classification.urgence === 'Critique';
  const hitlStatus = hitlRequired ? 'A_VALIDER_MANUELLEMENT' : 'VALIDE_AUTOMATIQUEMENT';

  const confianceScore = { Haute: 1.0, Moyenne: 0.6, Basse: 0.3 }[action.confiance] ?? 0.5;

  return {
    ticketId,
    classification,
    routage,
    resumeClient,
    reponseProposee: reponse,
    actionRecommandee: { ...action, necessiteValidation: hitlRequired },
    hitlStatus,
    scoreGlobal: confianceScore,
  };
}

export default {
  etape1Classification,
  etape2Routage,
  etape3ResumeClient,
  etape4GenererReponse,
  etape5RecommanderAction,
  runPipeline,
};
