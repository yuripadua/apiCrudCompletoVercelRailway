/**
 * =============================================================================
 *  src/config/mysql.js
 * -----------------------------------------------------------------------------
 *  Objetivo deste módulo:
 *    - Criar e expor um "pool" de conexões MySQL (mysql2/promise).
 *    - Executar a migração mínima necessária para a tabela "usuarios".
 *
 *  Por que usar "pool" (createPool) e não "conexão única" (createConnection)?
 *    - O pool gerencia várias conexões simultâneas automaticamente.
 *    - Reaproveita conexões (melhor performance).
 *    - Evita limite de conexões estourar com muitos requests.
 *
 *  Estratégia:
 *    - As credenciais e o nome do banco vêm do módulo env.js (que lê o .env).
 *    - A criação da tabela usa "CREATE TABLE IF NOT EXISTS" (idempotente).
 *      Assim, rodar a API várias vezes não recria a tabela se ela já existir.
 *
 *  Observações importantes:
 *    - Em produção, garanta que MYSQL_* estejam corretas e que o usuário tenha
 *      permissão de "CREATE TABLE" (ou rode migrações separadamente).
 *    - Caso queira rodar migrações em arquivos separados (ex.: Knex/Prisma),
 *      aqui poderia ficar só o "init" e a criação de tabela iria para outro módulo.
 * =============================================================================
 */

import mysql from "mysql2/promise"; // versão "promise" do mysql2, permite usar async/await
import {
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_PORT,
  MYSQL_URL,
  MYSQL_SSL,
} from "./env.js"; // credenciais e nome do BD centralizados

// Exportamos o pool para que outras partes do sistema possam executar queries.
// Começa como null até "initMySql()" ser chamado no boot do servidor (server.mjs).
export let mysqlPool = null;

/**
 * Inicializa o pool e garante a tabela "usuarios".
 * - Esta função deve ser chamada uma vez quando a aplicação subir.
 * - Em caso de falha na conexão (credenciais erradas, BD inatingível),
 *   a exceção será lançada e quem chamou "initMySql()" deve tratar/logar.
 */
export async function initMySql() {
  // ---------------------------------------------------------------------------
  // 1) Criação do Pool
  // ---------------------------------------------------------------------------
  //  - waitForConnections: quando o pool estiver cheio, novas requisições
  //    "esperam" uma conexão vagar (ao invés de falhar imediatamente).
  //  - connectionLimit: número máximo de conexões simultâneas no pool.
  //    (ajuste conforme a carga do seu ambiente e limites do servidor MySQL).
  //  - queueLimit: máximo de requisições enfileiradas esperando conexão
  //    (0 = sem limite; cuidado para não enfileirar "infinitamente" sob carga).
  if (MYSQL_URL && MYSQL_URL.startsWith("mysql://")) {
    // Permite URL de conexão direta (ex.: Railway/PlanetScale)
    const url = new URL(MYSQL_URL);
    const dbName = (url.pathname || "").replace(/^\//, "");
    const sslParam = url.searchParams.get("ssl");
    const useSsl = MYSQL_SSL || (sslParam && sslParam !== "false");
    mysqlPool = await mysql.createPool({
      host: url.hostname,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: dbName,
      port: url.port ? parseInt(url.port, 10) : 3306,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  } else {
    mysqlPool = await mysql.createPool({
      host: MYSQL_HOST, // ex.: "localhost" ou hostname/IP do servidor
      user: MYSQL_USER, // ex.: "root" (evite root em produção; crie usuário com permissões mínimas)
      password: MYSQL_PASSWORD, // senha do usuário configurado
      database: MYSQL_DATABASE, // nome do schema/base que será usada
      port: MYSQL_PORT,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      ssl: MYSQL_SSL ? { rejectUnauthorized: false } : undefined,
    });
  }

  // DICA DE DIAGNÓSTICO RÁPIDO (opcional):
  // Você pode testar a conexão com um ping simples:
  // await mysqlPool.query('SELECT 1'); // se falhar, verifique host/porta/usuário/senha/banco

  // ---------------------------------------------------------------------------
  // 2) Migração mínima (DDL) — criação da tabela "usuarios" se não existir.
  // ---------------------------------------------------------------------------
  //  - Campos:
  //      id          : chave primária auto-incremento
  //      nome        : nome do usuário
  //      email       : único (UNIQUE) para não permitir duplicidades
  //      senha_hash  : hash de senha (bcrypt) — jamais armazene a senha em texto puro
  //      created_at  : timestamp automático de criação
  //  - Esta migração é propositalmente simples: o foco da disciplina aqui é
  //    arquitetura + repos + auth, não um sistema de migrações completo.
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      senha_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Se precisar, você pode configurar collation/charset no banco/tabela, por exemplo:
  // ALTER DATABASE ${MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  // (Faça isso com cuidado e com um usuário com permissões apropriadas.)
}

/*
 * FAQ / Erros comuns:
 * -----------------------------------------------------------------------------
 *  - ER_ACCESS_DENIED_ERROR (acesso negado):
 *      -> Usuário/senha incorretos ou sem permissão. Ajuste no .env e reinicie.
 *
 *  - getaddrinfo ENOTFOUND <host>:
 *      -> Hostname inválido ou DNS não resolve. Use IP ou configure /etc/hosts.
 *
 *  - ECONNREFUSED:
 *      -> MySQL não está rodando/escutando na porta padrão (3306).
 *         Verifique serviço do MySQL e firewall.
 *
 *  - "Table '...usuarios' doesn't exist" após subir a API:
 *      -> Certifique-se de que "initMySql()" foi executada antes dos repositórios
 *         começarem a rodar queries (no server.mjs isso já foi feito).
 *
 *  - Performance (muitos alunos testando ao mesmo tempo):
 *      -> Ajuste "connectionLimit" com parcimônia; avalie métricas do servidor.
 */
