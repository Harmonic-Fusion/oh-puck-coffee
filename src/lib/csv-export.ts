import type { ShotWithJoins } from "@/components/shots/hooks";

/**
 * Convert shot data to CSV format matching Google Sheets row format
 */
export function exportShotsToCSV(shots: ShotWithJoins[]): string {
  const headers = [
    "Date",
    "User",
    "Bean",
    "Roast Level",
    "Roast Date",
    "Dose (g)",
    "Target Yield (g)",
    "Actual Yield (g)",
    "Brew Ratio",
    "Grind Level",
    "Brew Time (s)",
    "Brew Temp (°C)",
    "Pre-infusion (s)",
    "Flow Rate (g/s)",
    "Shot Quality",
    "Rating",
    "Flavor Wheel",
    "Body",
    "Tools Used",
    "Notes",
    "Days Post Roast",
    "Reference Shot",
  ];

  const rows = shots.map((shot) => {
    // Flatten flavor wheel categories
    const flavorWheelStr = shot.flavorWheelCategories
      ? Object.entries(shot.flavorWheelCategories)
          .map(([cat, flavors]) => `${cat}: ${flavors.join(", ")}`)
          .join("; ")
      : "";

    // Calculate days post roast if bean roast date exists
    let daysPostRoast = "";
    if (shot.beanRoastDate) {
      const shotDate = new Date(shot.createdAt);
      const roastDate = new Date(shot.beanRoastDate);
      const days = Math.floor(
        (shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysPostRoast = days.toString();
    }

    return [
      new Date(shot.createdAt).toISOString(),
      shot.userName || "",
      shot.beanName || "",
      "", // Roast level - not in ShotWithJoins, would need to fetch from bean
      shot.beanRoastDate
        ? new Date(shot.beanRoastDate).toISOString().split("T")[0]
        : "",
      shot.doseGrams,
      shot.yieldGrams,
      shot.yieldActualGrams || "",
      shot.brewRatio?.toString() || "",
      shot.grindLevel,
      shot.brewTimeSecs || "",
      shot.brewTempC || "",
      shot.preInfusionDuration || "",
      shot.flowRate || "",
      shot.shotQuality.toString(),
      shot.rating?.toString() || "",
      flavorWheelStr,
      shot.flavorWheelBody || "",
      shot.toolsUsed?.join(", ") || "",
      shot.notes || "",
      daysPostRoast,
      shot.isReferenceShot ? "Yes" : "No",
    ];
  });

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value: string | number): string => {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvRows.join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
