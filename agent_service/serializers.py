# agent_service/serializers.py

from rest_framework import serializers

class TicketInputSerializer(serializers.Serializer):
    """Validation des données d'entrée pour l'API"""
    ticket_id = serializers.IntegerField(required=False, default=0)
    description = serializers.CharField(max_length=2000)
    client_id = serializers.IntegerField()
    priorite = serializers.CharField(max_length=10, required=False, default='Moyenne')
    categorie_produit = serializers.CharField(max_length=100, required=False, default='')

class ClassificationOutputSerializer(serializers.Serializer):
    categorie = serializers.CharField()
    sentiment = serializers.CharField()
    urgence = serializers.CharField()
    justification_urgence = serializers.CharField()

class RoutageOutputSerializer(serializers.Serializer):
    departement_recommande = serializers.CharField()
    agent_recommande = serializers.CharField(allow_null=True)
    raison = serializers.CharField()

class ActionOutputSerializer(serializers.Serializer):
    action_recommandee = serializers.CharField()
    parametres = serializers.DictField()
    confiance = serializers.CharField()
    necessite_validation = serializers.BooleanField()

class AnalyseOutputSerializer(serializers.Serializer):
    ticket_id = serializers.IntegerField()
    classification = ClassificationOutputSerializer()
    routage = RoutageOutputSerializer()
    resume_client = serializers.CharField()
    reponse_proposee = serializers.CharField()
    action_recommandee = ActionOutputSerializer()
    hitl_status = serializers.CharField(required=False)