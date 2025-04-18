const express = require("express");
const fetch = require("node-fetch");

const app = express();

app.get("/", async (req, res) => {
  const cep = req.query.cep;
  if (!cep) {
    return res.status(400).json({ error: "CEP não informado" });
  }

  const params = new URLSearchParams({
    nCdEmpresa: "",
    sDsSenha: "",
    nCdServico: "04510", // PAC
    sCepOrigem: "08674090",
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
    StrRetorno: "xml"
  });

  try {
    const response = await fetch(`http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?${params}`);
    const xml = await response.text();

    const valorMatch = xml.match(/<Valor>(.*?)<\/Valor>/);
    const prazoMatch = xml.match(/<PrazoEntrega>(.*?)<\/PrazoEntrega>/);

    if (valorMatch && prazoMatch) {
      res.json({
        valor: valorMatch[1].replace(",", "."),
        prazo: prazoMatch[1]
      });
    } else {
      res.status(500).json({ error: "Erro ao consultar o frete." });
    }
  } catch (err) {
    res.status(500).json({ error: "Erro interno ao consultar o frete." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
