

const tabuleiro = document.getElementById("tabuleiro");

function criarTabuleiro() {
    for (let i = 0; i < 8; i++) { // Loop para criar as linhas do tabuleiro
        for (let j = 0; j < 8; j++) { // Loop para criar as colunas do tabuleiro
            console.log("Adicionando o tabuleiro", i, j); // Imprimindo no console a posição da casa que está sendo adicionada ao tabuleiro (coordenadas i e j)
            const casa = document.createElement("div"); // Criando um elemento div para cada casa do tabuleiro
            casa.classList.add("casa"); // Adicionando a classe "casa" para estilização
            const letra = String.fromCharCode(65 + j); // Convertendo número para letra (A-H)
            casa.id = `${letra}${8 - i}`; // Colocando o ID na casa (Exemplo: A1, B2, etc.)
            if ((i + j) % 2 === 0) {
                casa.classList.add("casa_clara"); // Adicionando a classe "casa_clara" para casas claras
            } else {
                casa.classList.add("casa_escura"); // Adicionando a classe "casa_escura" para casas escuras
            }

            tabuleiro.appendChild(casa); // Adicionando a casa ao tabuleiro
            
            casa.addEventListener("click", () => {
                cliqueCasa(i, j);
            }); // Adicionando um evento de clique para cada casa, passando as coordenadas i e j
        }
    }
}

criarTabuleiro(); // Chamando a função para criar o tabuleiro

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

function nomeDaPeça(peca) { // Função para obter o nome da peça com base no caractere da peça, usando um switch case para mapear cada caractere para o nome correspondente da peça (Exemplo: "K" para "Rei das brancas", "q" para "Rainha das pretas", etc.)
    switch (peca) {
        case "K":
            return "Rei das brancas";
        case "Q":
            return "Rainha das brancas";
        case "R":
            return "Torre das brancas";
        case "B":
            return "Bispo das brancas";
        case "N":
            return "Cavalo das brancas";
        case "P":
            return "Peão das brancas";
        case "k":
            return "Rei das pretas";
        case "q":
            return "Rainha das pretas";
        case "r":
            return "Torre das pretas";
        case "b":
            return "Bispo das pretas";
        case "n":
            return "Cavalo das pretas";
        case "p":
            return "Peão das pretas";
        default:
            return "";
    }
}

function desenharPecas() {
    for (let i = 0; i < 8; i++) { // Loop para percorrer as linhas do tabuleiro
        for (let j = 0; j < 8; j++) { // Loop para percorrer as colunas do tabuleiro

            const letra = String.fromCharCode(65 + j); // Convertendo número para letra (A-H)
            const id = `${letra}${8 - i}`; // Gerando o ID da casa com base na letra e número (Exemplo: A1, B2, etc.)

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

let selecionada = null; // Variável para armazenar a posição da peça selecionada, inicialmente definida como null (nenhuma peça selecionada)

function cliqueCasa(i, j) { // Função para lidar com o clique em uma casa do tabuleiro, recebendo as coordenadas i e j da casa clicada
    const letra = String.fromCharCode(65 + j); // Convertendo número para letra (A-H) com base na coordenada j
    console.log("Casa:", `${letra}${8 - i}`); // Imprimindo no console a casa clicada usando o formato de letra e número (Exemplo: A1, B2, etc.)
    const pecaAtual = pecas_tabuleiro[i][j]; // Obtendo a peça atual na posição clicada do tabuleiro usando as coordenadas i e j
    if (selecionada === null) { // Verificando se nenhuma peça está atualmente selecionada (selecionada é null)
        if (pecaAtual !== "") { // Verificando se há uma peça na posição clicada (pecaAtual não é uma string vazia)
            selecionada = { i, j }; // Armazenando as coordenadas da peça selecionada em um objeto com as propriedades i e j
            console.log("Selecionou: ", nomeDaPeça(pecaAtual)); // Imprimindo no console a peça que foi selecionada
        }
        return; // Retornando para sair da função, pois a seleção foi feita e não há necessidade de continuar com o restante do código
    }

    const origem = selecionada; // Armazenando as coordenadas da peça selecionada em uma variável chamada origem para facilitar o acesso

    if (origem.i === i && origem.j === j) { // Verificando se a casa clicada é a mesma da peça selecionada (origem)
        console.log("Deselecionou"); // Imprimindo no console que a peça foi desselecionada
        selecionada = null; // Definindo selecionada como null para indicar que nenhuma peça está mais selecionada
        return; // Retornando para sair da função, pois a peça foi desselecionada e não há necessidade de continuar com o restante do código
    }

    const pecaOrigem = pecas_tabuleiro[origem.i][origem.j]; // Obtendo a peça que está na posição de origem (a peça selecionada) usando as coordenadas armazenadas em origem
    pecas_tabuleiro[i][j] = pecaOrigem; // Movendo a peça da posição de origem para a posição clicada (destino) no tabuleiro, atualizando o array pecas_tabuleiro com a nova posição da peça
    pecas_tabuleiro[origem.i][origem.j] = ""; // Limpando a posição de origem no tabuleiro, definindo-a como uma string vazia para indicar que não há mais uma peça nessa posição

    selecionada = null; // Definindo selecionada como null para indicar que nenhuma peça está mais selecionada após o movimento

    desenharPecas(); // Chamando a função desenharPecas para atualizar a visualização do tabuleiro com as novas posições das peças após o movimento
}