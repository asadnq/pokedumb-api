"use strict";

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with pokemons
 */
const Database = use("Database");
const Helpers = use("Helpers");
const fs = require("fs");

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
  async index({ request, response }) {
    try {
      const getRequest = request.get();

      const page = getRequest.page || 1;
      const limit = getRequest.limit || 10;
      const query = Pokemon.query()
        .select(
          "pokemons.*",
          "categories.name as category_name",
          "type_lists.id as type_id"
        )
        .from("pokemons")
        .leftJoin("categories", "categories.id", "pokemons.category_id")
        .leftJoin("types", "types.pokemon_id", "pokemons.id")
        .leftJoin("type_lists", "types.type_id", "type_lists.id");

      if (getRequest.name_like) {
        query
          .where("pokemons.name", "LIKE", `%${getRequest.name_like}%`)
          .orWhere("categories.name", "LIKE", `%${getRequest.name_like}%`);
      }

      if (getRequest.category) {
        if (typeof getRequest.category == "number") {
          query.where("category_id", getRequest.category);
        } else {
          query.where("categories.name", "LIKE", `%${getRequest.category}%`);
        }
      }
      if (getRequest.type_in) {
        //query.whereIn("type_id", getRequest.type_in);
        const types = Array.from(getRequest.type_in.toString());
        query.whereIn("type_id", types);
      }

      query.with("category");
      query.with("types");

      const pokemons = await query.groupBy("pokemons.id").paginate(page, limit);
      return response.status(200).json(pokemons);
    } catch (err) {
      return response.json(err);
    }
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
      const { name, category, type, latitude, longitude } = request.post();
      const user = await auth.getUser();
      //insert new pokemon
      const pokemon = new Pokemon();

      pokemon.name = name;
      pokemon.latitude = latitude;
      pokemon.longitude = longitude;
      pokemon.user_id = user.id;
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
        throw { status: 500, message: "error while moving file." };
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
        types: type_resolved,
        category: pokemon_category_to_send.toJSON()
      };

      return response.status(201).json({
        data
      });
    } catch (err) {
      throw response.status(500).json(err);
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
        type: pokemon_types,
        latitude: pokemon.toJSON().latitude,
        longitude: pokemon.toJSON().longitude
      };

      return response.status(200).json({
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
  async update({ auth, params, request, response }) {
    try {
      const { name, category, type, latitude, longitude } = request.post();
      const user = await auth.getUser();

      const pokemon = await Pokemon.find(params.id);
      if (pokemon.user_id !== user.id) {
        throw { status: 401, message: "unauthorized action." };
      }
      pokemon.user_id = user.id;
      pokemon.name = name;
      pokemon.latitude = latitude;
      pokemon.longitude = longitude;
      const pokemon_category = await Category.findBy("name", category);
      if (!pokemon_category) {
        const new_pokemon_category = await Category.create({ name: category });
        pokemon.category_id = new_pokemon_category.id;
      } else {
        pokemon.category_id = pokemon_category.id;
      }
      const image = request.file("image");

      if (image) {
        const old_image =
          Helpers.publicPath("uploads/pokemons") + "/" + pokemon.image_url;
        fs.unlink(old_image, err => {
          if (err) {
            throw err;
          }
        });
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
      }

      await pokemon.save();
      const pokemon_category_to_send = await pokemon.category().fetch();
      const old_pokemon_type = await Type.query()
        .where("pokemon_id", pokemon.id)
        .delete();

      const parsedType = JSON.parse(type);
      //const parsedType = type; //can't parse type if request made from postman
      let type_promises = parsedType.map(async t => {
        const find_type = await TypeList.find(t.id);
        const created_type = await Type.create({
          pokemon_id: pokemon.id,
          type_id: find_type.id
        });

        return find_type;
      });
      const type_resolved = await Promise.all(type_promises);
      return response.status(201).json({
        data: {
          ...pokemon.toJSON(),
          types: type_resolved,
          category: pokemon_category_to_send.toJSON()
        }
      });
    } catch (err) {
      //return response.json(err);
      throw err;
      console.log(err);
    }
  }

  /**
   * Delete a pokemon with id.
   * DELETE pokemons/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, request, response }) {
    try {
      const pokemon = await Pokemon.find(params.id);
      if (!pokemon) {
        throw { message: "pokemon not found.", status: 404 };
      }
      const image =
        Helpers.publicPath("uploads/pokemons") + "/" + pokemon.image_url;
      fs.unlink(image, err => {
        if (err) {
          throw { message: "error while trying to replace image", status: 500 };
        }
      });

      await pokemon.delete();
      return response.status(200).json({
        data: pokemon
      });
    } catch (err) {
      throw response.json(err);
    }
  }

  async test({ params, request, response }) {
    try {
      if (1 === 1) {
        throw { message: "error message", status: 404 };
      }
      const query = await Pokemon.query()
        .leftJoin("categories", "pokemons.category_id", "categories.id")
        .where("categories.name", "turtle")
        .fetch();

      return response.status(200).json(query);
    } catch (err) {
      return response.json(err);
    }
  }
}

module.exports = PokemonController;
