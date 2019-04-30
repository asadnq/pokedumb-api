"use strict";

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with pokemons
 */
const Database = use("Database");
const Helpers = use("Helpers");

const Pokemon = use("App/Models/Pokemon");
const Type = use("App/Models/Type");
const TypeList = use("App/Models/TypeList");
const Category = use("App/Models/Category");

class PokemonController {
  /**
   * Show a list of all pokemons.
   * GET pokemons
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, response, view }) {
    const pokemons = await Pokemon.query().paginate(1, 10);
    let promises = pokemons.toJSON().data.map(async pokemon => {
      const types = await Database.select("type_lists.id", "type_lists.name")
        .from("type_lists")
        .leftJoin("types", "type_lists.id", "types.type_id")
        .leftJoin("pokemons", "pokemons.id", "types.pokemon_id")
        .where("pokemons.id", pokemon.id);

      let pk = await Pokemon.find(pokemon.id);
      let pokemon_category = await pk.category().fetch();

      return {
        ...pokemon,
        type: types,
        category: pokemon_category
      };
    });

    const data = await Promise.all(promises);

    return response.json({
      data
    });
  }

  /**
   * Create/save a new pokemon.
   * Pokemon pokemons
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    try {
      const { name, category, type } = request.post();
      const user = await auth.getUser();
      //insert new pokemon
      const pokemon = new Pokemon();

      pokemon.name = name;

      //fetch image from post request
      const image = request.file("image", {
        types: ["image"],
        size: "2mb"
      });

      //generate unique name for image
      const uniqueTime = new Date().getTime();
      const fileNameToStore = `${uniqueTime}_pokemon_${name}_${user.id}.jpg`;

      //move image to 'public/uploads/pokemons' directory
      await image.move(Helpers.publicPath("uploads/pokemons"), {
        name: fileNameToStore,
        overwrite: true
      });

      if (!image.moved()) {
        console.log(image.error());
      }

      pokemon.image_url = fileNameToStore;

      //find pokemon category
      const pokemon_category = await Category.findBy("name", category);
      //if category doesn't exist
      if (!pokemon_category) {
        const new_pokemon_category = await Category.create({
          name: category
        });

        pokemon.category_id = new_pokemon_category.id;
      } else {
        pokemon.category_id = pokemon_category.id;
      }

      await pokemon.save();

      const parsedType = JSON.parse(type);
      let type_promises = parsedType.map(async t => {
        const find_type = await TypeList.find(t.id);
        const created_type = await Type.create({
          pokemon_id: pokemon.id,
          type_id: find_type.id
        });

        return find_type;
      });

      const type_resolved = await Promise.all(type_promises);

      const pokemon_category_to_send = await pokemon.category().fetch();
      const data = {
        ...pokemon.toJSON(),
        type: type_resolved,
        category: pokemon_category_to_send.toJSON()
      };

      return response.json({
        data
      });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Display a single pokemon.
   * GET pokemons/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ params, request, response }) {
    try {
      const pokemon = await Pokemon.find(params.id);
      // const types = await Type.query().where('pokemon_id', pokemon.id).fetch()
      const pokemon_category = await pokemon.category().fetch();

      const types = await Database.select("type_lists.id", "type_lists.name")
        .from("type_lists")
        .leftJoin("types", "type_lists.id", "types.type_id")
        .leftJoin("pokemons", "pokemons.id", "types.pokemon_id")
        .where("pokemons.id", params.id);

      let pokemon_types = [];

      types.map(type => pokemon_types.push(type));

      let data = {
        ...pokemon.toJSON(),
        category: {
          id: pokemon_category.id,
          name: pokemon_category.name
        },
        type: pokemon_types
      };

      return response.json({
        message: "beep",
        data
      });
    } catch (err) {
      throw err;
    }
  }
  /**
   * Update pokemon details.
   * PUT or PATCH pokemons/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, request, response }) {}

  /**
   * Delete a pokemon with id.
   * DELETE pokemons/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, request, response }) {}

  async searchPokemon({ params, request, response }) {
    const fields = [
      "pokemons.id",
      "pokemons.name",
      "pokemons.image_url",
      "category_id"
    ];

    const pokemons = await Database.select(fields)
      .from("pokemons")
      .leftJoin("categories", "pokemons.category_id", "categories.id")
      .leftJoin("types", "types.pokemon_id", "pokemons.id")
      .leftJoin("type_lists", "type_lists.id", "types.type_id")
      .where("pokemons.name", "LIKE", `%${params.q}%`)
      .orWhere("type_lists.name", "LIKE", `%${params.q}%`)
      .orWhere("categories.name", "LIKE", `%${params.q}%`);

    if (pokemons.length > 0) {
      let promises = pokemons.map(async pokemon => {
        const types = await Database.select("type_lists.id", "type_lists.name")
          .from("type_lists")
          .leftJoin("types", "type_lists.id", "types.type_id")
          .leftJoin("pokemons", "pokemons.id", "types.pokemon_id")
          .where("pokemons.id", pokemon.id);

        let pk = await Pokemon.find(pokemon.id);
        let pokemon_category = await pk.category().fetch();

        return {
          ...pokemon,
          type: types,
          category: pokemon_category
        };
      });
      const data = await Promise.all(promises);

      return response.json({
        message: "search success",
        data
      });
    } else {
      return response.json({
        message: "item not found"
      });
    }
  }

  async test({ params, request, response }) {
    const { type } = request.post();
    console.log(type);
    return response.send({
      data: type
    });
  }
}

module.exports = PokemonController;
