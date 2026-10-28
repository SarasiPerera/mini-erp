import { db } from "@/lib/db";
import { createParty } from "@/lib/actions";
import ErrorBanner from "@/components/ErrorBanner";

type Party = { id: number; name: string; email: string | null; phone: string | null };

export default function PartyPage({
  type,
  title,
  error,
}: {
  type: "supplier" | "customer";
  title: string;
  error?: string;
}) {
  const rows = db.prepare("SELECT id, name, email, phone FROM parties WHERE type = ? ORDER BY name").all(type) as Party[];
  return (
    <>
      <h2>{title}</h2>
      <p className="sub">{type === "supplier" ? "Who you buy from." : "Who you sell to."}</p>
      <ErrorBanner message={error} />
      <div className="tablewrap">
        {rows.length === 0 ? (
          <div className="empty">Nothing here yet.</div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.email ?? "-"}</td><td>{r.phone ?? "-"}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3>Add {type}</h3>
      <form className="panel" action={createParty}>
        <input type="hidden" name="type" value={type} />
        <div className="grid">
          <div><label>Name</label><input name="name" required /></div>
          <div><label>Email</label><input name="email" type="email" /></div>
          <div><label>Phone</label><input name="phone" /></div>
        </div>
        <p><button type="submit">Add {type}</button></p>
      </form>
    </>
  );
}
