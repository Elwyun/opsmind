import { withRoute } from "../../../lib/api/handler";
import { jsonOk } from "../../../lib/api/response";
import { listCompanies } from "../../../lib/services/company-service";

export const dynamic = "force-dynamic";

export const GET = withRoute(async () => {
  const companies = await listCompanies();
  return jsonOk(companies);
});
