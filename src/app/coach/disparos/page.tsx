import DispatchPanel from "@/components/DispatchPanel";
import { PageTitle } from "@/components/ui";
import { weekLabel, weekStart } from "@/server/dates";
import { listQueue } from "@/server/queries";
import { DEFAULT_TEMPLATE, waMeLink, whatsappProvider } from "@/server/whatsapp";

export const dynamic = "force-dynamic";

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const week = semana ?? weekStart();

  const queue = await listQueue(week);
  const provider = whatsappProvider();

  const items = queue.map((item) => ({
    ...item,
    waLink: waMeLink(item.phone, item.message),
  }));

  return (
    <div className="animate-fade-up">
      <PageTitle
        title="Disparos de WhatsApp"
        subtitle={`Semana de ${weekLabel(week)} · um link por aluno, o mesmo toda semana`}
      />
      <DispatchPanel
        week={week}
        items={items}
        defaultTemplate={DEFAULT_TEMPLATE}
        providerName={provider.name}
        manual={provider.manual}
      />
    </div>
  );
}
