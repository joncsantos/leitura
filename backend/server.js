// backend/server.js
require('dotenv').config(); // Carrega as variáveis de ambiente do .env

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors'); // Importe o pacote cors

const app = express();
const port = process.env.PORT || 3000;

// Configuração do pool de conexão com o PostgreSQL do Supabase
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false // Necessário para conexões SSL com Supabase (pode ser true em produção se você tiver um certificado)
    }
});

// Middleware para permitir requisições de diferentes origens (CORS)
app.use(cors());

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

// --- ROTAS DA API ---

// Rota para obter todos os livros
app.get('/api/livros', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM livros ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar livros:', err);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// Rota para adicionar um novo livro
app.post('/api/livros', async (req, res) => {
    const { titulo, autor, total_paginas } = req.body;
    if (!titulo || !total_paginas) {
        return res.status(400).json({ error: 'Título e total de páginas são obrigatórios.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO livros (titulo, autor, total_paginas) VALUES ($1, $2, $3) RETURNING *',
            [titulo, autor, total_paginas]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao adicionar livro:', err);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// Rota para atualizar um livro (ex: página atual, status)
app.put('/api/livros/:id', async (req, res) => {
    const { id } = req.params;
    const { pagina_atual, status } = req.body;

    try {
        let query = 'UPDATE livros SET ';
        const params = [];
        let paramIndex = 1;

        if (pagina_atual !== undefined) {
            query += `pagina_atual = $${paramIndex++}, `;
            params.push(pagina_atual);
        }
        if (status !== undefined) {
            query += `status = $${paramIndex++}, `;
            params.push(status);
            if (status === 'Concluído') {
                query += `data_conclusao = CURRENT_DATE, `;
            } else {
                query += `data_conclusao = NULL, `;
            }
        }

        query = query.slice(0, -2); // Remove a última vírgula e espaço
        query += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar livro:', err);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
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
        res.json({ message: 'Livro deletado com sucesso!' });
    } catch (err) {
        console.error('Erro ao deletar livro:', err);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
});

// Rota padrão para verificar se o servidor está funcionando
app.get('/', (req, res) => {
    res.send('API de Leitura funcionando!');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});