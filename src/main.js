'use strict';
const http = require('http');

const blessed = require('blessed');
const XatUser = require('xat-client').XatUser;

const ConfigurationManager = require('./config')

const config = new ConfigurationManager()

const Chat = require('./widgets/chat');
const CommandLine = require('./widgets/command');

let chat = null;

let hiddenMode = false;

const screen = blessed.screen({
  fullUnicode: true,
  title: 'xat-cli',
  smartCSR: true,
});



const client = new XatUser(config.user).addExtension('user-actions').addExtension('extended-events').addExtension('chat-data').addExtension('lurker-timeout');

const command = new CommandLine({
  parent: screen,
  top: '100%-1',
  height: 1,
  client,
  config,
})

chat = new Chat({ 
  parent: screen,
  height: '100%-1',
  config: config,
  client: client,
  command,
//  hidden: true,
})

command.chat = chat

chat.chatbox.focus();

screen.key([':'], () => {
  command.focus()
});

//screen.render();
client.connect();
