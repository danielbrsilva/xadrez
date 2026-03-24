const tabuleiro = document.getElementById("tabuleiro");

function criarTabuleiro() {
    for (let i = 0; i < 8; i++) { // Loop para criar as linhas do tabuleiro
        for (let j = 0; j < 8; j++) { // Loop para criar as colunas do tabuleiro
            const casa = document.createElement("div"); // Criando um elemento div para cada casa do tabuleiro
            casa.classList.add("casa"); // Adicionando a classe "casa" para estilização
            const letra = String.fromCharCode(64 + i + 1); // Convertendo número para letra (A-H)
            casa.id = `${letra}${8 - j}`; // Colocando o ID na casa (Exemplo: A1, B2, etc.)
            if ((i + j) % 2 === 0) {
                casa.classList.add("casa_clara"); // Adicionando a classe "casa_clara" para casas claras
            } else {
                casa.classList.add("casa_escura"); // Adicionando a classe "casa_escura" para casas escuras
            }
            tabuleiro.appendChild(casa); // Adicionando a casa ao tabuleiro
        }
    }
}

criarTabuleiro();

const pecas = {
    K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟",
    k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
}; // Mapeamento das peças para os caracteres correspondentes

let pecas_tabuleiro = [
    ["r","n","b","q","k","b","n","r"],
    ["p","p","p","p","p","p","p","p"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["P","P","P","P","P","P","P","P"],
    ["R","N","B","Q","K","B","N","R"]
]; // Representação do tabuleiro com as peças em suas posições iniciais

function desenharPecas() {
    for (let i = 0; i < 8; i++) { // Loop para percorrer as linhas do tabuleiro
        for (let j = 0; j < 8; j++) { // Loop para percorrer as colunas do tabuleiro

            const letra = String.fromCharCode(64 + i + 1); // Convertendo número para letra (A-H)
            const id = `${letra}${8 - j}`; // Gerando o ID da casa com base na letra e número (Exemplo: A1, B2, etc.)

            const casa = document.getElementById(id); // Obtendo a casa do tabuleiro usando o ID gerado

            casa.innerHTML = ""; // Limpando o conteúdo da casa antes de desenhar a peça

            const peca = pecas_tabuleiro[i][j]; // Obtendo a peça correspondente à posição atual do tabuleiro

            if (peca !== "") { // Verificando se há uma peça na posição atual

                const span = document.createElement("span"); // Criando um elemento span para representar a peça
                span.textContent = pecas[peca]; // Definindo o conteúdo do span como o caractere correspondente à peça usando o mapeamento definido anteriormente

                // cor da peça
                if (peca === peca.toUpperCase()) {
                    span.classList.add("peca_branca"); // Adicionando a classe "peca_branca" para peças brancas
                } else {
                    span.classList.add("peca_preta"); // Adicionando a classe "peca_preta" para peças pretas
                }

                casa.appendChild(span); // Adicionando o span da peça à casa correspondente no tabuleiro
            }
        }
    }
}

desenharPecas();