import type { ActivityStatistics } from "../../../../interface/Activity.ts";
import { Activity, AlertTriangle, CircleUserRound, UserRoundX, Users } from "lucide-react";

type Props = {
  stats: ActivityStatistics;
};

function ActivityStats({ stats }: Props) {
  const cards = [
    {
      label: "All Activities",
      value: stats.totalActivities,
      bg: "bg-sky-50",
      border: "border-sky-400",
      iconBg: "bg-sky-200",
      icon: Activity,
    },
    {
      label: "Active Users",
      value: stats.activeUsers,
      bg: "bg-green-50",
      border: "border-green-400",
      iconBg: "bg-green-200",
      icon: Users,
    },
    {
      label: "Inactive Users",
      value: stats.inactiveUsers,
      bg: "bg-orange-50",
      border: "border-orange-400",
      iconBg: "bg-orange-200",
      icon: UserRoundX,
    },
    {
      label: "Critical Actions",
      value: stats.criticalActions,
      bg: "bg-red-50",
      border: "border-red-400",
      iconBg: "bg-red-200",
      icon: AlertTriangle,
    },
    {
      label: "Today's Activities",
      value: stats.todayActivities,
      bg: "bg-fuchsia-50",
      border: "border-fuchsia-400",
      iconBg: "bg-fuchsia-200",
      icon: CircleUserRound,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className={`rounded-xl border ${card.border} ${card.bg} px-4 py-3`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}
              >
                <Icon size={22} strokeWidth={1.7}   className="text-gray-600"/>
              </div>

               <span className="text-xs font-medium text-gray-500">
                {card.label}
              </span>
            </div>

            {/* The statistic is centered like the reference design. */}
            <p className="mt-2 text-center text-3xl font-bold leading-none text-gray-950">
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default ActivityStats;
