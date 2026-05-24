import { PrismaService } from '../prisma/prisma.service';

let ftsAvailable: boolean | null = null;

export async function isFtsAvailable(prisma: PrismaService): Promise<boolean> {
  if (ftsAvailable !== null) return ftsAvailable;
  try {
    await prisma.$queryRaw`SELECT "searchVector" FROM "Ticket" LIMIT 0`;
    ftsAvailable = true;
  } catch {
    ftsAvailable = false;
  }
  return ftsAvailable;
}

export function resetFtsCache() {
  ftsAvailable = null;
}
