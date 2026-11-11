import type { ActivityStatistics } from "../../../../interface/Activity.ts";
import {
  Activity,
  AlertTriangle,
  CircleUserRound,
  UserRoundX,
  Users,
} from "lucide-react";

type Props = {
  stats: ActivityStatistics;
};

function ActivityStats({ stats }: Props) {
  const cards = [
    {
      label: "All Activities",
      subLabel: "Recorded activities",
      value: stats.totalActivities,
      icon: Activity,
    },
    {
      label: "Active Users",
      subLabel: "Currently active",
      value: stats.activeUsers,
      icon: Users,
    },
    {
      label: "Inactive Users",
      subLabel: "Currently inactive",
      value: stats.inactiveUsers,
      icon: UserRoundX,
    },
    {
      label: "Critical Actions",
      subLabel: "Sensitive activities",
      value: stats.criticalActions,
      icon: AlertTriangle,
    },
    {
      label: "Today's Activities",
      subLabel: "Recorded today",
      value: stats.todayActivities,
      icon: CircleUserRound,
    },
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-md border border-gray-300 bg-gray-300">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-white p-6 sm:last:col-span-2 lg:last:col-span-1"
            >
              <div className="mb-4 flex items-center gap-3">
                <Icon size={20} strokeWidth={1.5} className="shrink-0" />

                <p className="text-sm text-gray-500">{card.label}</p>
              </div>

              <p className="text-3xl font-semibold">{card.value}</p>

              <p className="mt-2 text-sm text-gray-400">{card.subLabel}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ActivityStats;
