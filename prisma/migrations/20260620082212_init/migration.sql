-- CreateTable
CREATE TABLE "clients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "dateInscription" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "segment" TEXT NOT NULL DEFAULT 'Standard',
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "categorieDeclaree" TEXT,
    "priorite" TEXT NOT NULL DEFAULT 'Moyenne',
    "statut" TEXT NOT NULL DEFAULT 'Ouvert',
    "clientId" INTEGER NOT NULL,
    "agentId" INTEGER,
    "departementId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tickets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tickets_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "departements" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "canal" TEXT NOT NULL,
    "typeInteraction" TEXT NOT NULL,
    "dateInteraction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resume" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "agentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "interactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "produits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomProduit" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "version" TEXT,
    "prix" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "agents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "competences" TEXT,
    "disponibilite" BOOLEAN NOT NULL DEFAULT true,
    "departementId" INTEGER,
    CONSTRAINT "agents_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "departements" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "departements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nomDepartement" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "analyses_tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketId" INTEGER NOT NULL,
    "categorie" TEXT NOT NULL,
    "sousCategorie" TEXT,
    "themePrincipal" TEXT,
    "sentiment" TEXT NOT NULL,
    "scoreSentiment" REAL,
    "justificationSentiment" TEXT,
    "urgence" TEXT NOT NULL,
    "scoreUrgence" REAL,
    "justificationUrgence" TEXT,
    "departementRecommande" TEXT,
    "agentRecommande" TEXT,
    "raisonRoutage" TEXT,
    "resumeClient" TEXT,
    "reponseProposee" TEXT,
    "actionRecommandee" TEXT,
    "actionParametres" TEXT,
    "confiance" TEXT NOT NULL,
    "necessiteValidation" BOOLEAN NOT NULL DEFAULT true,
    "statutValidation" TEXT NOT NULL DEFAULT 'En attente',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "analyses_tickets_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departements_nomDepartement_key" ON "departements"("nomDepartement");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_tickets_ticketId_key" ON "analyses_tickets"("ticketId");
