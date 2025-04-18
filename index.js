const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 10000;

const cepOrigem = "08674090"; // CEP fixo da loja

app.get("/", async (req, res) => {
  const cepDestino = req.query.cep;

  if (!cepDestino) {
    return res.status(400).json({ error: "CEP de destino não informado" });
  }

  const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&sCepOrigem=${cepOrigem}&sCepDestino=${cepDestino}&nVlPeso=1&nCdFormato=1&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5 segundos

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({
        error: "Erro na resposta da API dos Correios",
        status: response.status,
        url,
        origem: cepOrigem,
        destino: cepDestino
      });
    }

    const xml = await response.text();
    res.type("text/xml").send(xml);

  } catch (error) {
    let motivo = "Erro desconhecido";
    if (error.name === "AbortError") {
      motivo = "Timeout na API dos Correios";
    } else if (error.code === "ENOTFOUND") {
      motivo = "Endereço da API não encontrado";
    } else {
      motivo = error.message;
    }

    res.status(500).json({
      error: "Erro interno ao consultar o frete",
      motivo,
      url,
      origem: cepOrigem,
      destino: cepDestino
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
