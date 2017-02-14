'use strict';
const blessed = require('blessed');
const widget = blessed.widget;
const util = require('util');

const Stream = require('./stream-tab')
const TextChatTab = require('./text-chat-tab')
const PrivateChatTab = require('./private-chat')

module.exports =
class Chat extends widget.Box {
  constructor(options) {
    super(options)

    this.command = options.command
    const screen = this.screen
    const client = this.client = options.client
    const config = this.config = options.config

    const tabs = this.tabs = []

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
      height: '100%-1',
    });


    const chattab = new TextChatTab({//Stream({
      parent: chatbox,
      height: '100%-1',
      client,
      hidden: true,
      config,
      command: this.command,
      name: 'main',
    });

    tabs.push(chattab)

    tabs.push(new Stream({
      parent: chatbox,
      height: '100%-1',
      client,
      config,
      hidden: true,
      command: this.command,
      name: 'log',
    }))

    this.self = {
      u: String(client.todo.w_userno),
      n: client.todo.w_name,
    }

    this.tabsBar = blessed.listbar({
      parent: chatbox,
      top: '100%-1',
      keys: true,
      mouse: true,
      height: 1,
      autoCommandKeys: false,
      style: {
        selected: {
          bg: 'blue',
        },
      },
    })

    // Listener is required to capture 'key i' for chatbox itself.
    // Without this listener, 'element key i' wouldn't be called
    // when 'i' pressed in chatbox itself.
    chatbox.on('key i', () => {})

    chatbox.on('element key i', () => {
      this.command.setContent("{bold}-- INSERT --{/}")
      this.currentTab.messageBox.focus()
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
      screen.render()
    })

    client.on('send', (data) => {
      this.logBox.pushLine('{blue-fg}OUT: {/}' + util.inspect(data.xml, { breakLength: Infinity, colors: true }))
      screen.render()
    })

    this.updateTabs()

    chatbox.focus()

    this.tabsBar.selectTab(1)
  }

  updateTabs() {
    const items = {}

    const selectTab = (tab) => {
      if (this.currentTab) {
        this.currentTab.hide()
        this.currentTab.selected = false
      }

      this.currentTab = tab
      tab.show()
      tab.selected = true
      this.screen.render()
    }

    let selected = -1

    for (let i = 0; i < this.tabs.length; ++i) {
      const tab = this.tabs[i]
      const name = tab.name ? tab.name : i
      items[name] = selectTab.bind(null, tab)

      if (tab.selected) {
        selected = i
      }
    }

    this.tabsBar.setItems(items);

    if (selected >= 0) {
      this.tabsBar.selectTab(selected)
    }
  }

  createPC(userno) {
    for (const tab of this.tabs) {
      tab.selected = false
    }

    this.tabs.push(new PrivateChatTab({
      parent: this.chatbox,
      height: '100%-1',
      client: this.client,
      config: this.config,
      hidden: true,
      command: this.command,
      name: 'pc ' + userno,
      dest: userno,
      selected: true,
    }))

    this.updateTabs()
  }
}
