import { CircleCheck, Clock, FlaskConical, Receipt } from "lucide-react";
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
      icon: Receipt,
    },
    {
      header: "Pending Payment",
      subHeader: "Bills awaiting payment",
      value: stats.pending,
      icon: Clock,
    },
    {
      header: "Paid",
      subHeader: "Payments already recorded",
      value: stats.paid,
      icon: CircleCheck,
    },
    {
      header: "Awaiting Laboratory",
      subHeader: "Paid bills needing forwarding",
      value: stats.awaitingLaboratory,
      icon: FlaskConical,
    },
  ];

  return (
    <section className="my-5 overflow-hidden rounded-2xl border border-gray-300 bg-gray-300">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.header} className="bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <Icon size={20} strokeWidth={1.5} className="shrink-0" />

                <h2 className="text-sm font-normal text-gray-500">
                  {card.header}
                </h2>
              </div>

              <p className="text-3xl font-semibold">{card.value}</p>

              <p className="mt-2 text-sm text-gray-400">{card.subHeader}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default BillingStats;
