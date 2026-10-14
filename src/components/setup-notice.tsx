import { EmptyState } from "./ui";

export function SetupNotice() {
  return (
    <EmptyState title="No demo data found">
      <p className="small">
        The database has no company yet. Run the seed command to create the deterministic 30-day
        simulated dataset, then reload this page:
      </p>
      <p className="mono">npm run db:setup</p>
    </EmptyState>
  );
}
