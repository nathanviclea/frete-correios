export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const code = (req.query.code || "").toString().trim().toUpperCase();

    if (!/^[A-Z]{2}\d{9}BR$/.test(code)) {
      return res.status(400).json({ ok: false, error: "Código inválido" });
    }

    const token = process.env.CORREIOS_API_TOKEN;
    if (!token) {
      return res.status(500).json({ ok: false, error: "Token ausente no servidor" });
    }

    // 1) Endpoint OFICIAL (ajuste se seu contrato indicar outro base path)
    const oficialUrl = `https://api.correios.com.br/srorastro/v1/objetos/${code}`;

    const r1 = await fetch(oficialUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "User-Agent": "Surfinn-Rastreio/1.0" // identifique seu app, alguns backends validam
      }
    });

    if (r1.ok) {
      const data = await r1.json().catch(() => null);
      return res.status(200).json({ ok: true, fonte: "oficial", data });
    }

    // Coleta o texto de erro para depuração
    const errTxt = await r1.text().catch(() => "");
    if (r1.status === 403) {
      return res.status(403).json({
        ok: false,
        error: "Forbidden (Correios)",
        hint: "Verifique escopo/permisoes do token, endpoint/ambiente EXATO do contrato e se há whitelist de IP.",
        endpoint: oficialUrl,
        detail: errTxt
      });
    }

    // (Opcional) 2) Fallback público SEM token — use somente se for aceitável
    // Descomente se quiser testar:
    // const publicoUrl = `https://proxyapp.correios.com.br/v1/sro-rastro?objetos=${code}`;
    // const r2 = await fetch(publicoUrl, { headers: { "Accept": "application/json" }});
    // if (r2.ok) {
    //   const data2 = await r2.json().catch(() => null);
    //   return res.status(200).json({ ok: true, fonte: "publico", data: data2 });
    // }
    // const errTxt2 = await r2.text().catch(() => "");
    // return res.status(502).json({ ok: false, error: "Falha no fallback", detail: errTxt2 });

    // Se chegou aqui, é erro no oficial e fallback desativado:
    return res.status(r1.status || 500).json({
      ok: false,
      error: "Erro Correios (oficial)",
      status: r1.status,
      endpoint: oficialUrl,
      detail: errTxt
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Falha interna",
      detail: err?.message || String(err)
    });
  }
}
