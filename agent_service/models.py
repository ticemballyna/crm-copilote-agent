# agent_service/models.py

from django.db import models

class Client(models.Model):
    """Client du CRM"""
    SEGMENT_CHOICES = [
        ('PREMIUM', 'Premium'),
        ('STANDARD', 'Standard'),
        ('ENTREPRISE', 'Entreprise'),
    ]
    
    STATUT_CHOICES = [
        ('ACTIF', 'Actif'),
        ('INACTIF', 'Inactif'),
        ('SUSPENDU', 'Suspendu'),
    ]
    
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20)
    date_inscription = models.DateField()
    segment = models.CharField(max_length=20, choices=SEGMENT_CHOICES, default='STANDARD')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIF')
    
    def __str__(self):
        return f"{self.prenom} {self.nom}"


class Ticket(models.Model):
    CATEGORIE_CHOICES = [
        ('FACTURATION', 'Facturation'),
        ('SUPPORT_TECHNIQUE', 'Support Technique'),
        ('RECLAMATION', 'Réclamation'),
        ('INFORMATION', 'Information'),
    ]
    
    PRIORITE_CHOICES = [
        ('HAUTE', 'Haute'),
        ('MOYENNE', 'Moyenne'),
        ('BASSE', 'Basse'),
    ]
    
    STATUT_CHOICES = [
        ('OUVERT', 'Ouvert'),
        ('EN_COURS', 'En cours'),
        ('RESOLU', 'Résolu'),
        ('FERME', 'Fermé'),
    ]
    
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='tickets')
    date_creation = models.DateTimeField(auto_now_add=True)
    categorie = models.CharField(max_length=30, choices=CATEGORIE_CHOICES)
    description = models.TextField()
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='MOYENNE')
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='OUVERT')
    agent_assigne = models.ForeignKey('Agent', on_delete=models.SET_NULL, null=True, blank=True)
    departement_cible = models.ForeignKey('Departement', on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"Ticket #{self.id} - {self.client.prenom} {self.client.nom}"


class Interaction(models.Model):
    CANAL_CHOICES = [
        ('EMAIL', 'Email'),
        ('CHAT', 'Chat'),
        ('TELEPHONE', 'Téléphone'),
        ('RESEAUX_SOCIAUX', 'Réseaux sociaux'),
    ]
    
    TYPE_CHOICES = [
        ('ENTRANT', 'Entrant'),
        ('SORTANT', 'Sortant'),
    ]
    
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='interactions')
    canal = models.CharField(max_length=20, choices=CANAL_CHOICES)
    type_interaction = models.CharField(max_length=10, choices=TYPE_CHOICES)
    date_interaction = models.DateTimeField(auto_now_add=True)
    resume = models.TextField()
    agent = models.ForeignKey('Agent', on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"Interaction {self.id} - {self.client.prenom} {self.client.nom}"


class Produit(models.Model):
    nom_produit = models.CharField(max_length=100)
    categorie = models.CharField(max_length=50)
    version = models.CharField(max_length=20, blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return self.nom_produit


class Agent(models.Model):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    competences = models.TextField(blank=True)
    disponibilite = models.BooleanField(default=True)
    departement = models.ForeignKey('Departement', on_delete=models.SET_NULL, null=True)
    
    def __str__(self):
        return f"{self.prenom} {self.nom}"


class Departement(models.Model):
    nom_departement = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.nom_departement