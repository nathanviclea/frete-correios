const express = require('express');
const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', async (req, res) => {
  const destino = req.query.cep;
  const origem = '08674090'; // Fixo conforme informado

  if (!destino) {
    return res.status(400).json({ error: 'CEP de destino não informado.' });
  }

  const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?` +
    `nCdEmpresa=&sDsSenha=&nCdServico=04510&nVlPeso=1&nCdFormato=1` +
    `&sCepOrigem=${origem}&sCepDestino=${destino}` +
    `&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&` +
    `nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

  try {
    const response = await fetch(url);
    const xml = await response.text();
    const resultado = await parseStringPromise(xml);

    const valor = resultado?.Servicos?.cServico?.[0]?.Valor?.[0];

    if (valor && !valor.includes('Erro')) {
      return res.json({ valor });
    } else {
      return res.status(400).json({ error: 'Erro ao consultar o frete nos Correios.' });
    }
  } catch (error) {
    console.error('Erro ao buscar frete:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar o frete.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
