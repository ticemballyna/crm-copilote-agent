# agent_service/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import render
from django.http import JsonResponse

from .serializers import TicketInputSerializer, AnalyseOutputSerializer
from .groq_agent import analyser_ticket_complet


class AgentAnalyzeAPIView(APIView):
    """
    Endpoint API pour analyser un ticket CRM.
    Pipeline en 5 étapes : Classification → Routage → Résumé → Réponse → Action
    """
    
    def post(self, request, *args, **kwargs):
        # 1. Validation des données d'entrée
        input_serializer = TicketInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = input_serializer.validated_data
        
        # 2. Exécution du pipeline IA
        try:
            result = analyser_ticket_complet(
                ticket_id=data.get('ticket_id', 0),
                description=data['description'],
                client_id=data['client_id'],
                priorite=data.get('priorite', 'Moyenne'),
                categorie_produit=data.get('categorie_produit', '')
            )
            
            # 3. Logique HITL basée sur le score de confiance
            action = result.get('action_recommandee', {})
            confiance = action.get('confiance', 'Moyenne')
            
            if confiance == 'Basse':
                result['hitl_status'] = 'À VALIDER MANUELLEMENT'
                http_status = status.HTTP_202_ACCEPTED
            else:
                result['hitl_status'] = 'VALIDÉ AUTOMATIQUEMENT'
                http_status = status.HTTP_200_OK
            
            # 4. Réponse structurée
            output_serializer = AnalyseOutputSerializer(data=result)
            output_serializer.is_valid(raise_exception=True)
            
            return Response(output_serializer.data, status=http_status)
            
        except Exception as e:
            return Response(
                {"error": "Erreur interne du service d'Agent.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def analyse_form(request):
    """Interface utilisateur pour l'analyse de tickets"""
    if request.method == 'POST':
        try:
            result = analyser_ticket_complet(
                ticket_id=int(request.POST.get('ticket_id', 0)),
                description=request.POST.get('description', ''),
                client_id=int(request.POST.get('client_id', 1)),
                priorite=request.POST.get('priorite', 'Moyenne')
            )
            
            action = result.get('action_recommandee', {})
            if action.get('confiance', 'Moyenne') == 'Basse':
                result['hitl_status'] = 'À VALIDER MANUELLEMENT'
            else:
                result['hitl_status'] = 'VALIDÉ AUTOMATIQUEMENT'
            
            return render(request, 'agent_service/result.html', {'result': result})
            
        except Exception as e:
            return render(request, 'agent_service/form.html', {'error': str(e)})
    
    return render(request, 'agent_service/form.html')