'use strict'

module.exports =
class History {
  constructor(textbox) {
    const { screen } = textbox

    const history = []
    let pointer = -1

    let current = ''

    textbox.on('submit', (value) => history.push(value))

    textbox.key(['up', 'down'], function (ch, key) {
      if (pointer === -1) {
        current = textbox.value
        pointer = history.length
      }

      if (key.name === 'up') {
        pointer--
      } else {
        pointer++
      }

      if (pointer < 0) {
        pointer = 0
      }
      if (pointer >= history.length) {
        pointer = -1
      }

      const nextValue = pointer === -1
        ? current
        : history[pointer]

      textbox.setValue(nextValue)

      screen.render()
    })

    textbox.on('keypress', (ch, key) => {
      if (key.name !== 'up' && key.name !== 'down') {
        pointer = -1
      }
    })
  }
}
