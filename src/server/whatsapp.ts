/**
 * Adaptador de WhatsApp.
 *
 * O Módulo 1 entrega a geração dos links, a fila semanal e a tela de envio.
 * A integração com um provedor real fica atrás desta interface — trocar de
 * provedor é trocar a variável WHATSAPP_PROVIDER, sem tocar no resto do app.
 */

export type SendResult =
  | { ok: true; ref: string | null; manual?: boolean }
  | { ok: false; error: string };

export interface WhatsAppProvider {
  readonly name: string;
  /** true quando o envio depende de um clique humano (link wa.me). */
  readonly manual: boolean;
  send(phone: string, message: string): Promise<SendResult>;
}

/** Normaliza para o formato E.164 sem "+", assumindo Brasil quando faltar DDI. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function waMeLink(phone: string | null, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** Padrão do Módulo 1: a fila é montada e o coach dispara pelo link wa.me. */
const manualProvider: WhatsAppProvider = {
  name: "manual",
  manual: true,
  async send(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return { ok: false, error: "Telefone inválido ou ausente." };
    return { ok: true, ref: null, manual: true };
  },
};

/** Evolution API / Z-API — habilita definindo WHATSAPP_API_URL e o token. */
const evolutionProvider: WhatsAppProvider = {
  name: "evolution",
  manual: false,
  async send(phone, message) {
    const url = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_API_TOKEN;
    const instance = process.env.WHATSAPP_INSTANCE ?? "";
    const normalized = normalizePhone(phone);
    if (!url || !token) return { ok: false, error: "Provedor não configurado." };
    if (!normalized) return { ok: false, error: "Telefone inválido ou ausente." };

    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/message/sendText/${instance}`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: token },
        body: JSON.stringify({ number: normalized, text: message }),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = (await res.json().catch(() => ({}))) as { key?: { id?: string } };
      return { ok: true, ref: data?.key?.id ?? null };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};

/** WhatsApp Cloud API (Meta). Requer template aprovado para iniciar conversa. */
const cloudProvider: WhatsAppProvider = {
  name: "cloud",
  manual: false,
  async send(phone, message) {
    const url = process.env.WHATSAPP_API_URL; // .../v21.0/<phone_number_id>/messages
    const token = process.env.WHATSAPP_API_TOKEN;
    const normalized = normalizePhone(phone);
    if (!url || !token) return { ok: false, error: "Provedor não configurado." };
    if (!normalized) return { ok: false, error: "Telefone inválido ou ausente." };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalized,
          type: "text",
          text: { body: message },
        }),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = (await res.json().catch(() => ({}))) as {
        messages?: { id?: string }[];
      };
      return { ok: true, ref: data?.messages?.[0]?.id ?? null };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};

export function whatsappProvider(): WhatsAppProvider {
  switch (process.env.WHATSAPP_PROVIDER) {
    case "evolution":
      return evolutionProvider;
    case "cloud":
      return cloudProvider;
    default:
      return manualProvider;
  }
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function checkinLink(token: string): string {
  return `${appUrl()}/checkin/${token}`;
}

export function panelLink(token: string): string {
  return `${appUrl()}/aluno/${token}`;
}

/** Mensagem semanal padrão. {nome} e {link} são substituídos por aluno. */
export const DEFAULT_TEMPLATE =
  "Fala {nome}! 💪\n\nHora do check-in da semana na FF Consultoria.\n" +
  "Leva menos de 2 minutos e é com ele que eu ajusto teu treino:\n\n{link}\n\n" +
  "Bora! — Fábio";

export function renderTemplate(
  template: string,
  vars: { nome: string; link: string; painel?: string }
): string {
  return template
    .replaceAll("{nome}", vars.nome.split(" ")[0])
    .replaceAll("{nome_completo}", vars.nome)
    .replaceAll("{link}", vars.link)
    .replaceAll("{painel}", vars.painel ?? "");
}
