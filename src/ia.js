// ============================================================
//  IA — Motor de xadrez com minimax + alpha-beta
//  Requer: funções globais de script.js (clonarTabuleiro,
//  corDa, eBranca, getMovimentosLegais, estaEmXeque,
//  atualizarDireitosRoque, calcularEnPassant)
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

const TAB_REI = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
];

// ---- Bônus posicional por peça/posição ----
function bonusPosicional(peca, i, j) {
    const idx    = i * 8 + j;
    const idxInv = (7 - i) * 8 + j; // espelhado para as pretas
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
        case 'K': return TAB_REI[idx];
        case 'k': return TAB_REI[idxInv];
        default:  return 0;
    }
}

// ---- Avaliação estática do tabuleiro ----
// Positivo = bom para brancas | Negativo = bom para pretas
function avaliarTabuleiro(b) {
    let pontuacao = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = b[i][j];
            if (p === '') continue;
            const valor = VALOR_PECA[p] + bonusPosicional(p, i, j);
            pontuacao += eBranca(p) ? valor : -valor;
        }
    }
    return pontuacao;
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
        // Promoção automática → Rainha (para fins de avaliação)
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

// ---- Minimax com alpha-beta pruning ----
function minimax(b, profundidade, alpha, beta, maximizando, cor, direitos, ep) {
    if (profundidade === 0) return avaliarTabuleiro(b);

    const oponente  = cor === 'branco' ? 'preto' : 'branco';
    const movimentos = getTodosMovimentos(b, cor, direitos, ep);

    if (movimentos.length === 0) {
        // Xeque-mate ou afogamento
        if (estaEmXeque(b, cor)) return maximizando ? -100000 : 100000;
        return 0;
    }

    if (maximizando) {
        let melhor = -Infinity;
        for (const [fi, fj, ti, tj] of movimentos) {
            const { tabuleiro, direitos: nd, ep: nep } =
                aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
            const val = minimax(tabuleiro, profundidade - 1, alpha, beta, false, oponente, nd, nep);
            melhor = Math.max(melhor, val);
            alpha  = Math.max(alpha, melhor);
            if (beta <= alpha) break; // poda beta
        }
        return melhor;
    } else {
        let melhor = Infinity;
        for (const [fi, fj, ti, tj] of movimentos) {
            const { tabuleiro, direitos: nd, ep: nep } =
                aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
            const val = minimax(tabuleiro, profundidade - 1, alpha, beta, true, oponente, nd, nep);
            melhor = Math.min(melhor, val);
            beta   = Math.min(beta, melhor);
            if (beta <= alpha) break; // poda alpha
        }
        return melhor;
    }
}

// ---- Escolhe o melhor movimento conforme o nível ----
function melhorMovimentoIA(b, cor, nivel, direitos, ep) {
    const movimentos = getTodosMovimentos(b, cor, direitos, ep);
    if (movimentos.length === 0) return null;

    // Fácil: aleatório com leve preferência por capturas
    if (nivel === 'facil') {
        const capturas = movimentos.filter(([fi, fj, ti, tj]) => b[ti][tj] !== '');
        const pool = capturas.length > 0 && Math.random() < 0.6 ? capturas : movimentos;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // Médio: profundidade 2 | Difícil: profundidade 3
    const profundidade = nivel === 'medio' ? 2 : 3;
    const maximizando  = cor === 'branco';
    const oponente     = cor === 'branco' ? 'preto' : 'branco';

    let melhorVal = maximizando ? -Infinity : Infinity;
    let melhor    = null;

    // Embaralha para variedade quando há empates de avaliação
    const embaralhado = movimentos.slice().sort(() => Math.random() - 0.5);

    for (const mov of embaralhado) {
        const [fi, fj, ti, tj] = mov;
        const { tabuleiro, direitos: nd, ep: nep } =
            aplicarMovimentoSimulado(b, fi, fj, ti, tj, direitos, ep);
        const val = minimax(tabuleiro, profundidade - 1, -Infinity, Infinity, !maximizando, oponente, nd, nep);
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

    setTimeout(() => {
        // Verifica novamente após o delay (pode ter mudado)
        if (!iaJogando || iaJogando !== turno) return;
        if (status !== 'playing' && status !== 'check') return;

        const mov = melhorMovimentoIA(board, turno, nivelIA, direitosRoque, enPassant);
        if (mov) {
            const [fi, fj, ti, tj] = mov;
            executarMovimentoIA(fi, fj, ti, tj);
        }
    }, 350);
}
