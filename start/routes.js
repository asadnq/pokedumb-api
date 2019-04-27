'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

Route.group(() => {
	Route.resource('pokemons', 'PokemonController').apiOnly()
	Route.resource('types', 'TypeController').apiOnly()
	Route.post('auth/register', 'AuthController.register')
	Route.post('auth/login', 'AuthController.login')
	Route.get('pokemons/search/:q', 'PokemonController.searchPokemon')
	Route.post('test', 'PokemonController.test')
}).prefix('api/v1');