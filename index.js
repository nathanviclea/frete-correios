const express = require("express");
const fetch = require("node-fetch");
const { parseStringPromise } = require("xml2js");

const app = express();
const PORT = process.env.PORT || 3000;

// CEP de origem da loja
const origem = "08674090";

app.get("/", async (req, res) => {
  const destino = req.query.cep?.trim(); // lê o parâmetro `cep` como destino

  if (!destino || destino.length !== 8) {
    return res.status(400).json({ error: "CEP de destino não informado ou inválido." });
  }

  const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&sCepOrigem=${origem}&sCepDestino=${destino}&nVlPeso=1&nCdFormato=1&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const xml = await response.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    const resultado = parsed?.Servicos?.cServico;

    if (!resultado || resultado.Erro !== "0") {
      return res.status(500).json({
        error: resultado?.MsgErro || "Erro ao consultar frete com os Correios."
      });
    }

    res.json({
      destino,
      valor: resultado.Valor,
      prazo: resultado.PrazoEntrega + " dias",
      codigo: resultado.Codigo
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: "Tempo de resposta dos Correios excedido." });
    }
    res.status(500).json({ error: "Erro interno ao consultar o frete." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
