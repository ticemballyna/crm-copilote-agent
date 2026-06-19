# agent_service/groq_agent.py

import json
import os
from typing import Dict, Any, Optional

from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser, JsonOutputParser
from langchain_groq import ChatGroq
from dotenv import load_dotenv

from .prompts import (
    CLASSIFICATION_PROMPT,
    ROUTAGE_PROMPT,
    RESUME_CLIENT_PROMPT,
    REPONSE_PROMPT,
    ACTION_PROMPT
)
from .models import Client, Ticket, Interaction, Agent, Departement

# --- CHARGEMENT DE LA CLÉ API ---
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("La clé GROQ_API_KEY n'est pas configurée dans l'environnement.")

# --- INITIALISATION DU LLM ---
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY,
    temperature=0.1  # Température basse pour des sorties structurées
)

# === SCHÉMAS PYDANTIC POUR CHAQUE ÉTAPE ===

class ClassificationSchema(BaseModel):
    categorie: str = Field(description="Catégorie du ticket")
    sentiment: str = Field(description="Sentiment du client")
    urgence: str = Field(description="Niveau d'urgence")
    justification_urgence: str = Field(description="Justification courte")

class RoutageSchema(BaseModel):
    departement_recommande: str = Field(description="Département recommandé")
    agent_recommande: Optional[str] = Field(default=None, description="ID agent recommandé")
    raison: str = Field(description="Justification du routage")

class ActionSchema(BaseModel):
    action_recommandee: str = Field(description="Action recommandée")
    parametres: Dict[str, Any] = Field(default_factory=dict, description="Paramètres de l'action")
    confiance: str = Field(description="Niveau de confiance (Haute/Moyenne/Basse)")
    necessite_validation: bool = Field(default=True, description="Validation humaine requise")


# === PARSERS ===
classif_parser = PydanticOutputParser(pydantic_object=ClassificationSchema)
routage_parser = PydanticOutputParser(pydantic_object=RoutageSchema)
action_parser = PydanticOutputParser(pydantic_object=ActionSchema)
json_parser = JsonOutputParser()


# === FONCTIONS POUR CHAQUE ÉTAPE ===

def etape1_classification(description: str, categorie_produit: str = "", priorite: str = "Moyenne") -> ClassificationSchema:
    """
    ÉTAPE 1 : Classification & Analyse
    """
    prompt = CLASSIFICATION_PROMPT.partial(
        format_instructions=classif_parser.get_format_instructions()
    )
    chain = prompt | llm | classif_parser
    
    try:
        result = chain.invoke({
            "description": description,
            "categorie_produit": categorie_produit or "Non spécifié",
            "priorite": priorite
        })
        return result
    except Exception as e:
        print(f"Erreur Étape 1 : {e}")
        # Fallback en cas d'erreur
        return ClassificationSchema(
            categorie="Information",
            sentiment="Neutre",
            urgence="Moyenne",
            justification_urgence="Fallback suite à erreur API"
        )


def etape2_routage(categorie: str, description: str, agents_disponibles: str) -> RoutageSchema:
    """
    ÉTAPE 2 : Routage (avec règles d'abord, LLM si ambigu)
    """
    # Règles simples de mapping
    mapping_categorie_departement = {
        "Facturation": "Facturation",
        "Support Technique": "Support N1",
        "Réclamation": "Support N2",
        "Information": "Support N1"
    }
    
    # Si la catégorie est claire, on applique la règle
    if categorie in mapping_categorie_departement:
        return RoutageSchema(
            departement_recommande=mapping_categorie_departement[categorie],
            agent_recommande=None,
            raison=f"Routage basé sur la catégorie : {categorie}"
        )
    
    # Sinon, on utilise le LLM
    prompt = ROUTAGE_PROMPT.partial(
        format_instructions=routage_parser.get_format_instructions()
    )
    chain = prompt | llm | routage_parser
    
    try:
        result = chain.invoke({
            "categorie": categorie,
            "description": description,
            "agents_disponibles": agents_disponibles or "Tous les agents disponibles"
        })
        return result
    except Exception as e:
        print(f"Erreur Étape 2 : {e}")
        return RoutageSchema(
            departement_recommande="Support N1",
            agent_recommande=None,
            raison="Fallback par défaut"
        )


def etape3_resume_client(historique_tickets: str, interactions_recentes: str, profil_client: str) -> str:
    """
    ÉTAPE 3 : Résumé du contexte client
    """
    prompt = RESUME_CLIENT_PROMPT
    chain = prompt | llm
    
    try:
        result = chain.invoke({
            "historique_tickets": historique_tickets or "Aucun ticket récent",
            "interactions_recentes": interactions_recentes or "Aucune interaction récente",
            "profil_client": profil_client or "Profil non spécifié"
        })
        return result.content
    except Exception as e:
        print(f"Erreur Étape 3 : {e}")
        return "Résumé non disponible (erreur technique)."


def etape4_generer_reponse(description: str, analyse: ClassificationSchema, resume_client: str, segment: str = "Standard") -> str:
    """
    ÉTAPE 4 : Génération de la réponse
    """
    prompt = REPONSE_PROMPT
    chain = prompt | llm
    
    # Adapter le ton selon le segment
    ton = "formel et professionnel" if segment == "Entreprise" else "empathique et chaleureux" if segment == "Premium" else "professionnel"
    
    try:
        result = chain.invoke({
            "description": description,
            "analyse": analyse.model_dump_json(),
            "resume_client": resume_client,
            "segment": f"{segment} (ton {ton})"
        })
        return result.content
    except Exception as e:
        print(f"Erreur Étape 4 : {e}")
        return "Réponse non disponible (erreur technique). Veuillez traiter manuellement."


def etape5_recommander_action(analyse: ClassificationSchema, reponse: str, resume_client: str) -> ActionSchema:
    """
    ÉTAPE 5 : Recommandation d'action (AGENTIQUE)
    """
    outils_disponibles = """
    - escalader_ticket : paramètres {id_ticket, raison}
    - cloturer_ticket : paramètres {id_ticket, resume_resolution}
    - planifier_rappel : paramètres {id_ticket, date_rappel}
    - transferer_departement : paramètres {id_ticket, id_departement}
    - demander_info_complementaire : paramètres {id_ticket, question}
    """
    
    prompt = ACTION_PROMPT.partial(
        format_instructions=action_parser.get_format_instructions()
    )
    chain = prompt | llm | action_parser
    
    try:
        result = chain.invoke({
            "analyse": analyse.model_dump_json(),
            "reponse": reponse,
            "resume_client": resume_client,
            "outils_disponibles": outils_disponibles
        })
        return result
    except Exception as e:
        print(f"Erreur Étape 5 : {e}")
        return ActionSchema(
            action_recommandee="demander_info_complementaire",
            parametres={"question": "Pouvez-vous préciser votre demande ?"},
            confiance="Basse",
            necessite_validation=True
        )


# === FONCTION PRINCIPALE ===
def analyser_ticket_complet(
    ticket_id: int,
    description: str,
    client_id: int,
    priorite: str = "Moyenne",
    categorie_produit: str = ""
) -> Dict[str, Any]:
    """
    Fonction principale qui exécute l'ensemble du pipeline en 5 étapes.
    """
    # ÉTAPE 1 : Classification
    classification = etape1_classification(description, categorie_produit, priorite)
    
    # ÉTAPE 2 : Routage
    # Récupérer les agents disponibles depuis la BDD
    agents_disponibles = ", ".join([f"{a.prenom} {a.nom}" for a in Agent.objects.filter(disponibilite=True)[:5]])
    routage = etape2_routage(classification.categorie, description, agents_disponibles)
    
    # ÉTAPE 3 : Résumé client
    # Récupérer l'historique du client
    try:
        client = Client.objects.get(id=client_id)
        historique_tickets = "\n".join([f"- Ticket #{t.id} : {t.categorie} - {t.description[:100]}" for t in client.tickets.all()[:5]])
        interactions_recentes = "\n".join([f"- {i.canal} le {i.date_interaction} : {i.resume[:100]}" for i in client.interactions.all()[:5]])
        profil_client = f"{client.prenom} {client.nom} - Segment: {client.segment} - Inscrit le {client.date_inscription}"
    except Client.DoesNotExist:
        historique_tickets = "Client non trouvé"
        interactions_recentes = "Client non trouvé"
        profil_client = "Client non trouvé"
    
    resume_client = etape3_resume_client(historique_tickets, interactions_recentes, profil_client)
    
    # ÉTAPE 4 : Génération réponse
    reponse = etape4_generer_reponse(description, classification, resume_client, client.segment if 'client' in locals() else "Standard")
    
    # ÉTAPE 5 : Recommandation action
    action = etape5_recommander_action(classification, reponse, resume_client)
    
    return {
        "ticket_id": ticket_id,
        "classification": classification.model_dump(),
        "routage": routage.model_dump(),
        "resume_client": resume_client,
        "reponse_proposee": reponse,
        "action_recommandee": action.model_dump()
    }