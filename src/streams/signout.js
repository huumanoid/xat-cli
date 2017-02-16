'use strict'
const blessed = require('blessed')
const widget = blessed.widget
const StreamTab = require('../widgets/stream-tab')
const xatapi = require('xatapi')

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

    const getLurkerReport = (regname) =>
      `${datetime.toLocaleDateString()} ${datetime.toLocaleTimeString()} id ${lurkerId} regname: ${regname}`

    this.messagesBox.pushLine(getLurkerReport('fetching...'))

    const lineNumber = this.messagesBox.getLines().length - 1

    xatapi.getRegname(lurkerId, (err, regname) => {
      if (err) {
        regname = 'Not found'
      }
      this.messagesBox.setLine(lineNumber, getLurkerReport(regname))

      this.screen.render()
    })
  }
}

