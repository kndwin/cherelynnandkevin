export const sydneyTime = (value: string | null): string => value === null ? "—" : new Date(value).toLocaleString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "medium", timeStyle: "short" });
