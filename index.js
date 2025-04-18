const express = require("express");
const fetch = require("node-fetch");
const app = express();

const PORT = process.env.PORT || 10000;

app.get("/", async (req, res) => {
  const cep = req.query.cep;

  if (!cep) {
    return res.status(400).json({ error: "CEP não informado" });
  }

  try {
    const origem = "08674090"; // CEP de origem fixo
    const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&sCepOrigem=${origem}&sCepDestino=${cep}&nVlPeso=1&nCdFormato=1&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

    const response = await fetch(url);
    const xml = await response.text();

    // Pega apenas o valor do frete no XML
    const match = xml.match(/<Valor>(.*?)<\/Valor>/);

    if (match && match[1]) {
      return res.json({ frete: match[1] });
    } else {
      return res.status(500).json({ error: "Não foi possível calcular o frete." });
    }
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao consultar o frete." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
