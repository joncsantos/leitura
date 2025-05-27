// backend/server.js
// Carrega as variáveis de ambiente do arquivo .env localmente
// No Render, essas variáveis são injetadas diretamente, então o .env não é enviado
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors'); // Importe o pacote cors para Cross-Origin Resource Sharing

const app = express();
// A porta é definida pelo ambiente (Render) ou 3000 se rodando localmente
const port = process.env.PORT || 3000;

// Configuração do pool de conexão com o PostgreSQL.
// As credenciais são lidas das variáveis de ambiente.
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // Configuração SSL para conectar ao Supabase.
    // rejectUnauthorized: false é frequentemente necessário em ambientes de nuvem.
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware para permitir requisições de diferentes origens (CORS)
// Isso é essencial para que seu frontend (em um domínio) se comunique com seu backend (em outro domínio)
app.use(cors());

// Middleware para parsear o corpo das requisições como JSON
app.use(express.json());

// --- ROTAS DA API ---

// Rota de teste para verificar se o servidor está online
app.get('/', (req, res) => {
    res.send('API de Leitura funcionando!');
});

// Rota para obter todos os livros
app.get('/api/livros', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM livros ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar livros:', err);
        // Retorna um erro 500 com detalhes para facilitar a depuração no frontend
        res.status(500).json({ error: 'Erro interno do servidor ao buscar livros.', details: err.message });
    }
});

// Rota para adicionar um novo livro
app.post('/api/livros', async (req, res) => {
    const { titulo, autor, total_paginas } = req.body;

    // Validação básica dos campos obrigatórios
    if (!titulo || !total_paginas) {
        return res.status(400).json({ error: 'Título e total de páginas são obrigatórios.' });
    }
    if (typeof total_paginas !== 'number' || total_paginas <= 0) {
        return res.status(400).json({ error: 'Total de páginas deve ser um número positivo.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO livros (titulo, autor, total_paginas) VALUES ($1, $2, $3) RETURNING *',
            [titulo, autor, total_paginas]
        );
        res.status(201).json(result.rows[0]); // Retorna o livro recém-criado
    } catch (err) {
        console.error('Erro ao adicionar livro:', err);
        res.status(500).json({ error: 'Erro interno do servidor ao adicionar livro.', details: err.message });
    }
});

// Rota para atualizar um livro (ex: página atual, status, etc.)
app.put('/api/livros/:id', async (req, res) => {
    const { id } = req.params;
    const { pagina_atual, status } = req.body;

    // Constrói a query de forma dinâmica para atualizar apenas os campos fornecidos
    let query = 'UPDATE livros SET ';
    const params = [];
    let paramIndex = 1;
    const updates = [];

    if (pagina_atual !== undefined) {
        // Validação da página atual
        if (typeof pagina_atual !== 'number' || pagina_atual < 0) {
            return res.status(400).json({ error: 'Página atual deve ser um número não negativo.' });
        }
        updates.push(`pagina_atual = $${paramIndex++}`);
        params.push(pagina_atual);
    }
    if (status !== undefined) {
        // Validação do status
        const validStatus = ['Lendo', 'Concluído', 'Pendente'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ error: `Status inválido. Use um dos: ${validStatus.join(', ')}.` });
        }
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
        // Atualiza a data de conclusão se o status for 'Concluído'
        if (status === 'Concluído') {
            updates.push(`data_conclusao = CURRENT_DATE`);
        } else {
            updates.push(`data_conclusao = NULL`); // Limpa a data se não estiver concluído
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido para atualização fornecido.' });
    }

    query += updates.join(', ') + ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id); // Adiciona o ID como o último parâmetro

    try {
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado.' });
        }
        res.json(result.rows[0]); // Retorna o livro atualizado
    } catch (err) {
        console.error('Erro ao atualizar livro:', err);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar livro.', details: err.message });
    }
});

// Rota para deletar um livro
app.delete('/api/livros/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM livros WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado.' });
        }
        res.json({ message: 'Livro deletado com sucesso!', deletedBook: result.rows[0] });
    } catch (err) {
        console.error('Erro ao deletar livro:', err);
        res.status(500).json({ error: 'Erro interno do servidor ao deletar livro.', details: err.message });
    }
});

// Inicia o servidor e escuta na porta definida
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    // Opcional: Testa a conexão com o banco de dados na inicialização
    pool.query('SELECT NOW()')
        .then(() => console.log('Conexão com o banco de dados PostgreSQL (Supabase) estabelecida com sucesso!'))
        .catch(err => console.error('Falha ao conectar com o banco de dados PostgreSQL (Supabase):', err));
});