const express = require('express');
const fetch = require('node-fetch');
const { parseString } = require('xml2js');
const AbortController = require('abort-controller');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', async (req, res) => {
  const cepDestino = req.query.cep;
  const cepOrigem = '08674090'; // CEP fixo da loja

  if (!cepDestino) {
    return res.status(400).json({ error: 'CEP de destino não informado' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&nCdServico=04510&sCepOrigem=${cepOrigem}&sCepDestino=${cepDestino}&nVlPeso=1&nCdFormato=1&nVlComprimento=20&nVlAltura=5&nVlLargura=15&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const xml = await response.text();

    parseString(xml, (err, result) => {
      if (err) {
        console.error('[XML ERROR]', err);
        return res.status(500).json({ error: 'Erro ao interpretar resposta XML dos Correios' });
      }

      const servico = result?.Servicos?.cServico?.[0];

      if (!servico || servico.Erro[0] !== '0') {
        return res.status(400).json({
          error: 'Erro retornado pelos Correios',
          codigo: servico?.Erro?.[0],
          mensagem: servico?.MsgErro?.[0] || 'Erro desconhecido'
        });
      }

      res.json({
        valor: servico.Valor[0],
        prazo_entrega: servico.PrazoEntrega[0] + ' dias úteis',
        valor_sem_adicionais: servico.ValorSemAdicionais[0]
      });
    });

  } catch (error) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Tempo limite excedido na consulta aos Correios' });
    }

    console.error('[FATAL ERROR]', error.message);
    return res.status(500).json({ error: 'Erro interno ao consultar o frete', detalhe: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
