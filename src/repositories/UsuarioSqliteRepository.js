/**
 * =============================================================================
 *  src/repositories/UsuarioSqliteRepository.js
 * -----------------------------------------------------------------------------
 *  Fallback para Usuários usando SQLite (mesmo arquivo do SQLite das notas).
 *  Mantém a mesma interface do UsuarioMySqlRepository (métodos async),
 *  mas implementa via better-sqlite3 (síncrono) sob o capô.
 * =============================================================================
 */

import { Usuario } from "../models/Usuario.js";

export class UsuarioSqliteRepository {
  constructor(sqliteDb) {
    this.db = sqliteDb;
    // Garante tabela (também criada em initSqlite, mas mantemos idempotência aqui)
    this.db
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
  }

  async findAll() {
    const rows = this.db
      .prepare(
        `SELECT id, nome, email, senha_hash, created_at
         FROM usuarios
         ORDER BY id DESC;`
      )
      .all();
    return rows.map((r) => Usuario.fromDbRow(r));
  }

  async findById(id) {
    const row = this.db
      .prepare(
        `SELECT id, nome, email, senha_hash, created_at
         FROM usuarios
         WHERE id = ?;`
      )
      .get(id);
    return row ? Usuario.fromDbRow(row) : null;
  }

  async findByEmail(email) {
    const row = this.db
      .prepare(
        `SELECT id, nome, email, senha_hash, created_at
         FROM usuarios
         WHERE email = ?;`
      )
      .get(email);
    return row ? Usuario.fromDbRow(row) : null;
  }

  async create(usuarioModel) {
    const stmt = this.db.prepare(
      `INSERT INTO usuarios (nome, email, senha_hash)
       VALUES (?, ?, ?);`
    );
    const info = stmt.run(...usuarioModel.toDbInsertParams());
    return this.findById(info.lastInsertRowid);
  }

  async update(id, { nome, email }) {
    this.db
      .prepare(`UPDATE usuarios SET nome = ?, email = ? WHERE id = ?;`)
      .run(nome, email, id);
    return this.findById(id);
  }

  async delete(id) {
    const info = this.db
      .prepare(`DELETE FROM usuarios WHERE id = ?;`)
      .run(id);
    return info.changes > 0;
  }
}

