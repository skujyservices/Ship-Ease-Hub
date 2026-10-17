import { getTransactions, getWalletBalance } from "@/lib/terminal/api";
import { formatMoney, toMinor } from "@/lib/money";
import { ErrorNote, PageTitle, Table, safe, td } from "../ui";

export default async function TransactionsPage() {
  const wallet = await safe(() => getWalletBalance());
  const walletId = wallet.data ? String(wallet.data.id ?? wallet.data._id ?? wallet.data.wallet_id ?? "") : "";
  const tx = walletId ? await safe(() => getTransactions(walletId, { perPage: 100 })) : { data: undefined, error: undefined };

  return (
    <div>
      <PageTitle title="Terminal wallet" subtitle="Terminal charges this wallet for every booking, duty, insurance and document. Top it up on terminal.africa." />
      <ErrorNote error={wallet.error ?? tx.error} />
      {wallet.data && (
        <div className="card mb-6 inline-block">
          <p className="label">Balance</p>
          <p className="text-3xl font-bold text-navy">{formatMoney(toMinor(wallet.data.amount), wallet.data.currency)}</p>
        </div>
      )}
      <Table head={["Date", "Description", "Amount", "Status"]}>
        {(tx.data?.transactions ?? []).map((t) => (
          <tr key={t.transactionId}>
            <td className={td}>{new Date(t.created_at).toLocaleString("en-GB")}</td>
            <td className={td}>{t.description}</td>
            <td className={`${td} font-semibold ${t.flow === "in" ? "text-success" : "text-navy"}`}>
              {t.flow === "in" ? "+" : "−"}{formatMoney(toMinor(t.amount), t.currency)}
            </td>
            <td className={`${td} capitalize`}>{t.status}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
