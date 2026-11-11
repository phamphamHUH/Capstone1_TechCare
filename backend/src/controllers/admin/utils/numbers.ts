// NUMERIC and COUNT(*) come back from the driver as strings.
export const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundMoney = (value: number) => Math.round(value * 100) / 100;
