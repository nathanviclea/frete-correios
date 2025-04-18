const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 10000;

const cepOrigem = "08674090"; // CEP da loja

app.get("/", async (req, res) => {
  const cepDestino = req.query.cep;

  if (!cepDestino) {
    return res.status(400).json({ error: "CEP de destino não informado" });
  }

  const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&sCepOrigem=${cepOrigem}&sCepDestino=${cepDestino}&nVlPeso=1&nCdFormato=1&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000); // 5 segundos

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    clearTimeout(timeoutId);

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

    if (!xml || xml.trim() === "") {
      return res.status(504).json({
        error: "Sem retorno da API dos Correios",
        motivo: "Resposta vazia",
        url,
        origem: cepOrigem,
        destino: cepDestino
      });
    }

    return res.type("application/xml").send(xml);

  } catch (err) {
    clearTimeout(timeoutId);

    let motivo = "Erro inesperado";
    if (err.name === "AbortError") motivo = "A API dos Correios não respondeu em 5 segundos";
    else if (err.code === "ENOTFOUND") motivo = "Endereço da API não encontrado";
    else motivo = err.message;

    return res.status(500).json({
      error: "Erro interno ao consultar o frete",
      motivo,
      url,
      origem: cepOrigem,
      destino: cepDestino
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
