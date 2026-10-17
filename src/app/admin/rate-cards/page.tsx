import { getMyRateCards } from "@/lib/terminal/api";
import { ErrorNote, PageTitle, Table, safe, td } from "../ui";

export default async function RateCardsPage() {
  const res = await safe(() => getMyRateCards());
  const rows = (res.data?.cards ?? []).flatMap((card) =>
    card.directions.map((d) => ({ card, d })),
  );
  return (
    <div>
      <PageTitle title="Rate cards" subtitle="The price tables Terminal quotes your account from (read-only). Download them to check margins." />
      <ErrorNote error={res.error} />
      <Table head={["Carrier", "Card", "Direction", "Grade", "Currency", "Download"]}>
        {rows.map(({ card, d }) => (
          <tr key={d.rate_card_id}>
            <td className={td}><b>{String(card.carrier_name ?? card.carrier ?? "")}</b></td>
            <td className={td}>{d.name}</td>
            <td className={`${td} capitalize`}>{d.service_direction}</td>
            <td className={`${td} capitalize`}>{String(card.pricing_grade ?? "–")}</td>
            <td className={td}>{d.currency}</td>
            <td className={td}>
              <a className="font-semibold text-purple" href={`/admin/rate-cards/${d.rate_card_id}/pdf`}>PDF</a>
              {" · "}
              <a className="font-semibold text-purple" href={`/admin/rate-cards/${d.rate_card_id}/excel`}>Excel</a>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
