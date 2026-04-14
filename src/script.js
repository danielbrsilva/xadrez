// ============================================================
//  Xadrez — HTML + CSS + JS puro
//  Inclui: todas as peças, xeque, xeque-mate, afogamento,
//          roque, en passant e promoção com escolha
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
let turno;
let selecionada;
let movimentosLegais;
let status;
let ultimoMovimento;
let capturadas_brancas;
let capturadas_pretas;
let historico;
let direitosRoque;
let enPassant;
let pendingPromotion;
let invertido;
let iaJogando = null;
let nivelIA = "facil";
let primeiroLanceFoito = false; // trava os botões de IA/Nível após o 1° lance humano
let _iaGen = 0; // incrementa a cada reinício para invalidar timeouts antigos da IA

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

function movimentoPeao(b, fi, fj, ti, tj, peca, ep) {
    const di = ti - fi, dj = tj - fj;
    if (peca === "P") {
        if (di === -1 && dj === 0 && b[ti][tj] === "") return true;
        if (fi === 6 && di === -2 && dj === 0 && b[fi - 1][fj] === "" && b[ti][tj] === "") return true;
        if (di === -1 && Math.abs(dj) === 1 && b[ti][tj] !== "") return true;
        if (di === -1 && Math.abs(dj) === 1 && b[ti][tj] === "" && ep && ti === ep[0] && tj === ep[1]) return true;
    } else {
        if (di === 1 && dj === 0 && b[ti][tj] === "") return true;
        if (fi === 1 && di === 2 && dj === 0 && b[fi + 1][fj] === "" && b[ti][tj] === "") return true;
        if (di === 1 && Math.abs(dj) === 1 && b[ti][tj] !== "") return true;
        if (di === 1 && Math.abs(dj) === 1 && b[ti][tj] === "" && ep && ti === ep[0] && tj === ep[1]) return true;
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

function movimentoValido(b, fi, fj, ti, tj, peca, ep = null) {
    switch (peca.toLowerCase()) {
        case "p": return movimentoPeao(b, fi, fj, ti, tj, peca, ep);
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

function movimentosRoque(b, cor, direitos) {
    const movs = [];
    const linha = cor === "branco" ? 7 : 0;
    const reiMoveu = cor === "branco" ? !direitos.reiB : !direitos.reiP;
    if (reiMoveu) return movs;

    const oponente = cor === "branco" ? "preto" : "branco";
    if (podeSerAtacada(b, linha, 4, oponente)) return movs;

    const pecaTorre = cor === "branco" ? "R" : "r";

    const torreH = cor === "branco" ? direitos.torreBH : direitos.torrePH;
    if (torreH && b[linha][7] === pecaTorre &&
        b[linha][5] === "" && b[linha][6] === "" &&
        !podeSerAtacada(b, linha, 5, oponente) &&
        !podeSerAtacada(b, linha, 6, oponente)) {
        movs.push([linha, 6]);
    }

    const torreA = cor === "branco" ? direitos.torreBA : direitos.torrePA;
    if (torreA && b[linha][0] === pecaTorre &&
        b[linha][1] === "" && b[linha][2] === "" && b[linha][3] === "" &&
        !podeSerAtacada(b, linha, 3, oponente) &&
        !podeSerAtacada(b, linha, 2, oponente)) {
        movs.push([linha, 2]);
    }

    return movs;
}

function getMovimentosLegais(b, fi, fj, peca, cor, direitos, ep = null) {
    const movs = [];
    for (let ti = 0; ti < 8; ti++) {
        for (let tj = 0; tj < 8; tj++) {
            if (!movimentoValido(b, fi, fj, ti, tj, peca, ep)) continue;
            const dest = b[ti][tj];
            if (dest !== "" && corDa(dest) === cor) continue;

            const next = clonarTabuleiro(b);
            next[ti][tj] = peca;
            next[fi][fj] = "";

            const eEP = ep && (peca === "P" || peca === "p") &&
                ti === ep[0] && tj === ep[1] && dest === "";
            if (eEP) {
                const linhaCapturado = peca === "P" ? ti + 1 : ti - 1;
                next[linhaCapturado][tj] = "";
            }

            if (!estaEmXeque(next, cor)) movs.push([ti, tj]);
        }
    }
    if (peca === "K" || peca === "k") {
        movs.push(...movimentosRoque(b, cor, direitos));
    }
    return movs;
}

function temMovimentoLegal(b, cor, direitos, ep = null) {
    for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
            const p = b[i][j];
            if (p === "" || corDa(p) !== cor) continue;
            if (getMovimentosLegais(b, i, j, p, cor, direitos, ep).length > 0) return true;
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

function calcularEnPassant(peca, fi, fj, ti) {
    if (peca === "P" && fi === 6 && ti === 4) return [5, fj];
    if (peca === "p" && fi === 1 && ti === 3) return [2, fj];
    return null;
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
//  Persistência — localStorage
// ============================================================

function salvarEstado() {
    if (pendingPromotion) return;
    try {
        const estado = {
            board, turno, status, ultimoMovimento,
            capturadas_brancas, capturadas_pretas,
            historico, direitosRoque, enPassant,
            invertido, iaJogando, nivelIA, primeiroLanceFoito
        };
        localStorage.setItem("xadrezEstado", JSON.stringify(estado));
    } catch (e) {}
}

function restaurarEstado() {
    try {
        const raw = localStorage.getItem("xadrezEstado");
        if (!raw) return false;
        const s = JSON.parse(raw);

        board               = s.board;
        turno               = s.turno;
        selecionada         = null;
        movimentosLegais    = [];
        status              = s.status;
        ultimoMovimento     = s.ultimoMovimento;
        capturadas_brancas  = s.capturadas_brancas;
        capturadas_pretas   = s.capturadas_pretas;
        historico           = s.historico;
        direitosRoque       = s.direitosRoque;
        enPassant           = s.enPassant;
        invertido           = s.invertido;
        iaJogando           = s.iaJogando;
        nivelIA             = s.nivelIA;
        primeiroLanceFoito  = s.primeiroLanceFoito || false;
        pendingPromotion    = null;

        const btnFlip = document.getElementById("btnFlip");
        btnFlip.classList.toggle("ativo", invertido);
        btnFlip.textContent = invertido ? "Desinverter tabuleiro" : "Inverter tabuleiro";

        document.querySelectorAll(".btn-ia").forEach(btn => {
            btn.classList.toggle("ativo", btn.dataset.cor === (iaJogando || ""));
        });
        document.querySelectorAll(".btn-nivel").forEach(btn => {
            btn.classList.toggle("ativo", btn.dataset.nivel === nivelIA);
        });

        document.getElementById("promocaoModal").style.display = "none";
        renderizar();
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================
//  Bloqueio dos botões de IA/Nível após o 1° lance
// ============================================================

function atualizarBloqueioIA() {
    document.querySelectorAll(".btn-ia, .btn-nivel").forEach(btn => {
        btn.disabled = primeiroLanceFoito;
    });
}

// ============================================================
//  Promoção — modal
// ============================================================

function executarMovimentoIA(fi, fj, ti, tj) {
    selecionada = [fi, fj];
    movimentosLegais = getMovimentosLegais(board, fi, fj, board[fi][fj], turno, direitosRoque, enPassant);
    clicarCasa(ti, tj);
}

function mostrarModalPromocao(cor) {
    if (iaJogando === cor) {
        const rainha = cor === "branco" ? "Q" : "q";
        setTimeout(() => completarPromocao(rainha), 0);
        return;
    }

    const modal = document.getElementById("promocaoModal");
    const btns = modal.querySelectorAll(".promocao-btn");

    const pecas = cor === "branco" ? ["Q", "R", "B", "N"] : ["q", "r", "b", "n"];
    const simbolos = cor === "branco"
        ? ["♕", "♖", "♗", "♘"]
        : ["♛", "♜", "♝", "♞"];
    const nomes = ["Dama", "Torre", "Bispo", "Cavalo"];
    const classeBtn = cor === "branco" ? "promocao-btn promo-branca" : "promocao-btn promo-preta";

    btns.forEach((btn, idx) => {
        btn.dataset.peca = pecas[idx];
        btn.className = classeBtn;
        btn.querySelector(".promo-simbolo").textContent = simbolos[idx];
        btn.querySelector(".promo-nome").textContent = nomes[idx];
    });

    modal.style.display = "flex";
}

function completarPromocao(pecaEscolhida) {
    const { novoTabuleiro, si, sj, toI, toJ, novosDireitos, novoEnPassant, pecaDestino } = pendingPromotion;

    novoTabuleiro[toI][toJ] = pecaEscolhida;

    if (pecaDestino !== "") {
        if (eBranca(pecaDestino)) capturadas_brancas.push(pecaDestino);
        else capturadas_pretas.push(pecaDestino);
    }

    const notacao = `${letraColuna(sj)}${numeroLinha(si)}→${letraColuna(toJ)}${numeroLinha(toI)}=${nomePeca(pecaEscolhida)}`;
    historico.push(`${turno === "branco" ? "♔" : "♚"} ${notacao}`);

    const oponente = turno === "branco" ? "preto" : "branco";
    const emXeque = estaEmXeque(novoTabuleiro, oponente);
    const podeMover = temMovimentoLegal(novoTabuleiro, oponente, novosDireitos, novoEnPassant);

    if (emXeque && !podeMover) status = "checkmate";
    else if (!emXeque && !podeMover) status = "stalemate";
    else if (emXeque) status = "check";
    else status = "playing";

    const quemMoveuProm = turno;
    board               = novoTabuleiro;
    turno               = oponente;
    selecionada         = null;
    movimentosLegais    = [];
    ultimoMovimento     = { de: [si, sj], para: [toI, toJ] };
    direitosRoque       = novosDireitos;
    enPassant           = novoEnPassant;
    pendingPromotion    = null;
    if (iaJogando !== quemMoveuProm) primeiroLanceFoito = true;

    document.getElementById("promocaoModal").style.display = "none";
    renderizar();
}

// ============================================================
//  Lógica de clique
// ============================================================

function clicarCasa(i, j) {
    if (status !== "playing" && status !== "check") return;
    if (pendingPromotion) return;

    const peca = board[i][j];

    if (selecionada === null) {
        if (peca === "" || corDa(peca) !== turno) return;
        selecionada = [i, j];
        movimentosLegais = getMovimentosLegais(board, i, j, peca, turno, direitosRoque, enPassant);
        renderizar();
        return;
    }

    const [si, sj] = selecionada;

    if (si === i && sj === j) {
        selecionada = null;
        movimentosLegais = [];
        renderizar();
        return;
    }

    const pecaSelecionada = board[si][sj];
    const pecaDestino = board[i][j];

    if (pecaDestino !== "" && corDa(pecaDestino) === turno) {
        selecionada = [i, j];
        movimentosLegais = getMovimentosLegais(board, i, j, pecaDestino, turno, direitosRoque, enPassant);
        renderizar();
        return;
    }

    const eLegal = movimentosLegais.some(([li, lj]) => li === i && lj === j);
    if (!eLegal) {
        selecionada = null;
        movimentosLegais = [];
        renderizar();
        return;
    }

    const eRoque = (pecaSelecionada === "K" || pecaSelecionada === "k") && Math.abs(j - sj) === 2;
    const ladoRei = j > sj;
    const pecaTorre = turno === "branco" ? "R" : "r";
    const eEP = enPassant && (pecaSelecionada === "P" || pecaSelecionada === "p") &&
        i === enPassant[0] && j === enPassant[1] && pecaDestino === "";

    const novoTabuleiro = clonarTabuleiro(board);

    if (eRoque) {
        novoTabuleiro[i][j] = pecaSelecionada;
        novoTabuleiro[si][sj] = "";
        novoTabuleiro[i][ladoRei ? 5 : 3] = pecaTorre;
        novoTabuleiro[i][ladoRei ? 7 : 0] = "";

    } else if (eEP) {
        const linhaCapturado = pecaSelecionada === "P" ? i + 1 : i - 1;
        const pecaCapturada = novoTabuleiro[linhaCapturado][j];
        novoTabuleiro[i][j] = pecaSelecionada;
        novoTabuleiro[si][sj] = "";
        novoTabuleiro[linhaCapturado][j] = "";
        if (eBranca(pecaCapturada)) capturadas_brancas.push(pecaCapturada);
        else capturadas_pretas.push(pecaCapturada);

    } else {
        novoTabuleiro[i][j] = pecaSelecionada;
        novoTabuleiro[si][sj] = "";

        const ePromocao = (novoTabuleiro[i][j] === "P" && i === 0) ||
            (novoTabuleiro[i][j] === "p" && i === 7);
        if (ePromocao) {
            const novosDireitos = atualizarDireitosRoque(direitosRoque, pecaSelecionada, si, sj);
            const novoEnPassant = null;
            pendingPromotion = { novoTabuleiro, si, sj, toI: i, toJ: j, novosDireitos, novoEnPassant, pecaDestino };
            selecionada = null;
            movimentosLegais = [];
            if (iaJogando !== turno) primeiroLanceFoito = true;
            mostrarModalPromocao(turno);
            return;
        }
    }

    if (!eRoque && !eEP && pecaDestino !== "") {
        if (eBranca(pecaDestino)) capturadas_brancas.push(pecaDestino);
        else capturadas_pretas.push(pecaDestino);
    }

    const novosDireitos = atualizarDireitosRoque(direitosRoque, pecaSelecionada, si, sj);
    const novoEnPassant = calcularEnPassant(pecaSelecionada, si, sj, i);

    let notacao;
    if (eRoque) {
        notacao = ladoRei ? "O-O" : "O-O-O";
    } else if (eEP) {
        notacao = `${letraColuna(sj)}x${letraColuna(j)}${numeroLinha(i)} e.p.`;
    } else {
        notacao = `${nomePeca(pecaSelecionada)} ${letraColuna(sj)}${numeroLinha(si)}→${letraColuna(j)}${numeroLinha(i)}`;
    }
    historico.push(`${turno === "branco" ? "♔" : "♚"} ${notacao}`);

    const oponente = turno === "branco" ? "preto" : "branco";
    const emXeque = estaEmXeque(novoTabuleiro, oponente);
    const podeMover = temMovimentoLegal(novoTabuleiro, oponente, novosDireitos, novoEnPassant);

    if (emXeque && !podeMover) status = "checkmate";
    else if (!emXeque && !podeMover) status = "stalemate";
    else if (emXeque) status = "check";
    else status = "playing";

    const quemMoveu     = turno;
    board               = novoTabuleiro;
    turno               = oponente;
    selecionada         = null;
    movimentosLegais    = [];
    ultimoMovimento     = { de: [si, sj], para: [i, j] };
    direitosRoque       = novosDireitos;
    enPassant           = novoEnPassant;
    if (iaJogando !== quemMoveu) primeiroLanceFoito = true;

    renderizar();
}

// ============================================================
//  Renderização (DOM)
// ============================================================

function renderizar() {
    renderLabels();
    renderTabuleiro();
    renderStatus();
    renderCapturadas();
    renderHistorico();
    atualizarBloqueioIA();
    salvarEstado();
    if (typeof agendarMovimentoIA === "function") agendarMovimentoIA();
}

function renderTabuleiro() {
    const container = document.getElementById("tabuleiro");
    container.innerHTML = "";

    let posReiDestaque = null;
    if (status === "check" || status === "checkmate") {
        posReiDestaque = encontrarRei(board, turno);
    }

    for (let vi = 0; vi < 8; vi++) {
        for (let vj = 0; vj < 8; vj++) {
            const bi = invertido ? 7 - vi : vi;
            const bj = invertido ? 7 - vj : vj;

            const casa = document.createElement("div");
            casa.classList.add("casa");

            const eClara = (bi + bj) % 2 === 0;
            const estaSelecionada = selecionada && selecionada[0] === bi && selecionada[1] === bj;
            const eLegal = movimentosLegais.some(([li, lj]) => li === bi && lj === bj);
            const eUltimo = ultimoMovimento && (
                (ultimoMovimento.de[0] === bi && ultimoMovimento.de[1] === bj) ||
                (ultimoMovimento.para[0] === bi && ultimoMovimento.para[1] === bj)
            );
            const eRoqueMov = eLegal && selecionada &&
                (board[selecionada[0]][selecionada[1]] === "K" || board[selecionada[0]][selecionada[1]] === "k") &&
                Math.abs(bj - selecionada[1]) === 2;
            const eEPMov = eLegal && selecionada && enPassant &&
                (board[selecionada[0]][selecionada[1]] === "P" || board[selecionada[0]][selecionada[1]] === "p") &&
                bi === enPassant[0] && bj === enPassant[1];
            const eReiDestaque = posReiDestaque && posReiDestaque[0] === bi && posReiDestaque[1] === bj;

            if (estaSelecionada) {
                casa.classList.add("selecionada");
            } else if (eReiDestaque) {
                casa.classList.add(status === "checkmate" ? "rei-xequemate" : "rei-xeque");
            } else if (eUltimo) {
                casa.classList.add(eClara ? "ultimo-claro" : "ultimo-escuro");
            } else {
                casa.classList.add(eClara ? "casa_clara" : "casa_escura");
            }

            if (eLegal) {
                const ind = document.createElement("div");
                if (eRoqueMov) {
                    ind.classList.add("roque-indicator");
                } else if (board[bi][bj] !== "" || eEPMov) {
                    ind.classList.add("captura-indicator");
                } else {
                    ind.classList.add("move-indicator");
                }
                casa.appendChild(ind);
            }

            const peca = board[bi][bj];
            if (peca !== "") {
                const span = document.createElement("span");
                span.classList.add("peca");
                span.classList.add(eBranca(peca) ? "peca_branca" : "peca_preta");
                if (estaSelecionada) span.classList.add("peca-selecionada");
                span.textContent = PIECE_SYMBOLS[peca];
                casa.appendChild(span);
            }

            casa.addEventListener("click", () => clicarCasa(bi, bj));
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
    const topBar    = document.getElementById("capturedBlack");
    const bottomBar = document.getElementById("capturedWhite");

    const topCapturadas    = invertido ? capturadas_pretas  : capturadas_brancas;
    const bottomCapturadas = invertido ? capturadas_brancas : capturadas_pretas;

    topBar.innerHTML = topCapturadas.map(p =>
        `<span class="peca-capturada ${eBranca(p) ? "peca_branca" : "peca_preta"}">${PIECE_SYMBOLS[p]}</span>`
    ).join("");

    bottomBar.innerHTML = bottomCapturadas.map(p =>
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
    enPassant = null;
    pendingPromotion = null;
    invertido = false;
    primeiroLanceFoito = false;
    _iaGen++;

    try { localStorage.removeItem("xadrezEstado"); } catch (e) {}

    document.getElementById("promocaoModal").style.display = "none";

    const btnFlip = document.getElementById("btnFlip");
    btnFlip.classList.remove("ativo");
    btnFlip.textContent = "Inverter tabuleiro";

    document.querySelectorAll(".btn-ia, .btn-nivel").forEach(btn => {
        btn.disabled = false;
    });

    // Preserva as configurações de IA e Nível visualmente
    document.querySelectorAll(".btn-ia").forEach(btn => btn.classList.remove("ativo"));
    const _corAtual = iaJogando === null ? "" : iaJogando;
    const _btnIA = document.querySelector(`.btn-ia[data-cor="${_corAtual}"]`);
    if (_btnIA) _btnIA.classList.add("ativo");

    document.querySelectorAll(".btn-nivel").forEach(btn => btn.classList.remove("ativo"));
    const _btnNivel = document.querySelector(`.btn-nivel[data-nivel="${nivelIA}"]`);
    if (_btnNivel) _btnNivel.classList.add("ativo");

    renderizar();
}

function renderLabels() {
    const ranksEl = document.getElementById("ranks");
    ranksEl.innerHTML = "";
    for (let vi = 0; vi < 8; vi++) {
        const bi = invertido ? 7 - vi : vi;
        const div = document.createElement("div");
        div.className = "rank-label";
        div.textContent = numeroLinha(bi);
        ranksEl.appendChild(div);
    }
    const filesEl = document.getElementById("files");
    filesEl.innerHTML = "";
    for (let vj = 0; vj < 8; vj++) {
        const bj = invertido ? 7 - vj : vj;
        const div = document.createElement("div");
        div.className = "file-label";
        div.textContent = letraColuna(bj);
        filesEl.appendChild(div);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnRestart").addEventListener("click", iniciarJogo);

    document.getElementById("btnFlip").addEventListener("click", () => {
        invertido = !invertido;
        const btn = document.getElementById("btnFlip");
        btn.classList.toggle("ativo", invertido);
        btn.textContent = invertido ? "Desinverter tabuleiro" : "Inverter tabuleiro";
        selecionada = null;
        movimentosLegais = [];
        renderizar();
    });

    document.querySelectorAll(".promocao-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            completarPromocao(btn.dataset.peca);
        });
    });

    document.querySelectorAll(".btn-ia").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            document.querySelectorAll(".btn-ia").forEach(b => b.classList.remove("ativo"));
            btn.classList.add("ativo");
            const cor = btn.dataset.cor;
            iaJogando = cor === "" ? null : cor;
            if (typeof agendarMovimentoIA === "function") agendarMovimentoIA();
        });
    });

    document.querySelectorAll(".btn-nivel").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            document.querySelectorAll(".btn-nivel").forEach(b => b.classList.remove("ativo"));
            btn.classList.add("ativo");
            nivelIA = btn.dataset.nivel;
        });
    });

    if (!restaurarEstado()) {
        iniciarJogo();
    }
});
