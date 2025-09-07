export default async function handler(req, res) {
  // CORS para poder chamar do Shopify
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const code = String(req.query.code || "").trim().toUpperCase();

    // Aceita códigos tipo AB123456789BR (ou qualquer 2 letras + 9 dígitos + 2 letras)
    if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
      return res.status(400).json({ ok: false, error: "Código inválido" });
    }

    const token = process.env.CORREIOS_API_TOKEN;
    if (!token) {
      return res.status(500).json({ ok: false, error: "CORREIOS_API_TOKEN não configurado." });
    }

    // Endpoint de produção dos Correios (SRRO / Rastreamento)
    // Caso seu contrato use outro caminho, me diga e eu ajusto.
    const url = `https://api.correios.com.br/srro/rastreamento/v1/objetos/${encodeURIComponent(code)}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const text = await r.text().catch(() => "");

    // Tratamento de erros mais comuns
    if (!r.ok) {
      // 401/403 são quase sempre: token inválido / escopo / IP whitelist
      const status = r.status;
      let dica = undefined;
      if (status === 401 || status === 403) {
        dica = "Verifique: token do ambiente de PRODUÇÃO, escopo ‘rastreio’ e se existe whitelist de IP (inclua o IP da Vercel).";
      }
      return res.status(502).json({
        ok: false,
        error: "Erro Correios",
        status,
        detail: text,
        hint: dica
      });
    }

    // Se for JSON válido, retorna normal
    let data = null;
    try { data = JSON.parse(text); } catch { /* as vezes vem texto */ }

    return res.status(200).json({ ok: true, code, data: data ?? text });

  } catch (err) {
    return res.status(500).json({ ok: false, error: "Falha interna", detail: String(err?.message || err) });
  }
}
