import type { BillingStatistics } from "../../../../interface/Billing.ts";

type BillingStatsProps = {
  stats: BillingStatistics;
};

function BillingStats({ stats }: BillingStatsProps) {
  const cards = [
    {
      header: "Total Requests",
      subHeader: "All pending and processing payments",
      value: stats.totalRequests,
      bg: "bg-sky-50",
      border: "border-sky-400",
    },
    {
      header: "Pending Payment",
      subHeader: "Requests awaiting payments",
      value: stats.pendingPayment,
      bg: "bg-white",
      border: "border-yellow-400",
    },
    {
      header: "Paid and Forwarded",
      subHeader: "Already processed and sent to departments",
      value: stats.paidRequests,
      bg: "bg-white",
      border: "border-green-400",
    },
    {
      header: "Cancelled",
      subHeader: "Requests that were cancelled",
      value: stats.cancelledRequests,
      bg: "bg-white",
      border: "border-green-400",
    },
  ];

  return (
    <div className="my-5 grid grid-cols-4 gap-5">
      {cards.map((card) => {
        return (
          <div
            key={card.header}
            className={`rounded-3xl border ${card.border} ${card.bg} px-4 py-3 flex flex-col gap-1`}
          >
            <h1 className="text-sm font-bold">{card.header}</h1>

            <p className="text-3xl font-bold leading-none text-gray-950">
              {card.value}
            </p>
            <h3 className="text-xs font-medium text-gray-500">
              {card.subHeader}
            </h3>
          </div>
        );
      })}
    </div>
  );
}

export default BillingStats;
