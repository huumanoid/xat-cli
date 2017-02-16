'use strict';
const blessed = require('blessed');
const widget = blessed.widget;

module.exports =
class UserInfo extends widget.box {
  constructor(options) {
    const filteredOptions = Object.assign({}, options)
    delete filteredOptions.user
    super(filteredOptions)

    const user = this.user = options.user

    this.pushLine('{red-fg}Username:{/} ' + user.n.substr(0, 100))
    this.pushLine('{red-fg}Regname:{/}  ' + user.N)
    this.pushLine('{red-fg}Avatar:{/}   ' + user.a.substr(0, 100))
    this.pushLine('{red-fg}Homepage{/}  ' + user.h.substr(0, 100))
    this.pushLine('{red-fg}Id{/}        ' + user.u)
  }
}
