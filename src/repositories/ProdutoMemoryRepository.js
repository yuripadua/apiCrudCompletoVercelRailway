/**
 * =============================================================================
 *  src/repositories/ProdutoMemoryRepository.js
 * -----------------------------------------------------------------------------
 *  Fallback em memória para Produtos. Interface compatível com ProdutoJsonRepository.
 * =============================================================================
 */

import { Produto } from "../models/Produto.js";

export class ProdutoMemoryRepository {
  constructor(initial = []) {
    // Armazenamos objetos "planos" internamente e convertemos para Model ao ler
    this.items = initial.map((p) => new Produto(p).toPlain());
    this._idSeq = this.items.length
      ? Math.max(...this.items.map((p) => Number(p.id || 0)))
      : 0;
  }

  async _readAllPlain() {
    return [...this.items];
  }

  async _writeAllPlain(lista) {
    this.items = [...lista];
  }

  async findAll() {
    const plain = await this._readAllPlain();
    return plain.map((p) => Produto.fromPlain(p));
  }

  async findById(id) {
    const plain = await this._readAllPlain();
    const found = plain.find((p) => Number(p.id) === Number(id));
    return found ? Produto.fromPlain(found) : null;
  }

  async create(produtoModel) {
    const lista = await this._readAllPlain();
    const novoId = lista.length ? Math.max(...lista.map((p) => Number(p.id))) + 1 : 1;

    const novo = new Produto({ id: novoId, nome: produtoModel.nome, preco: produtoModel.preco });
    lista.push(novo.toPlain());
    await this._writeAllPlain(lista);
    return novo;
  }

  async update(id, { nome, preco }) {
    const lista = await this._readAllPlain();
    const idx = lista.findIndex((p) => Number(p.id) === Number(id));
    if (idx < 0) return null;
    const atual = lista[idx];
    const atualizado = new Produto({ id: Number(id), nome: nome ?? atual.nome, preco: preco ?? atual.preco });
    lista[idx] = atualizado.toPlain();
    await this._writeAllPlain(lista);
    return atualizado;
  }

  async delete(id) {
    const lista = await this._readAllPlain();
    const filtrado = lista.filter((p) => Number(p.id) !== Number(id));
    const mudou = filtrado.length !== lista.length;
    if (mudou) await this._writeAllPlain(filtrado);
    return mudou;
  }
}

