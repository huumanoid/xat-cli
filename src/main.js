'use strict';
const http = require('http');

const blessed = require('blessed');
const XatUser = require('xat-client').XatUser;

const config = require('../config.js');
const Chat = require('./widgets/chat');

let chat = null;

const screen = blessed.screen({
  fullUnicode: true,
  title: 'xat-cli',
  smartCSR: true,
});

const commandForm = blessed.form({
  parent: screen,
  top: '100%-1',
  height: 1,
});

const command = blessed.textbox({
  parent: commandForm,
  inputOnFocus: true,
  tags: true,
});

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
    chat.chatbox.hide();
    chat.logBox.show();
    chat.logBox.focus();
    screen.realloc();
    screen.render();
  } else if (cmd === 'nolog') {
    chat.logBox.hide();
    chat.chatbox.show();
    chat.chatbox.focus();
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
  } else if (command === 'locate') {
    client.sendLocate(args[1]);
  } else {
    return setError('Unknown command: ' + value);
  }
  command.setValue('');
  screen.render();
});


const client = new XatUser(config.user).addExtension('user-actions').addExtension('extended-events').addExtension('chat-data');

chat = new Chat({ 
  parent: screen,
  height: '100%-1',
  config: config,
  client: client,
  command: command,
//  hidden: true,
});

chat.chatbox.focus();

screen.key([':'], () => command.focus());

screen.render();
client.connect();

