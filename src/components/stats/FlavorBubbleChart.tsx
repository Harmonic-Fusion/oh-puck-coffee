"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import type { ShotWithJoins } from "@/components/shots/hooks";
import { aggregateFlavorStatsFromShots } from "@/lib/flavor-stats";
import { ChartContainer } from "@/components/common/ChartContainer";

interface FlavorBubbleChartProps {
  shots: ShotWithJoins[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "#1c1917",
  border: "1px solid #44403c",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#e7e5e4",
};

interface BubblePoint {
  flavor: string;
  avgRating: number;
  count: number;
  /** Bubble radius in px (clamped 5–20). */
  r: number;
  /** X-axis index for scatter positioning */
  x: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: BubblePoint }[];
}): ReactNode {
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div style={TOOLTIP_STYLE} className="rounded-lg px-3 py-2">
      <p className="font-medium">{d.flavor}</p>
      <p>Avg rating: {d.avgRating}/5</p>
      <p>Shot count: {d.count}</p>
    </div>
  );
}

export function FlavorBubbleChart({ shots }: FlavorBubbleChartProps) {
  const data = useMemo<BubblePoint[]>(() => {
    const flavors = aggregateFlavorStatsFromShots(shots)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 15);

    if (flavors.length === 0) return [];

    const maxCount = Math.max(...flavors.map((f) => f.count), 1);

    return flavors.map((f, i) => ({
      flavor: f.flavor,
      avgRating: f.avgRating,
      count: f.count,
      r: Math.max(5, Math.round((f.count / maxCount) * 20)),
      x: i,
    }));
  }, [shots]);

  const isEmpty = data.length === 0;

  return (
    <ChartContainer
      title="Flavor Bubbles"
      description="Top flavors by avg rating. Bubble size = shot count."
      chartHeight={280}
      showNoData={isEmpty}
      noDataOverlay="No flavor data — add ratings to your shots"
    >
      <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
        <XAxis
          dataKey="x"
          type="number"
          domain={[-0.5, data.length - 0.5]}
          ticks={data.map((_, i) => i)}
          tickFormatter={(v: number) => data[v]?.flavor ?? ""}
          tick={{ fontSize: 10, fill: "#78716c" }}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis
          dataKey="avgRating"
          type="number"
          domain={[0, 5]}
          tick={{ fontSize: 12, fill: "#78716c" }}
          tickLine={false}
          label={{
            value: "Avg Rating",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 11, fill: "#78716c" },
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Scatter data={data} shape="circle">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              r={entry.r}
              fill="#d97706"
              fillOpacity={0.75}
              stroke="#b45309"
              strokeWidth={1}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
}
