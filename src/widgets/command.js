'use strict'

const blessed = require('blessed')
const widget = blessed.widget

module.exports =
class CommandLine extends widget.textbox {
  constructor(options) {
    super(Object.assign({}, options, {
      inputOnFocus: true,
      tags: true,
    }))

    const screen = this.screen
    const chat = this.chat = options.chat
    const client = this.client = options.client
    const config = this.config = options.config

    const command = this

    let commandHistory = [];
    let commandHistoryPointer = -1;

    command.on('focus', function () {
      command.setValue(':');
      screen.render();
    });
    command.key(['backspace'], function (ch, key) {
      if (command.value === '') {
        command.cancel();
      }
    });
    command.key(['up', 'down'], function (ch, key) {
      if (command.value === ':' || commandHistoryPointer !== -1) {
        if (commandHistoryPointer === -1)
          commandHistoryPointer = commandHistory.length;
        if (key.name === 'up') {
          commandHistoryPointer--;
          if (commandHistoryPointer < 0)
            commandHistoryPointer = 0;
        } else {
          commandHistoryPointer++;
          if (commandHistoryPointer >= commandHistory.length) {
            command.setValue(':');
            commandHistoryPointer = -1;
            screen.render();
            return;
          }
        }
        if (commandHistoryPointer !== -1) {
          command.setValue(commandHistory[commandHistoryPointer]);
          screen.render();
        }
      }
    });
    command.on('keypress', (ch, key) => {
      if (key.name !== 'up' && key.name !== 'down') {
        commandHistoryPointer = -1;
      }
    });
    command.on('submit', function (value) {
      commandHistory.push(value);
      value = value.substr(1).trim();
      function setError(message) {
        command.setContent('{red-bg}{white-fg}{bold}' + message + '{/}');
        screen.render();
      }

      const args = value.split(' ');
      const cmd = args[0];
      let error = null;
      let response = ''

      if (value === 'q') {
        process.exit();
      } else if (value === 'm') {
        chat.messagesBox.focus();
      } else if (value === 'u') {
        chat.usersBox.focus();
      } else if (cmd === 'log') {
        chat.maintab.hide();
        chat.logBox.show();
        chat.logBox.focus();
        screen.realloc();
        screen.render();
      } else if (cmd === 'nolog') {
        chat.logBox.hide();
        chat.maintab.show();
        chat.maintab.focus();
        screen.realloc();
        screen.render();
      } else if (cmd === 'signin') {
        client.sendTextMessage('/go#' + args[1]);
        const redirect = function redirect(data) {
          if (data.q && data.q.attributes.r) {
            client.removeListener('data', redirect);
            client.end();
            client.todo.w_useroom = data.q.attributes.r;
            client.connect();
          }
        }
        client.on('data', redirect);
      } else if (cmd === 'id2reg' || cmd === 'idtoreg') {
        if (!config.httpservices || !config.httpservices.id2reg) {
          return setError('id2reg is not supported');
        }

        if (!args[1]) {
          return setError('id2reg invalid format. Usage: id2reg id');
        }

        const id2reg = config.httpservices.id2reg;

        http.get(id2reg.url.replace(id2reg.placeholder, args[1]), (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            command.setValue(`id2reg for ${args[1]} is ${id2reg.fetchResult(body)}`);
            screen.render();
          });
        }).on('error', (e) => {
          setError('id2reg http error:' + JSON.stringify(e));
        });
      } else if (cmd === 'locate') {
        client.sendLocate(args[1]);
      } else if (cmd === 'hiddenmode') {
        if (!args[1]) {
          command.setValue(`State of hiddenmode: ${hiddenMode ? 'on' : 'off'}`);
          screen.render();
          return;
          //return setError('Usage: hiddenmode [on|off]');
        }
        //hiddenMode = args[1].toLowerCase() === 'on';
      } else {
        return setError('Unknown command: ' + value);
      }
      command.setValue('');
      screen.render();
    });
  }
}
