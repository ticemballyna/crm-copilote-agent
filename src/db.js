// src/db.js
import { PrismaClient } from '@prisma/client';

// Une seule instance Prisma partagée dans toute l'application
const prisma = new PrismaClient();

export default prisma;
