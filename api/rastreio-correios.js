// /api/rastreio-correios.js
export default async function handler(req, res) {
  // CORS básico (ajuste para seu domínio depois que testar)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const code = (req.query.code || "").toString().trim().toUpperCase();
    if (!/^[A-Z]{2}\d{9}BR$/.test(code)) {
      return res.status(400).json({ ok: false, error: "Código inválido. Use AA123456789BR." });
    }

    const token = process.env.CORREIOS_API_TOKEN;
    if (!token) {
      return res.status(500).json({ ok: false, error: "Token não configurado." });
    }

    const url = `https://api.correios.com.br/rastreamento/v1/objetos/${code}`;
    const r = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(r.status).json({ ok: false, error: "Erro Correios", detail: txt });
    }

    const data = await r.json();
    const obj = data?.objetos?.[0] || {};
    const eventosRaw = obj.evento || obj.eventos || [];

    const eventos = eventosRaw.map(ev => ({
      data: ev.dtHrCriado || ev.data || null,
      status: ev.descricao || ev.status || "Atualização",
      local: ev.unidade?.nome || ev.local || null,
      destino: ev.unidadeDestino?.nome || ev.destino || null,
      detalhe: ev.detalhe || ev.observacao || null
    }));

    return res.status(200).json({ ok: true, code, eventos });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
