import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { getDashboardAnalytics } from "@/lib/dashboard-analytics";
import type { Range } from "@/lib/usage";

const VALID_RANGES: Range[] = ["today", "week", "month", "all"];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = VALID_RANGES.includes(rawRange as Range)
    ? (rawRange as Range)
    : "week";

  const data = await getDashboardAnalytics({ range });

  return <AnalyticsOverview data={data} />;
}
