const express = require('express');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', async (req, res) => {
  const cepDestino = req.query.cep;
  const cepOrigem = '08674090';

  // Validação do CEP de destino
  if (!cepDestino) {
    return res.status(400).json({ error: 'CEP de destino não informado' });
  }

  const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&nVlPeso=1&nCdFormato=1&sCepOrigem=${cepOrigem}&sCepDestino=${cepDestino}&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

  try {
    const response = await fetch(url);
    const xml = await response.text();

    xml2js.parseString(xml, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao processar resposta dos Correios', detalhe: err.message });
      }

      const servico = result?.Servicos?.cServico?.[0];

      if (!servico) {
        return res.status(500).json({ error: 'Erro ao interpretar a resposta dos Correios' });
      }

      const codigoErro = servico.Erro?.[0];
      const msgErro = servico.MsgErro?.[0];
      const valor = servico.Valor?.[0];

      if (codigoErro !== '0') {
        return res.status(400).json({
          error: 'Erro no cálculo de frete',
          codigo: codigoErro,
          mensagem: msgErro || 'Erro desconhecido'
        });
      }

      if (!valor) {
        return res.status(500).json({ error: 'Valor do frete não retornado' });
      }

      res.json({ valor });
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro interno ao consultar o frete', detalhe: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
