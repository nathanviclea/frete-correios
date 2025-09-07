// api/rastreio-correios.js
export default async function handler(req, res) {
  // Libera o uso da API de qualquer origem (CORS)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Captura o código enviado por query param
    const code = (req.query.code || "").toString().trim();

    // Valida formato padrão dos Correios: 2 letras + 9 números + BR
    if (!/^[A-Z]{2}\d{9}BR$/.test(code)) {
      return res.status(400).json({ ok: false, error: "Código inválido" });
    }

    // Faz requisição para a API oficial dos Correios
    const r = await fetch(`https://proxyapp.correios.com.br/v1/sro-rastro/${code}`, {
      headers: {
        "Authorization": `Bearer ${process.env.CORREIOS_API_TOKEN}`, // Token configurado no Vercel
        "Content-Type": "application/json"
      }
    });

    // Se a API dos Correios retornar erro
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(500).json({
        ok: false,
        error: "Erro Correios",
        detail: txt
      });
    }

    // Converte a resposta para JSON
    const data = await r.json();

    // Retorna sucesso
    return res.status(200).json({
      ok: true,
      data
    });

  } catch (err) {
    // Caso dê erro interno no servidor
    return res.status(500).json({
      ok: false,
      error: "Falha interna",
      detail: err.message
    });
  }
}
