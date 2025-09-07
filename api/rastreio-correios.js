const token = (process.env.CORREIOS_API_TOKEN || "").trim();
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

// tenta as duas rotas conhecidas
const endpoints = [
  `https://api.correios.com.br/rastreamento/v1/objetos/${code}`,
  `https://api.correios.com.br/sro-rastro/v1/objetos/${code}`
];

let resp, text;
for (const url of endpoints) {
  try {
    const r = await fetch(url, { headers });
    text = await r.text().catch(() => "");
    if (r.ok) {
      resp = { ok: true, json: JSON.parse(text) };
      break;
    }
    // se serviço inexistente (GTM-003) ou 404, tenta próximo endpoint
    if (text.includes("GTM-003") || r.status === 404) {
      continue;
    }
    // outros erros: devolve direto
    return res.status(r.status).json({ ok: false, error: "Erro Correios", detail: text });
  } catch (e) {
    // erro de rede: tenta o próximo
    continue;
  }
}

if (!resp) {
  return res.status(502).json({
    ok: false,
    error: "Serviço de rastreio indisponível para este token",
    detail: "Nenhuma das rotas conhecidas respondeu"
  });
}

const data = resp.json;
const obj = data?.objetos?.[0] || {};
const raw = obj.evento || obj.eventos || [];

const eventos = raw.map(ev => ({
  data: ev.dtHrCriado || ev.data || null,
  status: ev.descricao || ev.status || "Atualização",
  local: ev.unidade?.nome || ev.local || null,
  destino: ev.unidadeDestino?.nome || ev.destino || null,
  detalhe: ev.detalhe || ev.observacao || null
}));

return res.status(200).json({ ok: true, code, eventos });
