'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TypeListSchema extends Schema {
  up () {
    this.create('type_lists', (table) => {
      table.increments()
      table.string('name')
      table.timestamps()
    })
  }

  down () {
    this.drop('type_lists')
  }
}

module.exports = TypeListSchema
