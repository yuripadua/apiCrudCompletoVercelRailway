/**
 * =============================================================================
 *  src/repositories/UsuarioMemoryRepository.js
 * -----------------------------------------------------------------------------
 *  Fallback em memória para Usuários, mantendo a mesma interface (async) usada
 *  pelos services (Auth/Usuario).
 *  - Dados são perdidos ao reiniciar o processo.
 * =============================================================================
 */

import { Usuario } from "../models/Usuario.js";

export class UsuarioMemoryRepository {
  constructor(initial = []) {
    this.items = [...initial]; // array de Model Usuario
    this._idSeq = this.items.length
      ? Math.max(...this.items.map((u) => Number(u.id || 0)))
      : 0;
  }

  async findAll() {
    return [...this.items];
  }

  async findById(id) {
    const found = this.items.find((u) => Number(u.id) === Number(id));
    return found || null;
  }

  async findByEmail(email) {
    const e = String(email).trim().toLowerCase();
    const found = this.items.find((u) => u.email === e);
    return found || null;
  }

  async create(usuarioModel) {
    const novo = new Usuario({
      id: ++this._idSeq,
      nome: usuarioModel.nome,
      email: usuarioModel.email,
      senha_hash: usuarioModel.senha_hash,
      created_at: new Date().toISOString(),
    });
    this.items.unshift(novo);
    return novo;
  }

  async update(id, { nome, email }) {
    const idx = this.items.findIndex((u) => Number(u.id) === Number(id));
    if (idx < 0) return null;
    const atual = this.items[idx];
    const atualizado = new Usuario({
      id: Number(id),
      nome: nome ?? atual.nome,
      email: email ?? atual.email,
      senha_hash: atual.senha_hash,
      created_at: atual.created_at,
    });
    this.items[idx] = atualizado;
    return atualizado;
  }

  async delete(id) {
    const prevLen = this.items.length;
    this.items = this.items.filter((u) => Number(u.id) !== Number(id));
    return this.items.length !== prevLen;
  }
}

