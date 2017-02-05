'use strict';
const blessed = require('blessed');
const widget = blessed.widget;
const util = require('util');

module.exports =
class Chat extends widget.Box {
  constructor(options) {
    super(options);

    this.command = options.command;
    const screen = this.screen;
    const client = this.client = options.client;
    const config = this.config = options.config;

    const chatbox = this.chatbox = blessed.box({
      parent: this,
    });

    const maintab = this.maintab = blessed.box({
      parent: chatbox,
      height: '100%-4',
    });

    const messages = this.messagesBox = blessed.box({
      parent: maintab,
      border: 'line',
      style: {
        focus: {
          border: {
            fg: 'blue',
          },
        },
      },
      keyable: true,
      //height: '40%',
      keys: true,
      vi: true,
      width: '80%',
      scrollable: true,
      scrollbar: {
        ch: ' ',
        inverse: true,
        style: {
          bg: 'red',
          fg: 'blue',
        },
      },
      alwaysScroll: true,
    });
    messages.on('keypress', (ch, key) => {
      chatbox.emit('key ' + key.full);
    });
    this.users = [];

    this.usersBox = blessed.box({
      parent: maintab,
      //height: '40%',
      width: '20%',
      left: '80%',
      border: 'line',
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
    this.usersBox.on('keypress', (ch, key) => {
      chatbox.emit('key ' + key.full);
    });

    this.messageBox = blessed.textbox({ 
      parent: chatbox,
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
    });

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

    this.tabs = blessed.box({
      parent: chatbox,
      top: '100%-4',
      height: 1,
    });

    this.messageBox.on('submit', (message) => {
      this.messageBox.clearValue();
      screen.render();
      client.sendTextMessage(message);
      this.messageBox.focus();
    });
    client.on('send', (data) => {
      data = data.xml;
      if (data.m && data.m.attributes.t) {
        this.addMessage(data.m.attributes);
        screen.render();
      }
    });
    this.messageBox.on('cancel', () => {
      this.command.setContent();
      screen.render();
    });

    chatbox.key(['i'], () => {
      this.command.setContent("{bold}-- INSERT --{/}");
      this.messageBox.focus();
      screen.render();
    });

    client.on('connect', () => {
      this.command.setContent('connecting to ' + client.todo.w_useroom + '...');
      while (this.messagesBox.children.length) {
        const message = this.messagesBox.children[this.messagesBox.children.length - 1];
        this.messagesBox.remove(message);
      }
      this.users = [];
      this.rebuildUserList();
      screen.render();
    });

    client.on('ee-main-chat-message', (data) => {
      if (data.xml.m)
        this.addMessage(data.xml.m.attributes);
      else {
        this.command.setContent(JSON.stringify(data.xml));
      }
      screen.render();
    });
    client.on('ee-user-signout', (data) => {
      let userId = data.xml.l.attributes.u;
      let user = this.findUser(userId);
      if (user) {
        user.online = false;
        this.rebuildUserList();
        screen.render();
      }
    });

    client.on('ee-user', (data) => {
      let user = data.xml;
      let online = user.o === undefined;
      user = (user.o || user.u).attributes;

      user = JSON.parse(JSON.stringify(user));//clone
      user.online = online;
      this.addUser(user);
      screen.render();
    });

    client.on('ee-done', () => {
      this.command.setContent('connected');
      this.rebuildUserList();
      screen.render();
    });

    client.on('data', (data) => {
      this.logBox.pushLine('{red-fg}IN:  {/}' + util.inspect(data, { breakLength: Infinity, colors: true }));
    });
    client.on('send', (data) => {
      this.logBox.pushLine('{blue-fg}OUT: {/}' + util.inspect(data.xml, { breakLength: Infinity, colors: true }));
    });
    chatbox.focus();
  }

  addMessage(message) {
    const userId = message.u ? message.u.split('_')[0] : null;
    const content = message.t || '';
    let userName = 'none';
    let user = null;

    if (userId) {
      user = this.findUser(userId);
      if (user)
        userName = this.cleanName(user);
    }

    const userColor = user ? this.getUserColor(user) : null;
    const headerContent = user ? '{' + userColor + '-fg}' + userName + '{/}' : (userId === this.client.todo.w_userno ? 'You' : 'System');

    const header = blessed.box({
      top: 0,
      left: 0,
      height: 1,
      width: 20,
      content: headerContent,
      tags: true,
    });

    const height = (content.length / this.messagesBox.width | 0) + (content.length % this.messagesBox.width > 0);
    const messageContent = blessed.box({
      content: '{bold}' + blessed.escape(content) + '{/}',
      top: 0,
      height: height,
      left: 21,
      tags: true,
    });


    const position = (this.messagesBox.children.length ? this.messagesBox.children.slice(-1)[0].top : 0)
    const prevHeight = (this.messagesBox.children.length ? this.messagesBox.children.slice(-1)[0].height : 1);

    const messageContainer = blessed.box({
      parent: this.messagesBox,
      top: position - 1 + prevHeight,
      left: 0,
      width: '100%-4',
      scrollable: true,
      height: height,
    });

    messageContainer.append(header);
    messageContainer.append(messageContent);
    messageContainer.data.userId = userId;

    if (true) {
      this.messagesBox.setScrollPerc(100);//scrollTo(messages.children.length - 30);
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
    const usersBox = this.usersBox;
    while (usersBox.children.length) {
      const element = usersBox.children[usersBox.children.length - 1];
      usersBox.remove(element);
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
    const rankcolors = [colors.guest, colors.mainowner, colors.moderator, colors.member, colors.owner];
    return !user.online ? colors.offline : rankcolors[user.f & 7];
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

  addUser(user) {
    const old = this.findUserIndex(user.u);
    if (old >= 0) {
      this.users.splice(old, 1);
    }
    this.users.push(user);
    if (this.client.gotDone)
      this.rebuildUserList();
  }

}
