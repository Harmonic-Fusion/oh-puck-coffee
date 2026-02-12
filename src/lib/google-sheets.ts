import { google } from "googleapis";
import { db } from "@/db";
import { accounts, integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { config } from "@/shared/config";

/**
 * Get an authorized Google Sheets client for a user.
 * Automatically refreshes expired tokens.
 */
async function getAuthorizedClient(userId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.provider, "google"))
    )
    .limit(1);

  if (!account || !account.access_token) {
    throw new Error("No Google account linked");
  }

  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Check if token is expired or about to expire
  const now = Date.now();
  const expiryDate = account.expires_at ? account.expires_at * 1000 : 0;

  if (expiryDate && expiryDate < now + 60_000) {
    // Refresh the token
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // Persist refreshed tokens back to the DB
      await db
        .update(accounts)
        .set({
          access_token: credentials.access_token ?? account.access_token,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : account.expires_at,
          refresh_token: credentials.refresh_token ?? account.refresh_token,
        })
        .where(
          and(eq(accounts.userId, userId), eq(accounts.provider, "google"))
        );
    } catch {
      // Mark integration as inactive on refresh failure
      await db
        .update(integrations)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(integrations.userId, userId));
      throw new Error("Failed to refresh Google token — integration deactivated");
    }
  }

  return oauth2Client;
}

const HEADER_ROW = [
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
  "Brew Pressure (bar)",
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

/**
 * Validate that we can access a spreadsheet.
 * Returns the spreadsheet title on success.
 */
export async function validateSpreadsheetAccess(
  userId: string,
  spreadsheetId: string
): Promise<string> {
  const auth = await getAuthorizedClient(userId);
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title",
  });

  const title = response.data.properties?.title;
  if (!title) throw new Error("Could not read spreadsheet title");
  return title;
}

/**
 * Write the header row to the first row of Sheet1.
 */
export async function writeHeaderRow(
  userId: string,
  spreadsheetId: string
): Promise<void> {
  const auth = await getAuthorizedClient(userId);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [HEADER_ROW],
    },
  });
}

/**
 * Append a shot row to the linked spreadsheet.
 */
export async function appendShotRow(
  userId: string,
  spreadsheetId: string,
  shot: {
    createdAt: Date;
    userName?: string | null;
    beanName?: string | null;
    beanRoastLevel?: string | null;
    beanRoastDate?: Date | null;
    doseGrams: string;
    yieldGrams: string;
    yieldActualGrams?: string | null;
    brewRatio: number | null;
    grindLevel: string;
    brewTimeSecs?: string | null;
    brewTempC?: string | null;
    preInfusionDuration?: string | null;
    brewPressure?: string | null;
    flowRate?: string | null;
    shotQuality: number;
    rating?: number | null;
    flavorWheelCategories?: Record<string, string[]> | null;
    flavorWheelBody?: string | null;
    toolsUsed?: string[] | null;
    notes?: string | null;
    daysPostRoast: number | null;
    isReferenceShot: boolean;
  }
): Promise<void> {
  const auth = await getAuthorizedClient(userId);
  const sheets = google.sheets({ version: "v4", auth });

  // Flatten flavor wheel categories into a readable string
  const flavorWheelStr = shot.flavorWheelCategories
    ? Object.entries(shot.flavorWheelCategories)
        .map(([cat, flavors]) => `${cat}: ${flavors.join(", ")}`)
        .join("; ")
    : "";

  const row = [
    shot.createdAt.toISOString(),
    shot.userName ?? "",
    shot.beanName ?? "",
    shot.beanRoastLevel ?? "",
    shot.beanRoastDate ? shot.beanRoastDate.toISOString().split("T")[0] : "",
    shot.doseGrams,
    shot.yieldGrams,
    shot.yieldActualGrams ?? "",
    shot.brewRatio ?? "",
    shot.grindLevel,
    shot.brewTimeSecs ?? "",
    shot.brewTempC ?? "",
    shot.preInfusionDuration ?? "",
    shot.brewPressure ?? "",
    shot.flowRate ?? "",
    shot.shotQuality,
    shot.rating ?? "",
    flavorWheelStr,
    shot.flavorWheelBody ?? "",
    shot.toolsUsed?.join(", ") ?? "",
    shot.notes ?? "",
    shot.daysPostRoast ?? "",
    shot.isReferenceShot ? "Yes" : "No",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:U",
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });
}
