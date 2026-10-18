import "server-only";
import { z } from "zod";
import { db } from "./db";

const warehouseSchema = z.object({
  line1: z.string(),
  line2: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  phone: z.string(),
});
export type Warehouse = z.infer<typeof warehouseSchema>;
export const WAREHOUSES = { US: "USA", GB: "United Kingdom", CN: "China" } as const;
export type WarehouseCode = keyof typeof WAREHOUSES;

/** Business settings, editable in Admin → Settings. Money in minor units. */
export const settingsSchema = z.object({
  // Partner warehouse addresses shown to Shop & Ship customers (suite ID is added per customer)
  warehouses: z.object({ US: warehouseSchema, GB: warehouseSchema, CN: warehouseSchema }),
  // Outbound (Terminal): customer price = Terminal total × (1 + %) + fixed
  outboundMarkupPercent: z.number().min(0).max(100),
  outboundMarkupFixedMinor: z.number().int().min(0),
  // Estimating duty costs ~$0.04 per call; on = one estimate per carrier on the rate list
  dutyOnRateList: z.boolean(),
  terminalLowBalanceMinor: z.number().int().min(0),
  // Inbound (partners)
  inboundRates: z.object({
    US: z.object({ perKgMinor: z.number().int().min(0), etaDays: z.string() }),
    GB: z.object({ perKgMinor: z.number().int().min(0), etaDays: z.string() }),
    CN: z.object({ perKgMinor: z.number().int().min(0), etaDays: z.string() }),
  }),
  inboundMarkupPercent: z.number().min(0).max(100),
  volumetricDivisor: z.number().int().positive(),
  procurementFeePercent: z.number().min(0).max(100),
  storageFreeDays: z.number().int().min(0),
  storageFeePerDayMinor: z.number().int().min(0),
  storageMaxDays: z.number().int().min(1),
  fxToNgn: z.object({ USD: z.number().positive(), GBP: z.number().positive(), CNY: z.number().positive() }),
});

export type Settings = z.infer<typeof settingsSchema>;

const blankWarehouse: Warehouse = { line1: "", line2: "", city: "", state: "", zip: "", phone: "" };

export const DEFAULT_SETTINGS: Settings = {
  warehouses: { US: blankWarehouse, GB: blankWarehouse, CN: blankWarehouse },
  outboundMarkupPercent: 10,
  outboundMarkupFixedMinor: 0,
  dutyOnRateList: true,
  terminalLowBalanceMinor: 100_000_00,
  inboundRates: {
    US: { perKgMinor: 0, etaDays: "7–10 days" },
    GB: { perKgMinor: 0, etaDays: "7–10 days" },
    CN: { perKgMinor: 0, etaDays: "10–14 days" },
  },
  inboundMarkupPercent: 0,
  volumetricDivisor: 5000,
  procurementFeePercent: 5,
  storageFreeDays: 2,
  storageFeePerDayMinor: 10_000_00,
  storageMaxDays: 7,
  fxToNgn: { USD: 1550, GBP: 2050, CNY: 215 },
};

const KEY = "business";

export async function getSettings(): Promise<Settings> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...((row?.value as object) ?? {}) });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(value: Settings) {
  const data = settingsSchema.parse(value);
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: data }, update: { value: data } });
}
