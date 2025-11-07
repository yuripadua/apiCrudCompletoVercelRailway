/**
 * =============================================================================
 *  src/config/sqlite.js
 * -----------------------------------------------------------------------------
 *  Objetivo deste módulo:
 *    - Abrir/criar um banco SQLite local usando a biblioteca "better-sqlite3".
 *    - Criar a tabela "notas_fiscais" se ela ainda não existir.
 *
 *  Por que "better-sqlite3"?
 *    - É uma biblioteca síncrona (ao contrário de "sqlite3" que é assíncrona).
 *    - Leitura/escrita é geralmente mais simples no código (menos callbacks/promises).
 *    - Para APIs didáticas e de baixo/médio volume, funciona muito bem.
 *
 *  Onde o arquivo do banco é salvo?
 *    - O caminho vem de SQLITE_FILE (ver src/config/env.js).
 *    - Ex.: ./notas.db (na raiz do projeto). Se não existir, é criado.
 *
 *  Sobre o schema "notas_fiscais":
 *    - id            : chave primária autoincremental (inteiro).
 *    - numero        : identificador da nota (deve ser único).
 *    - cliente_nome  : nome do cliente (texto simples).
 *    - itens_json    : array de itens em formato JSON (ex.: [{productId:1,qtd:2}, ...]).
 *    - total         : valor total da nota (número real).
 *    - created_at    : data/hora ISO em texto (ex.: "2025-10-28T12:34:56.789Z").
 *
 *  Observações:
 *    - "created_at" como TEXT (ISO) facilita leitura humana e ordenação por string.
 *    - Guardamos itens como JSON para simplicidade (sem tabelas auxiliares item-a-item).
 *      Em sistemas maiores, poderia haver uma tabela "nota_itens" com FK para a nota.
 *    - "numero" é UNIQUE para evitar duplicidade de lançamento.
 *
 *  Boas práticas que cabem aqui (comentadas para não mudar o comportamento agora):
 *    - Ativar WAL (journaling) para melhor concorrência: sqliteDb.pragma('journal_mode = WAL');
 *    - Ativar FK (se forem criadas tabelas com chaves estrangeiras): sqliteDb.pragma('foreign_keys = ON');
 *    - Criar índices (INDEX) se houver consultas frequentes em colunas específicas.
 * =============================================================================
 */

import Sqlite from "better-sqlite3"; // Biblioteca SÍNCRONA para SQLite (facilita o uso no Node)
import { SQLITE_FILE } from "./env.js"; // Caminho do arquivo do banco vindo do .env (ou default)

// Exportamos a instância do banco para uso em repositórios (NotaFiscalSqliteRepository).
// A instância é inicializada em "initSqlite()".
export let sqliteDb = null;

/**
 * Inicializa o banco SQLite (cria o arquivo se não existir) e aplica o schema.
 * - Deve ser chamada uma vez na inicialização do servidor (ver server.mjs).
 * - "better-sqlite3" abre conexão imediatamente; não há "await" aqui.
 */
export function initSqlite(fileOverride) {
  // ---------------------------------------------------------------------------
  // 1) Abrir/criar o arquivo do banco
  // ---------------------------------------------------------------------------
  // - Se SQLITE_FILE for "./notas.db", ele será criado na raiz do projeto.
  // - Em produção, é recomendável apontar para uma pasta com permissão de escrita.
  const dbPath = fileOverride || SQLITE_FILE;
  sqliteDb = new Sqlite(dbPath);

  // DICAS (COMENTADAS para não alterar o comportamento em aula):
  // ---------------------------------------------------------------------------
  // // Habilitar modo WAL (Write-Ahead Logging) — melhora concorrência de leitura:
  // sqliteDb.pragma('journal_mode = WAL');
  //
  // // Habilitar chaves estrangeiras (se criar tabelas relacionadas com FK):
  // sqliteDb.pragma('foreign_keys = ON');

  // ---------------------------------------------------------------------------
  // 2) Criar a tabela "notas_fiscais" se não existir
  // ---------------------------------------------------------------------------
  // - O método .prepare(sql) compila o SQL; .run() executa imediatamente.
  // - Usamos backticks para facilitar quebra de linha no comando SQL.
  sqliteDb
    .prepare(
      `
    CREATE TABLE IF NOT EXISTS notas_fiscais (
      id INTEGER PRIMARY KEY AUTOINCREMENT, -- chave primária autoincremental
      numero TEXT NOT NULL UNIQUE,          -- número da nota (não pode repetir)
      cliente_nome TEXT NOT NULL,           -- nome do cliente
      itens_json TEXT NOT NULL,             -- itens em JSON (ex.: [{"productId":1,"qtd":2}, ...])
      total REAL NOT NULL,                  -- valor total da NF (REAL = ponto flutuante)
      created_at TEXT NOT NULL              -- timestamp ISO (string)
    );
  `
    )
    .run();

  // Tabela opcional para fallback de usuários quando MySQL não estiver disponível
  sqliteDb
    .prepare(
      `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `
    )
    .run();

  // Caso queira, poderíamos criar um índice adicional para melhorar buscas por "numero":
  // sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_notas_numero ON notas_fiscais(numero);').run();

  // Observações de uso:
  //  - Como "better-sqlite3" é síncrono, as operações de leitura/escrita bloqueiam o event loop
  //    durante a execução. Em cenários de alta concorrência, pode ser uma limitação.
  //  - Para fins didáticos e testes locais, é uma escolha simples e eficiente.
  //  - Lembre-se de não chamar "initSqlite()" várias vezes; mantenha uma única instância global.
}

/*
 * Troubleshooting:
 * -----------------------------------------------------------------------------
 *  - ERRO: "SQLITE_CANTOPEN"
 *      -> Caminho inválido ou sem permissão de escrita. Ajuste SQLITE_FILE no .env.
 *
 *  - ERRO de sintaxe SQL:
 *      -> Verifique aspas e vírgulas no CREATE TABLE.
 *
 *  - O arquivo .db não aparece:
 *      -> A pasta pode estar diferente do que você imagina (veja process.cwd()).
 *      -> Verifique se "initSqlite()" realmente foi chamado no boot (server.mjs).
 *
 *  - Concorrência (vários alunos testando ao mesmo tempo):
 *      -> Considere ativar WAL (comentado acima) e não usar o mesmo arquivo em rede.
 */
