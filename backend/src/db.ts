import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { config } from './config.js';

const adapter = new PrismaPg({
  connectionString: config.databaseUrl,
  max: config.dbPool.max,
  idleTimeoutMillis: config.dbPool.idleTimeoutMillis,
  connectionTimeoutMillis: config.dbPool.connectionTimeoutMillis,
  // İlişib qalan sorğu bütün hovuzu tutmasın
  statement_timeout: config.dbPool.statementTimeoutMs,
  application_name: 'simo-api',
});
export const prisma = new PrismaClient({ adapter });
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
