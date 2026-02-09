import * as z from "zod";

export const linkSheetSchema = z.object({
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
});

export const integrationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.string(),
  spreadsheetId: z.string().nullable(),
  spreadsheetName: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type LinkSheet = z.infer<typeof linkSheetSchema>;
export type Integration = z.infer<typeof integrationSchema>;
