import type { BillingStatistics } from "../../../../interface/Billing";

type BillingStatsProps = {
  stats: BillingStatistics;
};

function BillingStats({ stats }: BillingStatsProps) {
  const cards = [
    {
      header: "Total Bills",
      subHeader: "Pending and paid bills",
      value: stats.total,
      bg: "bg-sky-50",
      border: "border-sky-400",
    },
    {
      header: "Pending Payment",
      subHeader: "Bills awaiting payment",
      value: stats.pending,
      bg: "bg-white",
      border: "border-yellow-400",
    },
    {
      header: "Paid",
      subHeader: "Payments already recorded",
      value: stats.paid,
      bg: "bg-white",
      border: "border-green-400",
    },
    {
      header: "Awaiting Laboratory",
      subHeader: "Paid bills needing forwarding",
      value: stats.awaitingLaboratory,
      bg: "bg-white",
      border: "border-amber-400",
    },
  ];

  return (
    <div className="my-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <section
          key={card.header}
          className={`flex flex-col gap-1 rounded-3xl border px-4 py-2 ${card.border} ${card.bg}`}
        >
          <h2 className="text-sm font-bold">{card.header}</h2>
          <p className="text-3xl font-bold leading-none text-gray-950">
            {card.value}
          </p>
          <p className="text-xs font-medium text-gray-500">{card.subHeader}</p>
        </section>
      ))}
    </div>
  );
}

export default BillingStats;
