import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Sidebar } from "../components/sidebar";
import { TopBar } from "../components/topbar";
import { getPrimaryCompany } from "../lib/services/company-service";
import { getDataBounds } from "../lib/services/operational-data-service";
import type { CompanyDto } from "../lib/serializers";

export const metadata: Metadata = {
  title: "OpsMind — AI Operational Intelligence",
  description:
    "Detects potential energy inefficiency from production, electricity, operating hours and weather context.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  let company: CompanyDto | null = null;
  let period: { from: string | null; to: string | null } = { from: null, to: null };

  try {
    company = await getPrimaryCompany();
    if (company) {
      period = await getDataBounds(company.id);
    }
  } catch (error) {
    // A database failure must not blank the whole app: the shell still renders
    // and each page reports its own state. No connection details are logged.
    console.error(
      `[opsmind] layout could not load the demo company: ${
        error instanceof Error ? error.name : "UnknownError"
      }`,
    );
  }

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main">
            <TopBar company={company} period={period} />
            <main className="content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
