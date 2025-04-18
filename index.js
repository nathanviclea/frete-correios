const express = require('express');
const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

const app = express();
const PORT = process.env.PORT || 3000;

const origem = '08674090';

app.get('/', async (req, res) => {
  const cep = req.query.cep;
  if (!cep) return res.status(400).json({ error: 'CEP não informado' });

  try {
    const url = \`https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&nVlPeso=1&nCdFormato=1&sCepOrigem=\${origem}&sCepDestino=\${cep}&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml\`;
    const response = await fetch(url);
    const xml = await response.text();
    const result = await parseStringPromise(xml);
    
    const servico = result?.Servicos?.cServico?.[0];
    if (servico?.Erro?.[0] !== '0') throw new Error(servico.MsgErro?.[0] || 'Erro no retorno dos Correios');

    res.json({
      valor: servico.Valor?.[0],
      prazo: servico.PrazoEntrega?.[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno ao consultar o frete.' });
  }
});

app.listen(PORT, () => {
  console.log(\`Servidor rodando na porta \${PORT}\`);
});