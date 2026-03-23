"use client";

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
} from "react";
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
import { ChartContainer } from "@/components/common/ChartContainer";

interface ParameterRatingChartProps {
  shots: ShotWithJoins[];
  isLoading?: boolean;
}

interface ParameterOption {
  key: string;
  label: string;
  unit: string;
  accessor: (shot: ShotWithJoins) => number | null;
}

const PARAMETERS: ParameterOption[] = [
  {
    key: "grindLevel",
    label: "Grind Level",
    unit: "",
    accessor: (s) => parseNum(s.grindLevel),
  },
  {
    key: "doseGrams",
    label: "Dose",
    unit: "g",
    accessor: (s) => parseNum(s.doseGrams),
  },
  {
    key: "yieldGrams",
    label: "Yield (target)",
    unit: "g",
    accessor: (s) => parseNum(s.yieldGrams),
  },
  {
    key: "yieldActualGrams",
    label: "Yield (actual)",
    unit: "g",
    accessor: (s) => parseNum(s.yieldActualGrams),
  },
  {
    key: "brewTimeSecs",
    label: "Brew Time",
    unit: "s",
    accessor: (s) => parseNum(s.brewTimeSecs),
  },
  {
    key: "brewTempC",
    label: "Brew Temp",
    unit: "°C",
    accessor: (s) => parseNum(s.brewTempC),
  },
  {
    key: "brewPressure",
    label: "Brew Pressure",
    unit: "bar",
    accessor: (s) => parseNum(s.brewPressure),
  },
  {
    key: "preInfusionDuration",
    label: "Pre-Infusion",
    unit: "s",
    accessor: (s) => parseNum(s.preInfusionDuration),
  },
  {
    key: "flowRate",
    label: "Flow Rate",
    unit: "ml/s",
    accessor: (s) => parseNum(s.flowRate),
  },
  {
    key: "brewRatio",
    label: "Brew Ratio",
    unit: ":1",
    accessor: (s) => (s.brewRatio != null ? s.brewRatio : null),
  },
  {
    key: "daysPostRoast",
    label: "Days Post-Roast",
    unit: "d",
    accessor: (s) => (s.daysPostRoast != null ? s.daysPostRoast : null),
  },
];

const PARAMETER_CHART_DESCRIPTION =
  "Each point is a rated shot. Pick a parameter below the chart to see how it tracks with your shot ratings; click a point for full shot details.";

interface DataPoint {
  x: number;
  rating: number;
  shot: ShotWithJoins;
}

function parseNum(value: string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formatValue(
  value: number | null | undefined,
  unit: string,
): string {
  if (value == null) return "—";
  const rounded = Math.round(value * 100) / 100;
  return unit ? `${rounded}${unit}` : String(rounded);
}

function ratingColor(rating: number): string {
  if (rating >= 4.5) return "#16a34a";
  if (rating >= 3.5) return "#65a30d";
  if (rating >= 2.5) return "#ca8a04";
  if (rating >= 1.5) return "#ea580c";
  return "#dc2626";
}


function ParameterSelector({
  paramKey,
  setParamKey,
  setExpandedShot,
}: {
  paramKey: string;
  setParamKey: (paramKey: string) => void;
  setExpandedShot: (expandedShot: ShotWithJoins | null) => void;
}) {
  return (
    <select
      value={paramKey}
      onChange={(e) => {
        setParamKey(e.target.value);
        setExpandedShot(null);
      }}
      className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
      aria-label="Parameter for horizontal axis"
    >
      {PARAMETERS.map((p) => (
        <option key={p.key} value={p.key}>
          {p.label}
          {p.unit ? ` (${p.unit})` : ""}
        </option>
      ))}
    </select>
  );
}

export function ParameterRatingChart({
  shots,
  isLoading = false,
}: ParameterRatingChartProps) {
  const [paramKey, setParamKey] = useState("grindLevel");
  const [expandedShot, setExpandedShot] = useState<ShotWithJoins | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const param = PARAMETERS.find((p) => p.key === paramKey) ?? PARAMETERS[0];

  const data: DataPoint[] = useMemo(() => {
    const points: DataPoint[] = [];
    for (const shot of shots) {
      const xVal = param.accessor(shot);
      const yVal = shot.rating;
      if (xVal != null && yVal != null) {
        points.push({ x: xVal, rating: yVal, shot });
      }
    }
    return points.sort((a, b) => a.x - b.x);
  }, [shots, param]);

  const handleClick = useCallback(
    (point: DataPoint) => {
      setExpandedShot((prev) =>
        prev?.id === point.shot.id ? null : point.shot,
      );
    },
    [],
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpandedShot(null);
      }
    }
    if (expandedShot) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [expandedShot]);

  const insufficientData = data.length < 2;

  return (
    <>
      <ChartContainer
        title="Rating vs Parameter"
        description={PARAMETER_CHART_DESCRIPTION}
        isLoading={isLoading}
        chartHeight={300}
        showNoData={insufficientData}
        noDataOverlay="Need at least 2 rated shots to chart parameter correlations"
        xController={
          <ParameterSelector
            paramKey={paramKey}
            setParamKey={setParamKey}
            setExpandedShot={setExpandedShot}
          />
        }
      >
        <ScatterChart margin={{ top: 10, right: 20, bottom: 8, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#d6d3d1"
            className="dark:stroke-stone-700"
          />
          <XAxis
            dataKey="x"
            type="number"
            unit={param.unit ? ` ${param.unit}` : ""}
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <YAxis
            dataKey="rating"
            type="number"
            name="Rating"
            domain={[0.5, 5.5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 12, fill: "#78716c" }}
            tickLine={false}
            label={{
              value: "Rating",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 12, fill: "#78716c" },
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={<HoverTooltip paramLabel={param.label} paramUnit={param.unit} />}
          />
          <Scatter
            data={data}
            onClick={(entry: { payload?: DataPoint }) => {
              if (entry.payload) handleClick(entry.payload);
            }}
            style={{ cursor: "pointer" }}
          >
            {data.map((point) => (
              <Cell
                key={point.shot.id}
                fill={ratingColor(point.rating)}
                stroke={
                  expandedShot?.id === point.shot.id ? "#1c1917" : "transparent"
                }
                strokeWidth={expandedShot?.id === point.shot.id ? 2 : 0}
                r={expandedShot?.id === point.shot.id ? 7 : 5}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ChartContainer>

      {expandedShot && (
        <ShotDetailPanel
          ref={panelRef}
          shot={expandedShot}
          onClose={() => setExpandedShot(null)}
        />
      )}
    </>
  );
}

interface HoverTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DataPoint }>;
  paramLabel: string;
  paramUnit: string;
}

function HoverTooltip({ active, payload, paramLabel, paramUnit }: HoverTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const { shot, x, rating } = payload[0].payload;
  const date = new Date(shot.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-200 shadow-lg">
      <div className="mb-1 font-medium text-stone-100">
        {shot.beanName ?? "Unknown bean"}
      </div>
      <div className="space-y-0.5 text-stone-400">
        <div>
          {paramLabel}: <span className="text-stone-200">{formatValue(x, paramUnit)}</span>
        </div>
        <div>
          Rating: <span className="text-stone-200">{rating}/5</span>
        </div>
        <div>{date}</div>
      </div>
      <div className="mt-1 text-[10px] text-stone-500">Click for details</div>
    </div>
  );
}

import { XMarkIcon } from "@heroicons/react/24/outline";

interface ShotDetailPanelProps {
  shot: ShotWithJoins;
  onClose: () => void;
}

const ShotDetailPanel = forwardRef<HTMLDivElement, ShotDetailPanelProps>(
  function ShotDetailPanel({ shot, onClose }, ref) {
    const rows: Array<{ label: string; value: string }> = [
      { label: "Bean", value: shot.beanName ?? "—" },
      { label: "Grinder", value: shot.grinderName ?? "—" },
      { label: "Machine", value: shot.machineName ?? "—" },
      { label: "Grind Level", value: formatValue(parseNum(shot.grindLevel), "") },
      { label: "Dose", value: formatValue(parseNum(shot.doseGrams), "g") },
      { label: "Yield (target)", value: formatValue(parseNum(shot.yieldGrams), "g") },
      { label: "Yield (actual)", value: formatValue(parseNum(shot.yieldActualGrams), "g") },
      { label: "Brew Time", value: formatValue(parseNum(shot.brewTimeSecs), "s") },
      { label: "Brew Temp", value: formatValue(parseNum(shot.brewTempC), "°C") },
      { label: "Brew Pressure", value: formatValue(parseNum(shot.brewPressure), "bar") },
      { label: "Pre-Infusion", value: formatValue(parseNum(shot.preInfusionDuration), "s") },
      { label: "Flow Rate", value: formatValue(parseNum(shot.flowRate), "ml/s") },
      { label: "Brew Ratio", value: shot.brewRatio != null ? `${shot.brewRatio}:1` : "—" },
      { label: "Days Post-Roast", value: shot.daysPostRoast != null ? `${shot.daysPostRoast}d` : "—" },
      { label: "Rating", value: shot.rating != null ? `${shot.rating}/5` : "—" },
      { label: "Shot Quality", value: shot.shotQuality != null ? `${shot.shotQuality}/5` : "—" },
      { label: "Bitter", value: shot.bitter != null ? `${shot.bitter}/5` : "—" },
      { label: "Sour", value: shot.sour != null ? `${shot.sour}/5` : "—" },
    ];

    if (shot.notes) {
      rows.push({ label: "Notes", value: shot.notes });
    }

    const date = new Date(shot.createdAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    return (
      <div
        ref={ref}
        className="mt-4 animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              {shot.beanName ?? "Unknown bean"}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              {date}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2 py-0.5 text-xs">
              <span className="text-stone-500 dark:text-stone-400">
                {row.label}
              </span>
              <span className="font-medium text-stone-800 dark:text-stone-200 text-right">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
);
