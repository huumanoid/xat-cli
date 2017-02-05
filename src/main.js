'use strict';
const http = require('http');

const blessed = require('blessed');
const XatUser = require('xat-client').XatUser;

const config = require('../config.js');

const Chat = require('./widgets/chat');
const Command = require('./widgets/command');

let chat = null;

let hiddenMode = false;

const screen = blessed.screen({
  fullUnicode: true,
  title: 'xat-cli',
  smartCSR: true,
});



const client = new XatUser(config.user).addExtension('user-actions').addExtension('extended-events').addExtension('chat-data').addExtension('lurker-timeout');

chat = new Chat({ 
  parent: screen,
  height: '100%-1',
  config: config,
  client: client,
//  hidden: true,
});

const command = new Command({
  parent: screen,
  top: '100%-1',
  height: 1,
  chat,
  client,
})

chat.command = command


chat.chatbox.focus();

screen.key([':'], () => {
  command.focus()
});

//screen.render();
client.connect();
