export function royalty(gross: number, format: string, paid: boolean, _shipping = 0) {
  return paid ? Math.round(gross * (format === "digital" ? 0.7 : 0.3) * 100) / 100 : 0;
}
export function isPayoutDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (year == null || month == null || day == null) return false;
  return day === 30 || (month === 2 && day === new Date(Date.UTC(year, 2, 0)).getUTCDate());
}
export function canStartProduction(stage: string, paid: boolean, reference: string | null) {
  return stage === "invoiced" && paid && !!reference;
}