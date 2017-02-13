'use strict';
const blessed = require('blessed');
const widget = blessed.widget;
const util = require('util');

const Stream = require('./stream-tab')
const TextChatTab = require('./text-chat-tab')

module.exports =
class Chat extends widget.Box {
  constructor(options) {
    super(options)

    this.command = options.command
    const screen = this.screen
    const client = this.client = options.client
    const config = this.config = options.config

    const chatbox = this.chatbox = blessed.box({
      parent: this,
    })

    const logtab = this.logBox = blessed.box({
      parent: chatbox,
      hidden: true,
      border: 'line',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      tags: true,
    });


    const chattab = this.chattab = new TextChatTab({//Stream({
      parent: chatbox,
      height: '100%-1',
      client,
      config,
      command: this.command,
    });

    this.self = {
      u: String(client.todo.w_userno),
      n: client.todo.w_name,
    }

    this.tabs = blessed.box({
      parent: chatbox,
      top: '100%-1',
      height: 1,
    })

    chatbox.key(['i'], () => {
      this.command.setContent("{bold}-- INSERT --{/}")
      chattab.messageBox.focus()
      screen.render()
    })

    client.on('connect', () => {
      this.command.setContent('{bold}Connecting to ' + client.todo.w_useroom + '...{/}')
    })

    client.on('ee-main-chat-message', (data) => {
      if (data.xml.m == null) {
        this.command.setContent(JSON.stringify(data.xml))
      }
      screen.render()
    })

    client.on('ee-done', () => {
      this.command.setContent('connected')
      screen.render()
    })

    client.on('data', (data) => {
      this.logBox.pushLine('{red-fg}IN:  {/}' + util.inspect(data, { breakLength: Infinity, colors: true }))
    })

    client.on('send', (data) => {
      this.logBox.pushLine('{blue-fg}OUT: {/}' + util.inspect(data.xml, { breakLength: Infinity, colors: true }))
    })

    chatbox.focus()
  }
}
