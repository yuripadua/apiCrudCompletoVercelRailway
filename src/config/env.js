/**
 * =============================================================================
 *  src/config/env.js
 * -----------------------------------------------------------------------------
 *  Objetivo deste arquivo:
 *    - Centralizar a leitura e a padronização de variáveis de ambiente (.env).
 *    - Expor constantes nomeadas (API_NAME, PORT, JWT_SECRET, etc.) para o resto
 *      da aplicação, evitando "process.env" espalhado pelo código.
 *
 *  Por que isso é importante?
 *    - Facilita testes: podemos "mockar" este módulo.
 *    - Evita bugs de digitação em chaves de ambiente.
 *    - Mantém valores default sensatos para desenvolvimento.
 *
 *  .env (exemplo no projeto: ".env.example")
 *  ---------------------------------------------------------------------------
 *  API_NAME="API Aula CRUD 3 Repositórios (Split)"
 *  PORT=4000
 *  JWT_SECRET=um-segredo-grande-e-unico
 *  MYSQL_HOST=localhost
 *  MYSQL_USER=root
 *  MYSQL_PASSWORD=admin
 *  MYSQL_DATABASE=aula_backend_uniso
 *  SQLITE_FILE=./notas.db
 *  PRODUTOS_JSON=./produtos.json
 *  ---------------------------------------------------------------------------
 *
 *  Observações:
 *   - Nunca commitar o arquivo .env com segredos reais (gitignore nele).
 *   - Em produção (Docker/K8s/Cloud), esses valores costumam vir por variáveis
 *     da plataforma (Secrets/ConfigMaps) e NÃO pelo arquivo .env.
 *   - JWT_SECRET precisa ser forte e único por instância/sistema (NÃO reutilize).
 * =============================================================================
 */

import dotenv from "dotenv"; // Carrega variáveis do arquivo .env para process.env
import path from "path"; // Utilitário para manipular caminhos de forma portável (Windows/Linux/Mac)
import { fileURLToPath } from "url"; // Necessário para reproduzir __filename/__dirname no modo ESM (import/export)

// -----------------------------------------------------------------------------
// 1) Carrega as variáveis definidas em .env (se existir).
//    - A função dotenv.config() procura um arquivo ".env" na raiz do projeto.
//    - Se não existir, segue apenas com as variáveis já presentes no ambiente.
// -----------------------------------------------------------------------------
dotenv.config();

// -----------------------------------------------------------------------------
// 2) Em módulos ESM (import/export), __filename e __dirname não existem por padrão.
//    Este bloco recria esses valores de forma compatível.
//    - import.meta.url é uma URL; fileURLToPath converte para caminho de sistema.
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//  Agora __filename contém o caminho completo deste arquivo,
//  e __dirname contém o diretório onde ele está.

// -----------------------------------------------------------------------------
// 3) Exposição das configurações como constantes nomeadas.
//    Padrão: "pegar do ambiente" OU "usar um valor padrão sensato".
//    Isso torna o consumo desses valores previsível no restante do sistema.
// -----------------------------------------------------------------------------

// Nome "humano" da API para logs, documentação e retornos simples.
export const API_NAME =
  process.env.API_NAME || "API Aula CRUD 3 Repositórios (Split)";

// Porta do servidor HTTP:
// - process.env.PORT é string; parseInt converte para número.
// - Sempre especifique a base 10 (segundo argumento) por segurança.
export const PORT = parseInt(process.env.PORT || "4000", 10);

// Segredo do JWT:
// - Em DEV, temos um fallback. Em PRODUÇÃO, sempre defina JWT_SECRET via ambiente.
// - Boas práticas: usar um valor grande, aleatório e armazenado com segurança (ex.: Secret Manager).
export const JWT_SECRET =
  process.env.JWT_SECRET || "DEVELOPMENT-ONLY-CHANGE-THIS";

// Configurações de conexão do MySQL para o módulo de Usuários.
// - Em provedores de nuvem (Railway, PlanetScale, RDS, etc.), essas variáveis
//   virão do painel de configuração/segredos.
// Suporte a múltiplos nomes de variáveis (Railway e afins)
function pickEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

// Connection URL direta (se disponibilizada pelo provedor)
// Preferir URL pública do Railway quando existir (funciona fora da rede Railway)
export const MYSQL_URL =
  pickEnv(
    "MYSQL_PUBLIC_URL",
    "MYSQL_URL",
    "JAWSDB_URL",
    "CLEARDB_DATABASE_URL",
    "DATABASE_URL"
  ) || "";

export const MYSQL_HOST =
  pickEnv("MYSQL_HOST", "MYSQLHOST") || "localhost";
export const MYSQL_USER = pickEnv("MYSQL_USER", "MYSQLUSER") || "root";
export const MYSQL_PASSWORD =
  pickEnv("MYSQL_PASSWORD", "MYSQLPASSWORD") || "admin";
export const MYSQL_DATABASE =
  pickEnv("MYSQL_DATABASE", "MYSQLDATABASE") || "aula_backend_uniso";
export const MYSQL_PORT = parseInt(
  pickEnv("MYSQL_PORT", "MYSQLPORT") || "3306",
  10
);
export const MYSQL_SSL = /^true$/i.test(pickEnv("MYSQL_SSL") || "false");

// Caminhos de arquivos (SQLite e JSON):
// - path.join(process.cwd(), ...) garante que esses caminhos serão resolvidos
//   a partir do diretório atual onde o processo foi iniciado (geralmente a raiz do projeto).
// - Usar path.join é importante para funcionar igualmente em Windows (\\) e Linux (/).
export const SQLITE_FILE =
  process.env.SQLITE_FILE || path.join(process.cwd(), "notas.db");

export const PRODUTOS_JSON =
  process.env.PRODUTOS_JSON || path.join(process.cwd(), "produtos.json");

/**
 * Dicas para troubleshooting:
 * -----------------------------------------------------------------------------
 *  - "dotenv.config()" não carregou?
 *      -> Verifique se o arquivo .env existe na RAIZ do projeto.
 *      -> Confirme permissões de leitura do arquivo.
 *
 *  - Porta ocupada (EADDRINUSE)?
 *      -> Altere PORT no .env (ex.: 4001) ou pare o processo que está usando a porta.
 *
 *  - JWT inválido/expirando?
 *      -> Garante que JWT_SECRET não mudou entre "login" e "uso" do token.
 *      -> Ajuste o tempo de expiração no gerador de token (utils/jwt.js).
 *
 *  - Erro de conexão no MySQL?
 *      -> Confirme host/porta/usuário/senha/banco. Teste com um cliente externo (ex.: DBeaver).
 *
 *  - Arquivo SQLite/JSON não aparece?
 *      -> Eles são criados/destravados em runtime pelos respectivos módulos.
 *      -> Confira se o processo possui permissão de escrita no diretório.
 *
 *  Como importar estas constantes em outros módulos:
 *      import { PORT, MYSQL_HOST } from './src/config/env.js';
 */
