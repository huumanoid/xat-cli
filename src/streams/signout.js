'use strict'
const blessed = require('blessed')
const widget = blessed.widget
const StreamTab = require('../widgets/stream-tab')
const xatapi = require('xatapi')

const and = require('../util/predicates').and

module.exports =
class LurkerLogStream extends StreamTab {
  constructor(options) {
    const filters = options.filters || {}
    filters.input = ((data) => {
      return data.types.indexOf('user-signout') >= 0
    })

    filters.output = (data) => false

    super(Object.assign({}, options, { filters }))
  }

  addMessage(channel, data) {
    const lurkerId = data.xml.l.attributes.u
    const datetime = new Date()

    xatapi.getRegname(lurkerId, (err, regname) => {
      this.messagesBox.pushLine(`${datetime.toLocaleDateString()} ${datetime.toLocaleTimeString()} id ${lurkerId} regname: "${regname}"`)
    })
  }
}

