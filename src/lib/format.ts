export const money = (n: number) =>
  "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const when = (s: string | null) => (s ? s.slice(0, 16).replace("T", " ") : "-");
