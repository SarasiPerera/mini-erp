import PartyPage from "@/components/PartyPage";

export const dynamic = "force-dynamic";

export default async function Suppliers({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <PartyPage type="supplier" title="Suppliers" error={error} />;
}
