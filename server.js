const express = require('express');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const url = 'mongodb://127.0.0.1:27017';
const nomeBanco = 'manutencao';
const client = new MongoClient(url);

app.use(express.urlencoded({ extended: true }));
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});

function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function paginaCadastro(mensagem) {
  const arquivo = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(arquivo, 'utf8');
  let bloco = '<p id="mensagem"></p>';
  if (mensagem) {
    const classe = mensagem.startsWith('Erro') ? 'erro' : 'sucesso';
    bloco = `<p id="mensagem" class="${classe}">${escapar(mensagem)}</p>`;
  }
  html = html.replace('<p id="mensagem"></p>', bloco);
  return html;
}

app.get('/', (req, res) => {
  res.send(paginaCadastro(''));
});

app.post('/cadastrar', async (req, res) => {
  const nome = (req.body.nome || '').trim();
  const fabricante = (req.body.fabricante || '').trim();
  const categoria = (req.body.categoria || '').trim();
  const preco = Number(req.body.preco);

  if (!nome || !fabricante || !categoria || Number.isNaN(preco) || preco <= 0) {
    res.send(paginaCadastro('Erro: preencha todos os campos e informe um preço maior que zero.'));
    return;
  }

  try {
    const colecao = client.db(nomeBanco).collection('equipamentos');
    await colecao.insertOne({
      nome,
      fabricante,
      categoria,
      preco
    });
    res.send(paginaCadastro('Equipamento cadastrado com sucesso.'));
  } catch (erro) {
    res.send(paginaCadastro('Erro ao cadastrar o equipamento.'));
  }
});

app.get('/equipamentos', async (req, res) => {
  try {
    const colecao = client.db(nomeBanco).collection('equipamentos');
    const equipamentos = await colecao.find().toArray();

    let itens = '';
    for (const item of equipamentos) {
      itens += '<li>'
        + 'Nome: ' + escapar(item.nome)
        + ' | Fabricante: ' + escapar(item.fabricante)
        + ' | Categoria: ' + escapar(item.categoria)
        + ' | Preço: R$ ' + escapar(item.preco)
        + '</li>';
    }

    const lista = equipamentos.length === 0
      ? '<p>Nenhum equipamento cadastrado.</p>'
      : '<ul>' + itens + '</ul>';

    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Equipamentos cadastrados</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main>
    <h1>Equipamentos cadastrados</h1>
    ${lista}
    <p><a href="/">Voltar ao cadastro</a></p>
  </main>
</body>
</html>`);
  } catch (erro) {
    res.send('Erro ao consultar os equipamentos.');
  }
});

async function iniciar() {
  await client.connect();
  app.listen(PORT, () => {
    console.log('Servidor em http://localhost:' + PORT);
  });
}

iniciar();
