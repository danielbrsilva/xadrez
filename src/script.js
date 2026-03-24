const tabuleiro = document.getElementById("tabuleiro");

function criarTabuleiro() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
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

