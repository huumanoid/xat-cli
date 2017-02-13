'use strict'
const blessed = require('blessed')
const widget = blessed.widget
const util = require('util');

module.exports =
class StreamTab extends widget.box {
  constructor(options) {
    super(options)

    const client = this.client = options.client
    const filters = this.filters = options.filters || {}
    filters.input = filters.input || (() => true)
    filters.output = filters.output || (() => true)

    this.config = options.config
    this.command = options.command
    this.name = options.name || null
    this.selected = options.selected || false

    this.users = []

    this.self = {
      u: String(client.todo.w_userno),
      n: client.todo.w_name,
    }

    const messages = this.messagesBox = this.getMessagesComponent()
    messages.on('keypress', (ch, key) => {
      this.parent.emit('key ' + key.full);
    })

    this.usersBox = this.getUsersComponent()

    this.usersBox.on('keypress', (ch, key) => {
      this.parent.emit('key ' + key.full);
    })

    this.messageBox = this.getMessageBox()

    client.on('close', () => {
      this.self.online = false
    })

    client.on('ee-done', () => {
      this.self.online = true
      this.rebuildUserList()
      this.screen.render()
    })

    client.on('connect', () => {
      while (this.messagesBox.children.length) {
        const message = this.messagesBox.children[this.messagesBox.children.length - 1]
        this.messagesBox.remove(message)
      }
      this.users = [this.self]
      this.rebuildUserList()
      this.screen.render()
    })

    client.on('ee-user-signout', this.proceed.bind(this, 'user-out'))

    client.on('ee-user', this.proceed.bind(this, 'user-in'))

    client.on('ee-chat-meta', ({xml}) => {
      this.self.f = xml.i.attributes.r
    })

    client.on('ee-event', (data) => {
      if (filters.input(data)) {
          this.proceed('input', data)
      }
    })

    client.on('send', (data) => {
      if (filters.output(data)) {
        this.proceed('output', data)
      }
    })
  }

  proceed(channel, data) {
    const xml = data.xml
    switch (channel) {
      case 'input':
      case 'output':
        this.addMessage(channel, data)
        this.messagesBox.setScrollPerc(100);//scrollTo(messages.children.length - 30);
        this.screen.render()
        break
      case 'user-in': {
          const online = xml.o == null;
          let user = (xml.o || xml.u).attributes;

          user = JSON.parse(JSON.stringify(user)); //clone
          user.online = online;
          this.addUser(user);
          this.screen.render();
        }
        break
      case 'user-out': {
          const userId = xml.l.attributes.u
          let user = this.findUser(userId)
          if (user) {
            user.online = false
            this.rebuildUserList()
            screen.render()
          }
        }
        break
    }
  }

  getMessagesComponent() {
    return blessed.box({
      parent: this,
      border: 'line',
      style: {
        focus: {
          border: {
            fg: 'blue',
          },
        },
      },
      keyable: true,
      keys: true,
      vi: true,
      width: '80%',
      height: '100%-3',
      scrollable: true,
      scrollbar: {
        ch: ' ',
        inverse: true,
        style: {
          bg: 'red',
          fg: 'blue',
        },
      },
      tags: true,
      alwaysScroll: true,
    })
  }

  getUsersComponent() {
    const usersBox = blessed.box({
      parent: this,
      keys: true,
      vi: true,
      width: '20%',
      left: '80%',
      border: 'line',
      height: '100%-3',
      style: {
        focus: {
          border: {
            fg: 'blue',
          },
        },
      },
      scrollable: true,
      scrollbar: {
      },
      alwaysScroll: true,
    });

    usersBox.select = (n) => {
      const list = usersBox

      const prevSelected = list.selected

      if (n == null) n = list.selected || 0
      if (n < 0) n = 0
      if (n >= list.children.length) n = list.children.length - 1

      if (prevSelected != null
        && prevSelected < list.children.length) {
        list.children[prevSelected].style.bg = -1
      }

      if (list.focused && n >= 0) {
        list.children[n].style.bg = 0xff0000
      }

      list.selected = n
      this.screen.render()
    }

    usersBox.on('focus', () => usersBox.select())
    usersBox.on('blur', () => usersBox.select())

    usersBox.on('keypress', (ch, key) => {
      const list = usersBox
      const selected = list.selected
      let newSelected = null
      if (key.name === 'down' || key.name === 'j') {
        if (selected < list.children.length - 1) {
          newSelected = selected + 1
        }
      }
      if (key.name === 'up' || key.name === 'k') {
        if (selected > 0) {
          newSelected = selected - 1
        }
      }

      if (newSelected != null) {
        const children = list.children
        children[selected].style.bg = -1
        children[newSelected].style.bg = 0xff0000
        list.selected = newSelected
        this.screen.render()
      }
      //this.messagesBox.setContent(JSON.stringify({ch, key, selected, newSelected}))

      chatbox.emit('key ' + key.full);
    })

    return usersBox
  }

  getMessageBox() {
    const messageBox = blessed.textbox({ 
      parent: this,
      border: 'line',
      style: {
        focus: {
          border: {
            fg: 'blue',
          },
        },
      },
      top: '100%-3',
      height: 3,
      content: 'text',
      inputOnFocus: true,
    })


    messageBox.on('submit', (message) => {
      messageBox.clearValue()
      this.screen.render()
      this.submitMessage(message)
      messageBox.focus()
    })

    messageBox.on('cancel', () => {
      this.command.setContent()
      this.screen.render()
    });
    return messageBox
  }

  submitMessage(message) {
    this.client.sendTextMessage(message)
  }

  addUser(user) {
    const old = this.findUserIndex(user.u)
    if (old >= 0) {
      this.users.splice(old, 1);
    }
    this.users.push(user);
    if (this.client.gotDone) {
      this.rebuildUserList();
    }
  }

  findUserIndex(userId) {
    for (let i = 0; i < this.users.length; ++i) {
      if (this.users[i].u === userId) {
        return i;
      }
    }
    return -1;
  }

  findUser(userId) {
    return this.users[this.findUserIndex(userId)] || null;
  }

  rebuildUserList() {
    const usersBox = this.usersBox

    const selected = usersBox.selected

    while (usersBox.children.length) {
      const element = usersBox.children[usersBox.children.length - 1]
      usersBox.remove(element)
    }
    this.users.sort((u1, u2) => {
      if (u1.u === this.client.todo.w_userno) {
        return 1;
      }

      if (u2.u === this.client.todo.w_userno) {
        return -1;
      }

      if (u1.online != u2.online) {
        return u2.online - u1.online;
      }
      const rankmap = [0, 4, 2, 1, 3];
      const r1 = rankmap[u1.f & 7], r2 = rankmap[u2.f & 7];
      if (r1 !== r2) {
        return r2 - r1;
      }
      return u1.u - u2.u;
    });

    for (let i = 0; i < this.users.length; ++i) {
      this.addUserToWidget(this.users[i], i);
    }

    if (selected != null) {
      usersBox.select(selected)
    }
  }

  addMessage(channel, data) {
    const prefix = channel === 'input'
      ? '{red-fg}IN:  {/}'
      : '{blue-fg}OUT: {/}'
    this.messagesBox.pushLine(prefix + util.inspect(data.xml, { breakLength: Infinity, colors: true }))
  }

  addUserToWidget(user, i) {
    let content = this.cleanName(user);
    const color = this.getUserColor(user);

    content = '{' + color + '-fg}' + content + '{/}';

    let userElement = blessed.box({
      content: content,
      tags: true,
      top: 1 * this.usersBox.children.length,
      height: 1,
    });

    userElement.data.user = user;
    this.usersBox.insert(userElement, i);
  }

  cleanName(user) {
    let name = user.n || '';
    name = blessed.escape(name);

    let filtered = [];
    let lvl = 0;
    for (let i = 0; i < name.length; ++i) {
      if (name[i] === '(')
        ++lvl;
      if (lvl === 0)
        filtered.push(name[i]);
      if (name[i] === ')' && lvl > 0)
        --lvl;
    }
    filtered = filtered.join('');
    filtered = filtered.trim();
    if (filtered.length === 0 || filtered.length === 1 && filtered[0] === '$')
      filtered = user.u;
    return filtered;
  }

  getUserColor(user) {
    const colors = this.config.userColors;

    if (user.u == this.client.todo.w_userno) {
      return colors.self
    }

    const rankcolors = [colors.guest, colors.mainowner, colors.moderator, colors.member, colors.owner];
    return !user.online ? colors.offline : rankcolors[user.f & 7];
  }
}
