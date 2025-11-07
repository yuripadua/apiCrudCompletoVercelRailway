/**
 * =============================================================================
 *  src/repositories/NotaFiscalMemoryRepository.js
 * -----------------------------------------------------------------------------
 *  Fallback em memória para Notas Fiscais. Mantém a interface síncrona do
 *  NotaFiscalSqliteRepository, usada pelo Service.
 * =============================================================================
 */

import { NotaFiscal } from "../models/NotaFiscal.js";

export class NotaFiscalMemoryRepository {
  constructor(initial = []) {
    this.items = initial.map((n) => new NotaFiscal(n)); // guardamos Models
    this._idSeq = this.items.length
      ? Math.max(...this.items.map((n) => Number(n.id || 0)))
      : 0;
  }

  findAll() {
    // Retorna Models
    // Ordena do id mais recente para o antigo, como no SQLite repo
    return [...this.items].sort((a, b) => Number(b.id) - Number(a.id));
  }

  findById(id) {
    return this.items.find((n) => Number(n.id) === Number(id)) || null;
  }

  findByNumero(numero) {
    const num = String(numero);
    return this.items.find((n) => n.numero === num) || null;
  }

  create(notaModel) {
    const novo = new NotaFiscal({
      id: ++this._idSeq,
      numero: notaModel.numero,
      cliente_nome: notaModel.cliente_nome,
      itens: notaModel.itens,
      total: notaModel.total,
      created_at: notaModel.created_at,
    });
    this.items.unshift(novo);
    return this.findById(novo.id);
  }

  update(id, notaModel) {
    const idx = this.items.findIndex((n) => Number(n.id) === Number(id));
    if (idx < 0) return null;
    const atualizado = new NotaFiscal({
      id: Number(id),
      numero: notaModel.numero,
      cliente_nome: notaModel.cliente_nome,
      itens: notaModel.itens,
      total: notaModel.total,
      created_at: notaModel.created_at,
    });
    this.items[idx] = atualizado;
    return this.findById(id);
  }

  delete(id) {
    const prev = this.items.length;
    this.items = this.items.filter((n) => Number(n.id) !== Number(id));
    return this.items.length !== prev;
  }
}

