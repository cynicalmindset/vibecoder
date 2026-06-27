import {PrismaClient} from "@prisma/client";

const globalForPrisma = global
const prisma = new prismaClient();

if(process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default globalForPrisma.prisma;