"use strict";

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use("Model");

class Type extends Model {
  typeLists() {
    return this.hasOne("App/Models/TypeList", "type_id", "id");
  }
}

module.exports = Type;
