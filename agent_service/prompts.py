# agent_service/prompts.py

from langchain_core.prompts import ChatPromptTemplate

# === ÉTAPE 1 : CLASSIFICATION & ANALYSE ===
CLASSIFICATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Tu es un assistant d'analyse pour un service client. 
    Analyse le ticket suivant et retourne UNIQUEMENT un objet JSON valide, 
    sans texte additionnel, avec les champs : categorie, sentiment, urgence, justification_urgence.

    Catégories possibles : Facturation, Support Technique, Réclamation, Information.
    Sentiments possibles : Positif, Neutre, Négatif, Très négatif.
    Urgences possibles : Haute, Moyenne, Basse."""),
    ("user", """
    Ticket : {description}
    Contexte produit : {categorie_produit}
    Priorité déclarée : {priorite}
    """)
])

# === ÉTAPE 2 : ROUTAGE (optionnel, règles d'abord) ===
ROUTAGE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Tu es un assistant de routage CRM. 
    À partir de la catégorie du ticket, suggère le département et l'agent les plus adaptés.
    Retourne UNIQUEMENT un objet JSON avec : departement_recommande, agent_recommande, raison.

    Départements disponibles : Support N1, Support N2, Facturation, Technique."""),
    ("user", """
    Catégorie du ticket : {categorie}
    Description : {description}
    Liste des agents disponibles : {agents_disponibles}
    """)
])

# === ÉTAPE 3 : RÉSUMÉ DU CONTEXTE CLIENT ===
RESUME_CLIENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Tu es un assistant qui résume l'historique client.
    Rédige un résumé court (3-5 lignes) qui permet à un agent de comprendre 
    rapidement le contexte, les problèmes récurrents et le profil du client."""),
    ("user", """
    Historique des tickets du client : {historique_tickets}
    Interactions récentes : {interactions_recentes}
    Profil client : {profil_client}
    """)
])

# === ÉTAPE 4 : GÉNÉRATION DE LA RÉPONSE ===
REPONSE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Tu es un assistant expert en service client.
    Rédige une réponse personnalisée et professionnelle pour le client.
    Ton doit être adapté au segment du client : {segment}
    Sois empathique, clair et orienté solution."""),
    ("user", """
    Ticket : {description}
    Analyse : {analyse}
    Résumé client : {resume_client}
    """)
])

# === ÉTAPE 5 : RECOMMANDATION D'ACTION (AGENTIQUE) ===
ACTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Tu es un agent CRM. À partir de l'analyse du ticket, 
    choisis UNE action parmi les outils suivants :
    - escalader_ticket : Transfère vers un niveau supérieur
    - cloturer_ticket : Marque le ticket comme résolu
    - planifier_rappel : Programme un suivi futur
    - transferer_departement : Change le département assigné
    - demander_info_complementaire : Renvoie une demande de précision au client

    Retourne UNIQUEMENT un JSON avec : action_recommandee, parametres, confiance."""),
    ("user", """
    Analyse du ticket : {analyse}
    Réponse proposée : {reponse}
    Historique client : {resume_client}
    Outils disponibles : {outils_disponibles}
    """)
])