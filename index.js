const express = require("express");
const fetch = require("node-fetch");
const { URLSearchParams } = require("url");
const AbortController = require("abort-controller");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const cep = req.query.cep;

  if (!cep) {
    return res.status(400).json({ error: "CEP não informado" });
  }

  const params = new URLSearchParams({
    nCdEmpresa: "",
    sDsSenha: "",
    nCdServico: "04510", // PAC (use 04014 para SEDEX)
    sCepOrigem: "08674090", // CEP da loja
    sCepDestino: cep,
    nVlPeso: "1",
    nCdFormato: "1",
    nVlComprimento: "20",
    nVlAltura: "5",
    nVlLargura: "15",
    nVlDiametro: "0",
    sCdMaoPropria: "n",
    nVlValorDeclarado: "0",
    sCdAvisoRecebimento: "n",
    StrRetorno: "xml",
  });

  const url = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const xml = await response.text();

    const valorMatch = xml.match(/<Valor>(.*?)<\/Valor>/);
    const prazoMatch = xml.match(/<PrazoEntrega>(.*?)<\/PrazoEntrega>/);

    if (valorMatch && prazoMatch) {
      return res.json({
        valor: valorMatch[1].replace(",", "."),
        prazo: prazoMatch[1],
      });
    } else {
      return res.status(500).json({ error: "Erro ao consultar o frete." });
    }
  } catch (err) {
    return res.status(500).json({ error: "Erro interno ao consultar o frete." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
