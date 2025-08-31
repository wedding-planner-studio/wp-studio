import { PrismaClient, type Prisma } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';

export type Connection = Omit<
  PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const defaultPrismaClient = new PrismaClient();

export interface UnauthedServiceOptions {
  db: Connection;
  prismaClient?: PrismaClient;
}

export class UnauthedService {
  protected db: Connection;

  protected prismaClient: PrismaClient;

  constructor(options: UnauthedServiceOptions) {
    this.db = options.db;
    this.prismaClient = options.prismaClient || defaultPrismaClient;
  }
}
