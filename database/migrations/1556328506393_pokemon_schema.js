"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class PokemonSchema extends Schema {
  up() {
    this.create("pokemons", table => {
      table.increments();
      table.string("name");
      table.string("image_url");
      table
        .integer("category_id")
        .unsigned()
        .references("id")
        .inTable("categories")
        .onDelete("cascade")
        .onUpdate("cascade");
      table
        .integer("user_id")
        .unsigned()
        .references("id")
        .inTable("users");
      table.float("lat", 10, 6);
      table.float("lng", 10, 6);
      table.timestamps();
    });
  }

  down() {
    this.drop("pokemons");
  }
}

module.exports = PokemonSchema;
