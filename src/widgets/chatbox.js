'use strict';
const blessed = require('blessed');
const widget = blessed.widget;

module.exports =
class Chatbox extends widget.Box {
  constructor(options) {
    super(options);
    const command = options.command;
    const screen = this.screen;
    const client = this.client = options.client;
    const config = this.config = options.config;

    const chatbox = this;

    const messages = this.messages = blessed.box({
      parent: chatbox,
      border: 'line',
      //height: '40%',
      height: '100%-3',
      keys: true,
      vi: true,
      width: '80%',
      scrollable: true,
      scrollbar: {
        ch: 'x',
        inverse: true,
        style: {
          bg: 'red',
          fg: 'blue',
        },
      },
      alwaysScroll: true,
    });
    this.users = [];

    this.userElements = blessed.box({
      parent: chatbox,
      //height: '40%',
      height: '100%-3',
      width: '20%',
      left: '80%',
      border: 'line',
      scrollable: true,
      scrollbar: {
      },
      alwaysScroll: true,
    });

    this.messageBox = blessed.textbox({ 
      parent: chatbox,
      border: 'line',
      style: {
      },
      top: '100%-3',
      height: 3,
      content: 'text',
      inputOnFocus: true,
    });

    this.messageBox.on('submit', (message) => {
      this.messageBox.clearValue();
      screen.render();
      client.sendTextMessage(message);
      this.addMessage({ t: message, u: client.todo.w_userno });
      this.messageBox.focus();
      screen.render();
    });
    this.messageBox.on('cancel', () => {
      command.setContent();
      screen.render();
    });

    client.on('connect', () => {
      command.setContent('connecting to ' + client.todo.w_useroom + '...');
      while (this.messages.children.length) {
        const message = this.messages.children[this.messages.children.length - 1];
        this.messages.remove(message);
      }
      this.users = [];
      this.rebuildUserList();
      screen.render();
    });

    client.on('ee-main-chat-message', (data) => {
      if (data.xml.m)
        this.addMessage(data.xml.m.attributes);
      else {
        command.setContent(JSON.stringify(data.xml));
      }
      screen.render();
    });
    client.on('ee-user-signout', (data) => {
      let userId = data.xml.l.attributes.u;
      let user = this.users[this.findUser(userId)];
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
      user.online = online;
      this.addUser(user);
      screen.render();
    });

    client.on('ee-done', () => {
      command.setContent('connected');
      this.rebuildUserList();
      screen.render();
    });
  }

  addMessage(message) {
    const userId = message.u ? message.u.split('_')[0] : null;
    const content = message.t || '';
    let userName = 'none';
    let user = null;

    if (userId) {
      user = this.findUser(userId);
      if (user >= 0)
        userName = this.cleanName(this.users[user]);
    }

    const userColor = user >= 0 ? this.getUserColor(this.users[user]) : null;
    const headerContent = user >= 0 ? '{' + userColor + '-fg}' + userName + '{/}' : (userId === this.client.todo.w_userno ? 'You' : 'System');

    const header = blessed.box({
      top: 0,
      height: 1,
      width: 20,
      content: headerContent,
      tags: true,
    });

    const messageContent = blessed.box({
      content: '{bold}' + blessed.escape(content) + '{/}',
      top: 0,
      height: content.length / this.messages.width + (content.length % this.messages.width > 0),
      left: 20,
      tags: true,
    });


    const messageContainer = blessed.box({
      parent: this.messages,
      top: 1 * this.messages.children.length,
      scrollable: true,
      height: 1,
    });

    messageContainer.append(header);
    messageContainer.append(messageContent);

    if (true) {
      this.messages.setScrollPerc(100);//scrollTo(messages.children.length - 30);
    }
  }

  findUser(userId) {
    for (let i = 0; i < this.users.length; ++i) {
      if (this.users[i].u === userId) {
        return i;
      }
    }
    return -1;
  }

  rebuildUserList() {
    const userElements = this.userElements;
    while (userElements.children.length) {
      const element = userElements.children[userElements.children.length - 1];
      userElements.remove(element);
    }
    this.users.sort((u1, u2) => {
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
      top: 1 * this.userElements.children.length,
      height: 1,
    });

    userElement.data.user = user;
    this.userElements.insert(userElement, i);
  }

  addUser(user) {
    const old = this.findUser(user.u);
    if (old >= 0) {
      this.users.splice(old, 1);
    }
    this.users.push(user);
    if (this.client.gotDone)
      this.rebuildUserList();
  }

}
