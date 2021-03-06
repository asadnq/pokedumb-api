"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class TypeSchema extends Schema {
  up() {
    this.create("types", table => {
      table.increments();
      table
        .integer("pokemon_id")
        .unsigned()
        .references("id")
        .inTable("pokemons")
        .onDelete("cascade")
        .onUpdate("cascade");
      table
        .integer("type_id")
        .unsigned()
        .references("id")
        .inTable("type_lists")
        .onDelete("cascade")
        .onUpdate("cascade");
      table.timestamps();
    });
  }

  down() {
    this.drop("types");
  }
}

module.exports = TypeSchema;
