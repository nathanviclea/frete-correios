// api/rastreio-correios.js
export default async function handler(req, res) {
  // CORS p/ Shopify
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const code = String(req.query.code || "").trim().toUpperCase();
    if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
      return res.status(400).json({ ok: false, error: "Código inválido" });
    }

    const token = process.env.CORREIOS_API_TOKEN;
    if (!token) {
      return res.status(500).json({ ok: false, error: "CORREIOS_API_TOKEN não configurado" });
    }

    // Possíveis bases utilizadas pelos Correios conforme contrato
    const bases = [
      "https://api.correios.com.br/sro-rastro/v1/objetos",
      "https://api.correios.com.br/srorastro/v1/objetos",
      "https://api.correios.com.br/rastreio/v1/objetos",
      "https://api.correios.com.br/rastro/v1/objetos",
      "https://api.correios.com.br/sro/v1/objetos"
    ];

    const headers = { Authorization: `Bearer ${token}` };
    const tentativas = [];
    let ultimaRespostaTexto = "";
    let ultimaStatus = 0;

    for (const base of bases) {
      // 1) TENTA GET .../objetos/{code}
      try {
        const urlGet = `${base}/${encodeURIComponent(code)}`;
        const rGet = await fetch(urlGet, { headers });
        ultimaStatus = rGet.status;
        const txt = await rGet.text().catch(() => "");
        ultimaRespostaTexto = txt;

        if (rGet.ok) {
          let data = null;
          try { data = JSON.parse(txt); } catch { data = txt; }
          return res.status(200).json({ ok: true, code, endpoint: urlGet, data });
        }

        // Se for permissão/token, não adianta testar outras bases
        if (rGet.status === 401 || rGet.status === 403) {
          return res.status(502).json({
            ok: false,
            error: "Erro Correios (auth)",
            status: rGet.status,
            hint: "Verifique: token de PRODUÇÃO, escopo de rastreamento e whitelist de IP da Vercel.",
            detail: txt
          });
        }

        tentativas.push({ metodo: "GET", base, status: rGet.status, detail: txt });
      } catch (e) {
        tentativas.push({ metodo: "GET", base, erro: String(e) });
      }

      // 2) TENTA POST .../objetos  { objetos: [code] }
      try {
        const urlPost = base;
        const rPost = await fetch(urlPost, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ objetos: [code] })
        });
        ultimaStatus = rPost.status;
        const txt = await rPost.text().catch(() => "");
        ultimaRespostaTexto = txt;

        if (rPost.ok) {
          let data = null;
          try { data = JSON.parse(txt); } catch { data = txt; }
          return res.status(200).json({ ok: true, code, endpoint: `${urlPost} (POST)`, data });
        }

        if (rPost.status === 401 || rPost.status === 403) {
          return res.status(502).json({
            ok: false,
            error: "Erro Correios (auth)",
            status: rPost.status,
            hint: "Verifique: token de PRODUÇÃO, escopo de rastreamento e whitelist de IP da Vercel.",
            detail: txt
          });
        }

        tentativas.push({ metodo: "POST", base, status: rPost.status, detail: txt });
      } catch (e) {
        tentativas.push({ metodo: "POST", base, erro: String(e) });
      }
    }

    // Nada funcionou
    return res.status(502).json({
      ok: false,
      error: "Nenhum endpoint aceitou a solicitação (serviço inexistente)",
      lastStatus: ultimaStatus,
      lastDetail: ultimaRespostaTexto,
      tentativas
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: "Falha interna", detail: String(err?.message || err) });
  }
}
