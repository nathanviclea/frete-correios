const express = require("express");
const fetch = require("node-fetch");
const { parseStringPromise } = require("xml2js");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const cep = req.query.cep;
  if (!cep) {
    return res.status(400).json({ error: "CEP não informado" });
  }

  const origem = "08674090"; // CEP da loja
  const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&sCepOrigem=${origem}&sCepDestino=${cep}&nVlPeso=1&nCdFormato=1&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

  try {
    const response = await fetch(url);
    const xml = await response.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    const resultado = parsed?.Servicos?.cServico;

    if (!resultado || resultado.Erro !== "0") {
      return res.status(500).json({ error: "Erro ao consultar o frete." });
    }

    res.json({
      valor: resultado.Valor,
      prazo: resultado.PrazoEntrega + " dias",
      codigo: resultado.Codigo
    });
  } catch (err) {
    console.error("Erro na requisição:", err.message);
    res.status(500).json({ error: "Erro interno ao consultar o frete." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
