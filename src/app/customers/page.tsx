import PartyPage from "@/components/PartyPage";

export const dynamic = "force-dynamic";

export default async function Customers({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <PartyPage type="customer" title="Customers" error={error} />;
}
