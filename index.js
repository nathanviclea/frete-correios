const express = require('express');
const fetch = require('node-fetch');
const app = express();

const PORT = process.env.PORT || 10000;
const cepOrigem = '08674090'; // CEP fixo da loja

app.get('/', async (req, res) => {
  const cepDestino = req.query.cep;

  if (!cepDestino) {
    return res.status(400).json({ error: 'CEP de destino não informado' });
  }

  const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&sCepOrigem=${cepOrigem}&sCepDestino=${cepDestino}&nVlPeso=1&nCdFormato=1&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

  try {
    const inicio = Date.now(); // Marca o início da consulta
    const response = await fetch(url, { timeout: 10000 }); // 10s de timeout

    const duracao = Date.now() - inicio; // Tempo da resposta

    if (!response.ok) {
      return res.status(502).json({
        error: 'Erro ao conectar com os Correios',
        status: response.status,
        tempoRespostaMs: duracao
      });
    }

    const xml = await response.text();

    if (!xml.includes('<Valor>')) {
      return res.status(500).json({
        error: 'Resposta inválida dos Correios. Verifique o CEP de destino.',
        tempoRespostaMs: duracao,
        resposta: xml
      });
    }

    const match = xml.match(/<Valor>(.*?)<\/Valor>/);
    const valor = match ? match[1] : null;

    res.json({
      sucesso: true,
      origem: cepOrigem,
      destino: cepDestino,
      valor,
      tempoRespostaMs: duracao
    });

  } catch (err) {
    res.status(500).json({
      error: 'Erro interno ao consultar o frete',
      motivo: err.type === 'request-timeout' ? 'Timeout na API dos Correios' : err.message,
      url,
      origem: cepOrigem,
      destino: cepDestino
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
