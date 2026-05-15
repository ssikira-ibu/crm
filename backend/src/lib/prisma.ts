import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config.js";
import { createSoftDeleteExtension } from "./softDelete.js";

const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });
const basePrisma = new PrismaClient({ adapter });

export const prisma = basePrisma.$extends(createSoftDeleteExtension(basePrisma));
