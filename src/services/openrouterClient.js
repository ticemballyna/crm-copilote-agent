// src/services/openrouterClient.js
import { config } from '../config.js';

/**
 * Appelle l'API OpenRouter (chat completions).
 * Retourne le texte brut de la réponse du modèle.
 */
export async function callOpenRouter(systemPrompt, userPrompt, temperature = 0.1, forceJson = false) {
  if (!config.openrouter.apiKey) {
    throw new Error('OPENROUTER_API_KEY non configurée dans .env');
  }

  const body = {
    model: config.openrouter.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
  };

  if (forceJson) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openrouter.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:' + config.port,
      'X-Title': 'CRM Copilote IA',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur OpenRouter: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Certains providers (notamment des modèles :free saturés) renvoient un statut 200
  // mais un contenu vide/null, ou une structure inattendue. On le détecte explicitement
  // plutôt que de laisser planter le code plus loin avec une erreur peu claire.
  const content = data?.choices?.[0]?.message?.content;
  if (content === null || content === undefined) {
    const reason = data?.error?.message || data?.choices?.[0]?.finish_reason || 'contenu vide';
    throw new Error(`Réponse OpenRouter vide ou invalide (raison probable : ${reason})`);
  }

  return content;
}

/**
 * Nettoie une réponse qui pourrait contenir du JSON entouré de balises markdown.
 */
function extractJson(raw) {
  let text = raw.trim();
  if (text.includes('```json')) {
    text = text.split('```json')[1].split('```')[0].trim();
  } else if (text.includes('```')) {
    text = text.split('```')[1].split('```')[0].trim();
  }
  return text;
}

/**
 * Appelle le LLM en attendant une sortie JSON, avec parsing automatique.
 * `forceJson = true` active le mode JSON natif d'OpenRouter quand le modèle le supporte.
 */
export async function callLLMJson(systemPrompt, userPrompt, temperature = 0.1) {
  const raw = await callOpenRouter(systemPrompt, userPrompt, temperature, true);
  const cleaned = extractJson(raw);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`La réponse du LLM n'est pas un JSON valide. Contenu reçu : ${cleaned.slice(0, 300)}`);
  }
}

/**
 * Appelle le LLM en attendant une sortie texte libre (pas de parsing JSON).
 */
export async function callLLMText(systemPrompt, userPrompt, temperature = 0.5) {
  return callOpenRouter(systemPrompt, userPrompt, temperature, false);
}