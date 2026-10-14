import { NotFoundError } from "../api/http-error";
import { prisma } from "../db";
import { serializeCompany, type CompanyDto } from "../serializers";

export async function listCompanies(): Promise<CompanyDto[]> {
  const rows = await prisma.company.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(serializeCompany);
}

export async function getCompanyById(id: string): Promise<CompanyDto> {
  const row = await prisma.company.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Company", id);
  return serializeCompany(row);
}

/**
 * The prototype's shell shows one demo company. Returns null when the database
 * has not been seeded so pages can show setup guidance instead of crashing.
 */
export async function getPrimaryCompany(): Promise<CompanyDto | null> {
  const row = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  return row ? serializeCompany(row) : null;
}
