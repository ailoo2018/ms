// server/utils/prisma.js
import { PrismaClient } from '@prisma/client'

// This ensures a single instance is reused across your Nuxt app
const prisma = new PrismaClient()
export { prisma }