import { getSettings } from "@/lib/settings";
import { PageTitle } from "../ui";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="max-w-4xl">
      <PageTitle title="Settings" subtitle="Prices and fees. Changes apply to new quotes only." />
      <SettingsForm s={settings} />
    </div>
  );
}
