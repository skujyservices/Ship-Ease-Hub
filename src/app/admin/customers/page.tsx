import { db } from "@/lib/db";
import { PageTitle, Table, td } from "../ui";

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const { q } = await searchParams;
  const term = typeof q === "string" ? q.trim() : "";
  const customers = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(term
        ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, { suiteId: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }] }
        : {}),
    },
    include: { _count: { select: { shipments: true, procurements: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageTitle title="Customers" subtitle="Search by name, email, phone or suite ID." />
      <form className="mb-4 flex max-w-md gap-2">
        <input name="q" defaultValue={term} className="input" placeholder="Search customers" />
        <button className="btn-primary">Search</button>
      </form>
      <Table head={["Customer", "Suite ID", "Phone", "Identity", "Shipments", "Buy for me", "Joined"]}>
        {customers.map((c) => (
          <tr key={c.id}>
            <td className={td}>{c.name}<span className="block text-xs text-navy/60">{c.email}</span></td>
            <td className={`${td} font-mono`}>{c.suiteId}</td>
            <td className={td}>{c.phone}</td>
            <td className={td}>{c.ninVerifiedAt ? <span className="chip bg-success/10 text-success">✓ {c.ninName}</span> : <span className="text-navy/40">Not verified</span>}</td>
            <td className={td}>{c._count.shipments}</td>
            <td className={td}>{c._count.procurements}</td>
            <td className={td}>{c.createdAt.toLocaleDateString("en-GB")}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
