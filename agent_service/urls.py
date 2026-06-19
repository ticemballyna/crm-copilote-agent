# agent_service/urls.py

from django.urls import path
from .views import AgentAnalyzeAPIView, analyse_form

urlpatterns = [
    path('api/analyze/', AgentAnalyzeAPIView.as_view(), name='agent-analyze'),
    path('', analyse_form, name='recommendation-form'),
]