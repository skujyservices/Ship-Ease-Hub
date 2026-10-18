import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionButton } from "../ActionButton";
import { PageTitle, Table, td } from "../ui";
import { setRole } from "./actions";
import { InviteForm } from "./TeamClient";

export default async function TeamPage() {
  const me = await requireAdmin();
  const team = await db.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] } }, orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <div className="max-w-4xl space-y-6">
      <PageTitle title="Team" subtitle="Who can use the admin panel." />
      <InviteForm />
      <Table head={["Name", "Email", "Role", ""]}>
        {team.map((u) => (
          <tr key={u.id}>
            <td className={td}>{u.name}{u.id === me.id && <span className="ml-2 chip bg-mist text-navy">You</span>}</td>
            <td className={td}>{u.email}</td>
            <td className={td}><span className={`chip ${u.role === "ADMIN" ? "bg-gold/20 text-navy" : "bg-purple/10 text-purple"}`}>{u.role === "ADMIN" ? "Admin" : "Staff"}</span></td>
            <td className={`${td} text-right`}>
              {u.id !== me.id && (
                <span className="inline-flex flex-wrap justify-end gap-2">
                  <ActionButton className="chip bg-mist text-navy" action={setRole.bind(null, u.id, u.role === "ADMIN" ? "STAFF" : "ADMIN")}>
                    Make {u.role === "ADMIN" ? "staff" : "admin"}
                  </ActionButton>
                  <ActionButton className="chip bg-danger/10 text-danger" confirmText={`Remove ${u.name}'s team access?`} action={setRole.bind(null, u.id, "CUSTOMER")}>
                    Remove
                  </ActionButton>
                </span>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
