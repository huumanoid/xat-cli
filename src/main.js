'use strict';
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

command.on('focus', function () {
  command.setValue(':');
  screen.render();
});
command.key(['backspace'], function (ch, key) {
  if (command.value === '') {
    command.cancel();
  }
});
command.on('submit', function (value) {
  value = value.substr(1).trim();
  const args = value.split(' ');
  const cmd = args[0];
  if (value === 'q') {
    return process.exit();
  } else if (value === 'm') {
    chat.messages.focus();
  } else if (value === 'u') {
    chat.userElements.focus();
  } else if (cmd === 'log') {
    chat.chatbox.hide();
    chat.logBox.show();
    chat.logBox.focus();
    screen.realloc();
    screen.render();
  } else if (cmd === 'nolog') {
    chat.logBox.hide();
    chat.chatbox.show();
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
  } else if (command === 'locate') {
    client.sendLocate(args[1]);
  } else {
    command.setValue('{red-bg}{white-fg}{bold}Unknown command: ' + value + '{/}');
    return screen.render();
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

screen.key(['i'], () => {
  command.setContent("{bold}-- INSERT --{/}");
  chat.messageBox.focus();
  screen.render();
});

screen.key([':'], () => command.focus());

screen.render();
client.connect();

