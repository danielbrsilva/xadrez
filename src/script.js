// ============================================================
//  Xadrez — HTML + CSS + JS puro
//  Inclui: todas as peças, xeque, xeque-mate, afogamento e roque
// ============================================================

const PIECE_SYMBOLS = {
    K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
    k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

const INITIAL_BOARD = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

// Estado do jogo
let board;
let turno;        // 'branco' | 'preto'
let selecionada;  // [i, j] | null
let movimentosLegais; // [[i,j], ...]
let status;       // 'playing' | 'check' | 'checkmate' | 'stalemate'
let ultimoMovimento; // { de:[i,j], para:[i,j] } | null
let capturadas_brancas; // peças brancas capturadas pelas pretas
let capturadas_pretas;  // peças pretas capturadas pelas brancas
let historico;    // string[]
let direitosRoque; // { reiB, reiP, torreBA, torreBH, torrePA, torrePH }

// ============================================================
//  Lógica pura (sem DOM)
// ============================================================

function clonarTabuleiro(b) {
    return b.map(row => [...row]);
}

function eBranca(peca) {
    return peca !== "" && peca === peca.toUpperCase();
}

function corDa(peca) {
    if (peca === "") return null;
    return eBranca(peca) ? "branco" : "preto";
}

function movimentoPeao(b, fi, fj, ti, tj, peca) {
    const di = ti - fi, dj = tj - fj;
    if (peca === "P") {
        if (di === -1 && dj === 0 && b[ti][tj] === "") return true;
        if (fi === 6 && di === -2 && dj === 0 && b[fi - 1][fj] === "" && b[ti][tj] === "") return true;
        if (di === -1 && Math.abs(dj) === 1 && b[ti][tj] !== "") return true;
    } else {
        if (di === 1 && dj === 0 && b[ti][tj] === "") return true;
        if (fi === 1 && di === 2 && dj === 0 && b[fi + 1][fj] === "" && b[ti][tj] === "") return true;
        if (di === 1 && Math.abs(dj) === 1 && b[ti][tj] !== "") return true;
    }
    return false;
}

function movimentoTorre(b, fi, fj, ti, tj) {
    const di = ti - fi, dj = tj - fj;
    if ((di === 0 && dj === 0) || (di !== 0 && dj !== 0)) return false;
    const si = di === 0 ? 0 : di > 0 ? 1 : -1;
    const sj = dj === 0 ? 0 : dj > 0 ? 1 : -1;
    let i = fi + si, j = fj + sj;
    while (i !== ti || j !== tj) {
        if (b[i][j] !== "") return false;
        i += si; j += sj;
    }
    return true;
}

function movimentoCavalo(fi, fj, ti, tj) {
    const di = Math.abs(ti - fi), dj = Math.abs(tj - fj);
    return (di === 2 && dj === 1) || (di === 1 && dj === 2);
}

function movimentoBispo(b, fi, fj, ti, tj) {
    const di = ti - fi, dj = tj - fj;
    if (Math.abs(di) !== Math.abs(dj) || (di === 0 && dj === 0)) return false;
    const si = di > 0 ? 1 : -1;
    const sj = dj > 0 ? 1 : -1;
    let i = fi + si, j = fj + sj;
    while (i !== ti && j !== tj) {
        if (b[i][j] !== "") return false;
        i += si; j += sj;
    }
    return true;
}

function movimentoRei(fi, fj, ti, tj) {
    const di = Math.abs(ti - fi), dj = Math.abs(tj - fj);
    return di <= 1 && dj <= 1 && (di !== 0 || dj !== 0);
}

function movimentoValido(b, fi, fj, ti, tj, peca) {
    switch (peca.toLowerCase()) {
        case "p": return movimentoPeao(b, fi, fj, ti, tj, peca);
        case "r": return movimentoTorre(b, fi, fj, ti, tj);
        case "n": return movimentoCavalo(fi, fj, ti, tj);
        case "b": return movimentoBispo(b, fi, fj, ti, tj);
        case "q": return movimentoTorre(b, fi, fj, ti, tj) || movimentoBispo(b, fi, fj, ti, tj);
        case "k": return movimentoRei(fi, fj, ti, tj);
        default: return false;
    }
}

function encontrarRei(b, cor) {
    const rei = cor === "branco" ? "K" : "k";
    for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++)
            if (b[i][j] === rei) return [i, j];
    return null;
}

function podeSerAtacada(b, pi, pj, corAtacante) {
    for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
            const p = b[i][j];
            if (p === "" || corDa(p) !== corAtacante) continue;
            if (movimentoValido(b, i, j, pi, pj, p)) return true;
        }
    return false;
}

function estaEmXeque(b, cor) {
    const rei = encontrarRei(b, cor);
    if (!rei) return false;
    const oponente = cor === "branco" ? "preto" : "branco";
    return podeSerAtacada(b, rei[0], rei[1], oponente);
}

// Retorna casas de destino do roque para o rei (coluna 6 = kingside, coluna 2 = queenside)
function movimentosRoque(b, cor, direitos) {
    const movs = [];
    const linha = cor === "branco" ? 7 : 0;
    const reiMoveu = cor === "branco" ? !direitos.reiB : !direitos.reiP;
    if (reiMoveu) return movs;

    const oponente = cor === "branco" ? "preto" : "branco";
    // Rei não pode estar em xeque
    if (podeSerAtacada(b, linha, 4, oponente)) return movs;

    // Kingside (O-O)
    const torreH = cor === "branco" ? direitos.torreBH : direitos.torrePH;
    if (torreH && b[linha][5] === "" && b[linha][6] === "" &&
        !podeSerAtacada(b, linha, 5, oponente) &&
        !podeSerAtacada(b, linha, 6, oponente)) {
        movs.push([linha, 6]);
    }

    // Queenside (O-O-O)
    const torreA = cor === "branco" ? direitos.torreBA : direitos.torrePA;
    if (torreA && b[linha][1] === "" && b[linha][2] === "" && b[linha][3] === "" &&
        !podeSerAtacada(b, linha, 3, oponente) &&
        !podeSerAtacada(b, linha, 2, oponente)) {
        movs.push([linha, 2]);
    }

    return movs;
}

function getMovimentosLegais(b, fi, fj, peca, cor, direitos) {
    const movs = [];
    for (let ti = 0; ti < 8; ti++) {
        for (let tj = 0; tj < 8; tj++) {
            if (!movimentoValido(b, fi, fj, ti, tj, peca)) continue;
            const dest = b[ti][tj];
            if (dest !== "" && corDa(dest) === cor) continue;
            const next = clonarTabuleiro(b);
            next[ti][tj] = peca;
            next[fi][fj] = "";
            if (!estaEmXeque(next, cor)) movs.push([ti, tj]);
        }
    }
    if (peca === "K" || peca === "k") {
        movs.push(...movimentosRoque(b, cor, direitos));
    }
    return movs;
}

function temMovimentoLegal(b, cor, direitos) {
    for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
            const p = b[i][j];
            if (p === "" || corDa(p) !== cor) continue;
            if (getMovimentosLegais(b, i, j, p, cor, direitos).length > 0) return true;
        }
    return false;
}

function atualizarDireitosRoque(direitos, peca, fi, fj) {
    const next = { ...direitos };
    if (peca === "K") next.reiB = false;
    if (peca === "k") next.reiP = false;
    if (peca === "R" && fi === 7 && fj === 0) next.torreBA = false;
    if (peca === "R" && fi === 7 && fj === 7) next.torreBH = false;
    if (peca === "r" && fi === 0 && fj === 0) next.torrePA = false;
    if (peca === "r" && fi === 0 && fj === 7) next.torrePH = false;
    return next;
}

function nomePeca(peca) {
    const nomes = {
        K: "Rei", Q: "Dama", R: "Torre", B: "Bispo", N: "Cavalo", P: "Peão",
        k: "Rei", q: "Dama", r: "Torre", b: "Bispo", n: "Cavalo", p: "Peão",
    };
    return nomes[peca] || "";
}

function letraColuna(j) { return String.fromCharCode(65 + j); }
function numeroLinha(i) { return String(8 - i); }

// ============================================================
//  Lógica de clique
// ============================================================

function clicarCasa(i, j) {
    if (status !== "playing" && status !== "check") return;

    const peca = board[i][j];

    // Nada selecionado — selecionar peça
    if (selecionada === null) {
        if (peca === "" || corDa(peca) !== turno) return;
        selecionada = [i, j];
        movimentosLegais = getMovimentosLegais(board, i, j, peca, turno, direitosRoque);
        renderizar();
        return;
    }

    const [si, sj] = selecionada;

    // Clicar na mesma casa — desselecionar
    if (si === i && sj === j) {
        selecionada = null;
        movimentosLegais = [];
        renderizar();
        return;
    }

    const pecaSelecionada = board[si][sj];
    const pecaDestino = board[i][j];

    // Clicar em outra peça própria — trocar seleção
    if (pecaDestino !== "" && corDa(pecaDestino) === turno) {
        selecionada = [i, j];
        movimentosLegais = getMovimentosLegais(board, i, j, pecaDestino, turno, direitosRoque);
        renderizar();
        return;
    }

    // Verificar se é movimento legal
    const eLegal = movimentosLegais.some(([li, lj]) => li === i && lj === j);
    if (!eLegal) {
        selecionada = null;
        movimentosLegais = [];
        renderizar();
        return;
    }

    // Aplicar movimento
    const eRoque = (pecaSelecionada === "K" || pecaSelecionada === "k") && Math.abs(j - sj) === 2;
    const ladoRei = j > sj; // true = kingside
    const pecaTorre = turno === "branco" ? "R" : "r";

    const novoTabuleiro = clonarTabuleiro(board);
    if (eRoque) {
        novoTabuleiro[i][j] = pecaSelecionada;  // rei vai para destino
        novoTabuleiro[si][sj] = "";             // rei sai da origem
        novoTabuleiro[i][ladoRei ? 5 : 3] = pecaTorre; // torre vai para F ou D
        novoTabuleiro[i][ladoRei ? 7 : 0] = "";        // torre sai de H ou A
    } else {
        novoTabuleiro[i][j] = pecaSelecionada;
        novoTabuleiro[si][sj] = "";
        // Promoção do peão
        if (novoTabuleiro[i][j] === "P" && i === 0) novoTabuleiro[i][j] = "Q";
        if (novoTabuleiro[i][j] === "p" && i === 7) novoTabuleiro[i][j] = "q";
    }

    // Registrar captura
    if (!eRoque && pecaDestino !== "") {
        if (eBranca(pecaDestino)) capturadas_brancas.push(pecaDestino);
        else capturadas_pretas.push(pecaDestino);
    }

    // Atualizar direitos do roque
    const novosDireitos = atualizarDireitosRoque(direitosRoque, pecaSelecionada, si, sj);

    // Notação
    let notacao;
    if (eRoque) {
        notacao = ladoRei ? "O-O" : "O-O-O";
    } else {
        notacao = `${nomePeca(pecaSelecionada)} ${letraColuna(sj)}${numeroLinha(si)}→${letraColuna(j)}${numeroLinha(i)}`;
    }
    historico.push(`${turno === "branco" ? "♔" : "♚"} ${notacao}`);

    // Verificar xeque / xeque-mate / afogamento
    const oponente = turno === "branco" ? "preto" : "branco";
    const emXeque = estaEmXeque(novoTabuleiro, oponente);
    const podeMover = temMovimentoLegal(novoTabuleiro, oponente, novosDireitos);

    if (emXeque && !podeMover) status = "checkmate";
    else if (!emXeque && !podeMover) status = "stalemate";
    else if (emXeque) status = "check";
    else status = "playing";

    board = novoTabuleiro;
    turno = oponente;
    selecionada = null;
    movimentosLegais = [];
    ultimoMovimento = { de: [si, sj], para: [i, j] };
    direitosRoque = novosDireitos;

    renderizar();
}

// ============================================================
//  Renderização (DOM)
// ============================================================

function renderizar() {
    renderTabuleiro();
    renderStatus();
    renderCapturadas();
    renderHistorico();
    renderDireitosRoque();
}

function renderTabuleiro() {
    const container = document.getElementById("tabuleiro");
    container.innerHTML = "";

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const casa = document.createElement("div");
            casa.classList.add("casa");

            const eClara = (i + j) % 2 === 0;
            const estaSelecionada = selecionada && selecionada[0] === i && selecionada[1] === j;
            const eLegal = movimentosLegais.some(([li, lj]) => li === i && lj === j);
            const eUltimo = ultimoMovimento && (
                (ultimoMovimento.de[0] === i && ultimoMovimento.de[1] === j) ||
                (ultimoMovimento.para[0] === i && ultimoMovimento.para[1] === j)
            );
            const eRoqueMov = eLegal && selecionada &&
                (board[selecionada[0]][selecionada[1]] === "K" || board[selecionada[0]][selecionada[1]] === "k") &&
                Math.abs(j - selecionada[1]) === 2;

            if (estaSelecionada) {
                casa.classList.add("selecionada");
            } else if (eUltimo) {
                casa.classList.add(eClara ? "ultimo-claro" : "ultimo-escuro");
            } else {
                casa.classList.add(eClara ? "casa_clara" : "casa_escura");
            }

            // Indicadores de movimento
            if (eLegal) {
                const ind = document.createElement("div");
                if (eRoqueMov) {
                    ind.classList.add("roque-indicator");
                } else if (board[i][j] !== "") {
                    ind.classList.add("captura-indicator");
                } else {
                    ind.classList.add("move-indicator");
                }
                casa.appendChild(ind);
            }

            // Peça
            const peca = board[i][j];
            if (peca !== "") {
                const span = document.createElement("span");
                span.classList.add("peca");
                span.classList.add(eBranca(peca) ? "peca_branca" : "peca_preta");
                if (estaSelecionada) span.classList.add("peca-selecionada");
                span.textContent = PIECE_SYMBOLS[peca];
                casa.appendChild(span);
            }

            casa.addEventListener("click", () => clicarCasa(i, j));
            container.appendChild(casa);
        }
    }
}

function renderStatus() {
    const el = document.getElementById("status");
    el.className = "status";
    let msg = "";

    if (status === "checkmate") {
        const vencedor = turno === "branco" ? "Pretas" : "Brancas";
        msg = `Xeque-mate! ${vencedor} venceram!`;
        el.classList.add("status-checkmate");
    } else if (status === "stalemate") {
        msg = "Afogamento! Empate!";
        el.classList.add("status-stalemate");
    } else if (status === "check") {
        msg = `Xeque! Turno das ${turno === "branco" ? "brancas" : "pretas"}`;
        el.classList.add("status-check");
    } else {
        msg = `Turno das ${turno === "branco" ? "brancas" : "pretas"}`;
    }
    el.textContent = msg;

    const btn = document.getElementById("btnRestart");
    const fimDeJogo = status === "checkmate" || status === "stalemate";
    btn.textContent = fimDeJogo ? "Nova Partida" : "Reiniciar";
    btn.className = fimDeJogo ? "btn-nova-partida" : "btn-reiniciar";
}

function renderCapturadas() {
    const porPretas = document.getElementById("capturedBlack"); // peças brancas capturadas
    const porBrancas = document.getElementById("capturedWhite"); // peças pretas capturadas

    porPretas.innerHTML = capturadas_brancas.map(p =>
        `<span class="peca-capturada ${eBranca(p) ? "peca_branca" : "peca_preta"}">${PIECE_SYMBOLS[p]}</span>`
    ).join("");

    porBrancas.innerHTML = capturadas_pretas.map(p =>
        `<span class="peca-capturada ${eBranca(p) ? "peca_branca" : "peca_preta"}">${PIECE_SYMBOLS[p]}</span>`
    ).join("");
}

function renderHistorico() {
    const el = document.getElementById("historico");
    if (historico.length === 0) {
        el.innerHTML = '<p class="sem-lances">Nenhum lance ainda</p>';
        return;
    }
    el.innerHTML = historico.map((m, idx) =>
        `<div class="lance ${idx % 2 === 0 ? "lance-par" : ""}">
      <span class="lance-num">${Math.floor(idx / 2) + 1}.</span> ${m}
    </div>`
    ).join("");
    el.scrollTop = el.scrollHeight;
}

function renderDireitosRoque() {
    const d = direitosRoque;
    const set = (id, ok) => {
        const el = document.getElementById(id);
        el.className = "roque-badge " + (ok ? "roque-ok" : "roque-nao");
    };
    set("rw-k", d.reiB && d.torreBH);
    set("rw-q", d.reiB && d.torreBA);
    set("rb-k", d.reiP && d.torrePH);
    set("rb-q", d.reiP && d.torrePA);
}

// ============================================================
//  Inicialização
// ============================================================

function iniciarJogo() {
    board = clonarTabuleiro(INITIAL_BOARD);
    turno = "branco";
    selecionada = null;
    movimentosLegais = [];
    status = "playing";
    ultimoMovimento = null;
    capturadas_brancas = [];
    capturadas_pretas = [];
    historico = [];
    direitosRoque = {
        reiB: true, reiP: true,
        torreBA: true, torreBH: true,
        torrePA: true, torrePH: true,
    };
    renderizar();
}

function construirLabels() {
    const ranksEl = document.getElementById("ranks");
    for (let i = 0; i < 8; i++) {
        const div = document.createElement("div");
        div.className = "rank-label";
        div.textContent = numeroLinha(i);
        ranksEl.appendChild(div);
    }
    const filesEl = document.getElementById("files");
    for (let j = 0; j < 8; j++) {
        const div = document.createElement("div");
        div.className = "file-label";
        div.textContent = letraColuna(j);
        filesEl.appendChild(div);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    construirLabels();
    document.getElementById("btnRestart").addEventListener("click", iniciarJogo);
    iniciarJogo();
});
