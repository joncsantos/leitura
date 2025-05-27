// frontend/script.js

// ATENÇÃO: Esta URL será a URL do seu backend no Render após o deploy!
// Durante o desenvolvimento local, ela pode ser 'http://localhost:3000'
// Após o deploy no Render, ela será algo como 'https://seunome-leitura-api.onrender.com'
const API_BASE_URL = 'http://localhost:3000'; // <<<<<<< MUDAR ISSO APÓS O DEPLOY DO BACKEND NO RENDER!

document.addEventListener('DOMContentLoaded', () => {
    const formLivro = document.getElementById('form-livro');
    const livrosContainer = document.getElementById('livros-container');

    // Função para buscar e exibir os livros
    async function fetchLivros() {
        try {
            // Faz uma requisição GET para o endpoint de livros do seu backend
            const response = await fetch(`${API_BASE_URL}/api/livros`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const livros = await response.json();
            livrosContainer.innerHTML = ''; // Limpa antes de adicionar os livros atualizados

            if (livros.length === 0) {
                livrosContainer.innerHTML = '<p>Nenhum livro cadastrado. Adicione um para começar seu plano de leitura!</p>';
                return;
            }

            // Para cada livro retornado, cria um elemento HTML para exibi-lo
            livros.forEach(livro => {
                const livroElement = document.createElement('div');
                livroElement.classList.add('livro-item');

                const paginasFaltantes = livro.total_paginas - livro.pagina_atual;
                const progressoPorcentagem = (livro.pagina_atual / livro.total_paginas * 100).toFixed(2);
                // Define classes CSS baseadas no status para estilização visual
                const statusClass = livro.status === 'Concluído' ? 'concluido' : (livro.status === 'Lendo' ? 'lendo' : 'pendente');

                livroElement.innerHTML = `
                    <div>
                        <h3>${livro.titulo}</h3>
                        <p>Autor: ${livro.autor || 'N/A'}</p>
                        <p>Total de Páginas: ${livro.total_paginas}</p>
                        <p>Página Atual: <span id="pagina-atual-${livro.id}">${livro.pagina_atual}</span></p>
                        <p>Páginas Faltantes: <span id="paginas-faltantes-${livro.id}">${paginasFaltantes}</span></p>
                        <p>Progresso: <span id="progresso-${livro.id}">${progressoPorcentagem}%</span></p>
                        <p>Status: <span class="status ${statusClass}">${livro.status}</span></p>
                    </div>
                    <div class="progresso">
                        <label for="input-pagina-${livro.id}">Atualizar pág.:</label>
                        <input type="number" id="input-pagina-${livro.id}" min="0" max="${livro.total_paginas}" value="${livro.pagina_atual}">
                        <button onclick="atualizarPagina(${livro.id}, ${livro.total_paginas})">Atualizar</button>
                    </div>
                    <div class="botoes-acao">
                        <button onclick="marcarComoConcluido(${livro.id}, '${livro.status}', ${livro.total_paginas})">${livro.status === 'Concluído' ? 'Marcar como Não Concluído' : 'Marcar como Concluído'}</button>
                        <button class="deletar" onclick="deletarLivro(${livro.id})">Deletar</button>
                    </div>
                `;
                livrosContainer.appendChild(livroElement);
            });
        } catch (error) {
            console.error('Erro ao carregar livros:', error);
            livrosContainer.innerHTML = '<p>Erro ao carregar livros. Por favor, verifique a conexão com o servidor da API.</p>';
        }
    }

    // Event listener para o formulário de adicionar livro
    formLivro.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita o recarregamento da página padrão do formulário
        const titulo = document.getElementById('titulo').value.trim(); // .trim() remove espaços em branco
        const autor = document.getElementById('autor').value.trim();
        const totalPaginas = parseInt(document.getElementById('totalPaginas').value);

        if (!titulo || !totalPaginas) {
            alert('Por favor, preencha o título e o total de páginas do livro.');
            return;
        }
        if (totalPaginas <= 0) {
            alert('O total de páginas deve ser um número positivo.');
            return;
        }

        try {
            // Faz uma requisição POST para adicionar um novo livro
            const response = await fetch(`${API_BASE_URL}/api/livros`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ titulo, autor, total_paginas: totalPaginas }),
            });

            if (response.ok) {
                alert('Livro adicionado com sucesso!');
                formLivro.reset(); // Limpa o formulário
                fetchLivros(); // Recarrega a lista para mostrar o novo livro
            } else {
                const errorData = await response.json();
                alert(`Erro ao adicionar livro: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Erro ao adicionar livro:', error);
            alert('Erro ao adicionar livro. Verifique a conexão com a API.');
        }
    });

    // Função global para atualizar a página atual de um livro
    // 'window.' é usado para que a função seja acessível globalmente a partir do onclick no HTML
    window.atualizarPagina = async (id, totalPaginas) => {
        const inputPagina = document.getElementById(`input-pagina-${id}`);
        let novaPagina = parseInt(inputPagina.value);

        if (isNaN(novaPagina) || novaPagina < 0) {
            alert('Por favor, insira um número de página válido.');
            return;
        }
        if (novaPagina > totalPaginas) {
            novaPagina = totalPaginas; // Garante que a página atual não exceda o total
            inputPagina.value = totalPaginas; // Atualiza o input visualmente também
        }

        try {
            // Faz uma requisição PUT para atualizar o livro
            const response = await fetch(`${API_BASE_URL}/api/livros/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pagina_atual: novaPagina }),
            });

            if (response.ok) {
                const updatedLivro = await response.json();
                // Atualiza os valores diretamente no DOM para evitar recarregar tudo
                document.getElementById(`pagina-atual-${id}`).textContent = updatedLivro.pagina_atual;
                document.getElementById(`paginas-faltantes-${id}`).textContent = updatedLivro.total_paginas - updatedLivro.pagina_atual;
                const progresso = (updatedLivro.pagina_atual / updatedLivro.total_paginas * 100).toFixed(2);
                document.getElementById(`progresso-${id}`).textContent = `${progresso}%`;

                // Se o livro foi lido até o final, atualiza o status para "Concluído"
                if (updatedLivro.pagina_atual === updatedLivro.total_paginas && updatedLivro.status !== 'Concluído') {
                    await marcarComoConcluido(id, updatedLivro.status, updatedLivro.total_paginas);
                }
            } else {
                const errorData = await response.json();
                alert(`Erro ao atualizar página: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Erro ao atualizar página:', error);
            alert('Erro ao atualizar página. Verifique a conexão com a API.');
        }
    };

    // Função global para marcar/desmarcar livro como concluído
    window.marcarComoConcluido = async (id, currentStatus, totalPaginas) => {
        const novoStatus = currentStatus === 'Concluído' ? 'Lendo' : 'Concluído';
        // Se for marcar como Concluído, define a página atual para o total; caso contrário, mantém como 0 ou não envia
        const paginaParaEnviar = novoStatus === 'Concluído' ? totalPaginas : 0;

        try {
            const response = await fetch(`${API_BASE_URL}/api/livros/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: novoStatus, pagina_atual: paginaParaEnviar }),
            });
            if (response.ok) {
                fetchLivros(); // Recarrega a lista para que a interface reflita o novo status e página
            } else {
                const errorData = await response.json();
                alert(`Erro ao atualizar status: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert('Erro ao atualizar status. Verifique a conexão com a API.');
        }
    };

    // Função global para deletar um livro
    window.deletarLivro = async (id) => {
        if (!confirm('Tem certeza que deseja deletar este livro do seu plano de leitura?')) {
            return; // Usuário cancelou a operação
        }
        try {
            // Faz uma requisição DELETE para remover o livro
            const response = await fetch(`${API_BASE_URL}/api/livros/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                alert('Livro deletado com sucesso!');
                fetchLivros(); // Recarrega a lista para remover o livro deletado
            } else {
                const errorData = await response.json();
                alert(`Erro ao deletar livro: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error('Erro ao deletar livro:', error);
            alert('Erro ao deletar livro. Verifique a conexão com a API.');
        }
    };

    // Carrega os livros assim que a página é completamente carregada
    fetchLivros();
});