# agent_service/tools.py

from .models import Ticket, Departement

def escalader_ticket(ticket_id: int, raison: str) -> dict:
    """Transfère le ticket vers un niveau supérieur"""
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        ticket.statut = 'EN_COURS'
        ticket.save()
        return {"success": True, "message": f"Ticket #{ticket_id} escaladé : {raison}"}
    except Ticket.DoesNotExist:
        return {"success": False, "error": "Ticket non trouvé"}

def cloturer_ticket(ticket_id: int, resume_resolution: str) -> dict:
    """Marque le ticket comme résolu"""
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        ticket.statut = 'RESOLU'
        ticket.save()
        return {"success": True, "message": f"Ticket #{ticket_id} cloturé : {resume_resolution}"}
    except Ticket.DoesNotExist:
        return {"success": False, "error": "Ticket non trouvé"}

def planifier_rappel(ticket_id: int, date_rappel: str) -> dict:
    """Programme un suivi futur"""
    # Logique de planification à implémenter
    return {"success": True, "message": f"Rappel programmé pour le {date_rappel}"}

def transferer_departement(ticket_id: int, id_departement: int) -> dict:
    """Change le département assigné"""
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        departement = Departement.objects.get(id=id_departement)
        ticket.departement_cible = departement
        ticket.save()
        return {"success": True, "message": f"Ticket #{ticket_id} transféré vers {departement.nom_departement}"}
    except (Ticket.DoesNotExist, Departement.DoesNotExist):
        return {"success": False, "error": "Ticket ou département non trouvé"}

def demander_info_complementaire(ticket_id: int, question: str) -> dict:
    """Renvoie une demande de précision au client"""
    return {"success": True, "message": f"Question envoyée au client : {question}"}