// ============================================================
//  IA — Motor de xadrez com minimax + alpha-beta
//  Fácil: profundidade 2 | Médio: profundidade 3 + ordenação
//  Difícil: profundidade 4 + ordenação + busca de quiescência
//           + avaliação avançada (estrutura de peões, bispos, etc.)
// ============================================================

// ---- Valores materiais das peças ----
const VALOR_PECA = {
    P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000,
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// ---- Tabelas posicionais (perspectiva branca, linha 0 = topo do array) ----
const TAB_PEAO = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
];

const TAB_CAVALO = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
];

const TAB_BISPO = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
];

const TAB_TORRE = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
];

const TAB_RAINHA = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
];

const TAB_REI_MEIO = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
];

const TAB_REI_FINAL = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
];

// ---- Detecta fase de jogo (endgame = poucas peças maiores) ----
function eEndgame(b) {
    let materialMenor = 0;
    for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
            const p = b[i][j].toUpperCase();
            if (p === 'Q' || p === 'R') materialMenor++;
        }
    return materialMenor <= 2;
}

// ---- Bônus posicional por peça/posição ----
function bonusPosicional(peca, i, j, endgame) {
    const idx    = i * 8 + j;
    const idxInv = (7 - i) * 8 + j;
    switch (peca) {
        case 'P': return TAB_PEAO[idx];
        case 'p': return TAB_PEAO[idxInv];
        case 'N': return TAB_CAVALO[idx];
        case 'n': return TAB_CAVALO[idxInv];
        case 'B': return TAB_BISPO[idx];
        case 'b': return TAB_BISPO[idxInv];
        case 'R': return TAB_TORRE[idx];
        case 'r': return TAB_TORRE[idxInv];
        case 'Q': return TAB_RAINHA[idx];
        case 'q': return TAB_RAINHA[idxInv];
        case 'K': return (endgame ? TAB_REI_FINAL : TAB_REI_MEIO)[idx];
        case 'k': return (endgame ? TAB_REI_FINAL : TAB_REI_MEIO)[idxInv];
        default:  return 0;
    }
}

// ---- Avaliação estática avançada do tabuleiro ----
function avaliarTabuleiro(b) {
    const endgame = eEndgame(b);
    let pontuacao = 0;

    let brancasPeoes = [];
    let pretasPeoes  = [];
    let brancasBispos = 0;
    let pretasBispos  = 0;

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = b[i][j];
            if (p === '') continue;
            const val = VALOR_PECA[p] + bonusPosicional(p, i, j, endgame);
            if (eBranca(p)) {
                pontuacao += val;
                if (p === 'P') brancasPeoes.push({ col: j, lin: i });
                if (p === 'B') brancasBispos++;
            } else {
                pontuacao -= val;
                if (p === 'p') pretasPeoes.push({ col: j, lin: i });
                if (p === 'b') pretasBispos++;
            }
        }
    }

    // Bônus par de bispos
    if (brancasBispos >= 2) pontuacao += 30;
    if (pretasBispos  >= 2) pontuacao -= 30;

    // Penalidade peões dobrados
    const colB = {};
    for (const { col } of brancasPeoes) {
        colB[col] = (colB[col] || 0) + 1;
        if (colB[col] > 1) pontuacao -= 15;
    }
    const colP = {};
    for (const { col } of pretasPeoes) {
        colP[col] = (colP[col] || 0) + 1;
        if (colP[col] > 1) pontuacao += 15;
    }

    // Penalidade peões isolados
    const colsB = brancasPeoes.map(x => x.col);
    for (const col of colsB) {
        if (!colsB.includes(col - 1) && !colsB.includes(col + 1)) pontuacao -= 10;
    }
    const colsP = pretasPeoes.map(x => x.col);
    for (const col of colsP) {
        if (!colsP.includes(col - 1) && !colsP.includes(col + 1)) pontuacao += 10;
    }

    // Peão passado (nenhum peão inimigo bloqueando na mesma ou colunas adjacentes)
    for (const { col, lin } of brancasPeoes) {
        const passado = !pretasPeoes.some(p =>
            (p.col === col || p.col === col - 1 || p.col === col + 1) && p.lin < lin
        );
        if (passado) pontuacao += (7 - lin) * 5;
    }
    for (const { col, lin } of pretasPeoes) {
        const passado = !brancasPeoes.some(p =>
            (p.col === col || p.col === col - 1 || p.col === col + 1) && p.lin > lin
        );
        if (passado) pontuacao -= lin * 5;
    }

    return pontuacao;
}

// ---- Pontuação MVV-LVA para ordenação de movimentos ----
const VALOR_ORD = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

function pontuarOrdem(b, fi, fj, ti, tj) {
    const peca = b[fi][fj];
    const dest = b[ti][tj];
    let score = 0;

    if (dest !== '') {
        const vit = VALOR_ORD[dest.toUpperCase()] || 0;
        const ata = VALOR_ORD[peca.toUpperCase()] || 0;
        score = 10 * vit - ata + 100;
    }

    // Promoção de peão
    if ((peca === 'P' && ti === 0) || (peca === 'p' && ti === 7)) score += 90;

    return score;
}

function ordenarMovimentos(b, movimentos) {
    return movimentos.slice().sort((a, bm) =>
        pontuarOrdem(b, bm[0], bm[1], bm[2], bm[3]) -
        pontuarOrdem(b, a[0],  a[1],  a[2],  a[3])
    );
}

// ---- Aplica um movimento no tabuleiro (sem alterar estado global) ----
function aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitosAtual, epAtual) {
    const peca = b[fi][fj];
    const cor  = corDa(peca);
    const dest = b[ti][tj];
    const novo = clonarTabuleiro(b);

    const eRoque  = (peca === 'K' || peca === 'k') && Math.abs(tj - fj) === 2;
    const ladoRei = tj > fj;
    const torre   = cor === 'branco' ? 'R' : 'r';
    const eEP     = epAtual &&
        (peca === 'P' || peca === 'p') &&
        ti === epAtual[0] && tj === epAtual[1] && dest === '';

    if (eRoque) {
        novo[ti][tj] = peca;
        novo[fi][fj] = '';
        novo[ti][ladoRei ? 5 : 3] = torre;
        novo[ti][ladoRei ? 7 : 0] = '';
    } else if (eEP) {
        const capLinha = peca === 'P' ? ti + 1 : ti - 1;
        novo[ti][tj] = peca;
        novo[fi][fj] = '';
        novo[capLinha][tj] = '';
    } else {
        novo[ti][tj] = peca;
        novo[fi][fj] = '';
        if (novo[ti][tj] === 'P' && ti === 0) novo[ti][tj] = 'Q';
        if (novo[ti][tj] === 'p' && ti === 7) novo[ti][tj] = 'q';
    }

    const novosDireitos = atualizarDireitosRoque(direitosAtual, peca, fi, fj);
    const novoEP        = calcularEnPassant(peca, fi, fj, ti);

    return { tabuleiro: novo, direitos: novosDireitos, ep: novoEP };
}

// ---- Gera todos os movimentos legais para uma cor ----
function getTodosMovimentos(b, cor, direitos, ep) {
    const movimentos = [];
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = b[i][j];
            if (p === '' || corDa(p) !== cor) continue;
            const legais = getMovimentosLegais(b, i, j, p, cor, direitos, ep);
            for (const [ti, tj] of legais) {
                movimentos.push([i, j, ti, tj]);
            }
        }
    }
    return movimentos;
}

// ---- Busca de quiescência (evita o efeito horizonte) ----
function quiescencia(b, alpha, beta, maximizando, cor, direitos, ep, limite) {
    const standPat = avaliarTabuleiro(b);

    if (limite <= 0) return standPat;

    if (maximizando) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;
    }

    const oponente = cor === 'branco' ? 'preto' : 'branco';
    const todos = getTodosMovimentos(b, cor, direitos, ep);

    // Filtra capturas e promoções
    const capturas = todos.filter(([fi, fj, ti, tj]) =>
        b[ti][tj] !== '' ||
        (b[fi][fj] === 'P' && ti === 0) ||
        (b[fi][fj] === 'p' && ti === 7)
    );

    const ordenadas = ordenarMovimentos(b, capturas);

    if (maximizando) {
        for (const [fi, fj, ti, tj] of ordenadas) {
            const { tabuleiro, direitos: nd, ep: nep } =
                aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
            const val = quiescencia(tabuleiro, alpha, beta, false, oponente, nd, nep, limite - 1);
            if (val >= beta) return beta;
            if (val > alpha) alpha = val;
        }
        return alpha;
    } else {
        for (const [fi, fj, ti, tj] of ordenadas) {
            const { tabuleiro, direitos: nd, ep: nep } =
                aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
            const val = quiescencia(tabuleiro, alpha, beta, true, oponente, nd, nep, limite - 1);
            if (val <= alpha) return alpha;
            if (val < beta) beta = val;
        }
        return beta;
    }
}

// ---- Minimax com alpha-beta pruning e ordenação de movimentos ----
function minimax(b, profundidade, alpha, beta, maximizando, cor, direitos, ep, comOrdenacao, comQuiescencia) {
    if (profundidade === 0) {
        if (comQuiescencia) {
            return quiescencia(b, alpha, beta, maximizando, cor, direitos, ep, 4);
        }
        return avaliarTabuleiro(b);
    }

    const oponente   = cor === 'branco' ? 'preto' : 'branco';
    const todosMovs  = getTodosMovimentos(b, cor, direitos, ep);

    if (todosMovs.length === 0) {
        if (estaEmXeque(b, cor)) return maximizando ? -100000 : 100000;
        return 0;
    }

    const movimentos = comOrdenacao ? ordenarMovimentos(b, todosMovs) : todosMovs;

    if (maximizando) {
        let melhor = -Infinity;
        for (const [fi, fj, ti, tj] of movimentos) {
            const { tabuleiro, direitos: nd, ep: nep } =
                aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
            const val = minimax(tabuleiro, profundidade - 1, alpha, beta, false, oponente, nd, nep, comOrdenacao, comQuiescencia);
            melhor = Math.max(melhor, val);
            alpha  = Math.max(alpha, melhor);
            if (beta <= alpha) break;
        }
        return melhor;
    } else {
        let melhor = Infinity;
        for (const [fi, fj, ti, tj] of movimentos) {
            const { tabuleiro, direitos: nd, ep: nep } =
                aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
            const val = minimax(tabuleiro, profundidade - 1, alpha, beta, true, oponente, nd, nep, comOrdenacao, comQuiescencia);
            melhor = Math.min(melhor, val);
            beta   = Math.min(beta, melhor);
            if (beta <= alpha) break;
        }
        return melhor;
    }
}

// ---- Escolhe o melhor movimento conforme o nível ----
function melhorMovimentoIA(b, cor, nivel, direitos, ep) {
    const movimentos = getTodosMovimentos(b, cor, direitos, ep);
    if (movimentos.length === 0) return null;

    const maximizando = cor === 'branco';
    const oponente    = cor === 'branco' ? 'preto' : 'branco';

    // Fácil: profundidade 2, sem ordenação avançada (equivale ao antigo Médio)
    if (nivel === 'facil') {
        const embaralhado = movimentos.slice().sort(() => Math.random() - 0.5);
        let melhorVal = maximizando ? -Infinity : Infinity;
        let melhor    = null;

        for (const mov of embaralhado) {
            const [fi, fj, ti, tj] = mov;
            const { tabuleiro, direitos: nd, ep: nep } =
                aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
            const val = minimax(tabuleiro, 1, -Infinity, Infinity, !maximizando, oponente, nd, nep, false, false);
            if (maximizando ? val > melhorVal : val < melhorVal) {
                melhorVal = val;
                melhor    = mov;
            }
        }
        return melhor;
    }

    // Médio: profundidade 3 + ordenação de movimentos (jogador experiente)
    if (nivel === 'medio') {
        const ordenados = ordenarMovimentos(b, movimentos).sort(() => Math.random() - 0.49);
        let melhorVal = maximizando ? -Infinity : Infinity;
        let melhor    = null;

        for (const mov of ordenados) {
            const [fi, fj, ti, tj] = mov;
            const { tabuleiro, direitos: nd, ep: nep } =
                aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
            const val = minimax(tabuleiro, 2, -Infinity, Infinity, !maximizando, oponente, nd, nep, true, false);
            if (maximizando ? val > melhorVal : val < melhorVal) {
                melhorVal = val;
                melhor    = mov;
            }
        }
        return melhor;
    }

    // Difícil: profundidade 4 + ordenação + quiescência + avaliação completa
    const ordenados = ordenarMovimentos(b, movimentos);
    let melhorVal = maximizando ? -Infinity : Infinity;
    let melhor    = null;

    for (const mov of ordenados) {
        const [fi, fj, ti, tj] = mov;
        const { tabuleiro, direitos: nd, ep: nep } =
            aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
        const val = minimax(tabuleiro, 3, -Infinity, Infinity, !maximizando, oponente, nd, nep, true, true);
        if (maximizando ? val > melhorVal : val < melhorVal) {
            melhorVal = val;
            melhor    = mov;
        }
    }
    return melhor;
}

// ---- Ponto de entrada chamado por script.js após cada renderização ----
function agendarMovimentoIA() {
    if (!iaJogando || iaJogando !== turno) return;
    if (status !== 'playing' && status !== 'check') return;

    const genAtual = _iaGen;

    setTimeout(() => {
        // Se o jogo foi reiniciado enquanto a IA pensava, ignora o lance
        if (_iaGen !== genAtual) return;
        if (!iaJogando || iaJogando !== turno) return;
        if (status !== 'playing' && status !== 'check') return;

        const mov = melhorMovimentoIA(board, turno, nivelIA, direitosRoque, enPassant);
        if (mov) {
            const [fi, fj, ti, tj] = mov;
            executarMovimentoIA(fi, fj, ti, tj);
        }
    }, 350);
}
