'use strict';
const blessed = require('blessed');
const XatUser = require('xat-client').XatUser;
const config = require('../config.js');

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
  const command = args[0];
  if (value === 'q') {
    return process.exit();
  } else if (value === 'm') {
    messages.focus();
  } else if (value === 'u') {
    userElements.focus();
  } else if (command === 'locate') {
    client.sendLocate(args[1]);
  } else {
    command.setValue('{red-bg}{white-fg}{bold}Unknown command: ' + value + '{/}');
    return screen.render();
  }
  command.setValue('');
  screen.render();
});

const messages = blessed.box({
  parent: screen,
  border: 'line',
  //height: '40%',
  height: '100%-4',
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
const messagesBox = messages;

const users = [];

const userElements = blessed.box({
  parent: screen,
  content: 'users',
  //height: '40%',
  height: '100%-4',
  width: '20%',
  left: '80%',
  border: 'line',
  scrollable: true,
  scrollbar: {
  },
  alwaysScroll: true,
});

const messageBox = blessed.textbox({ 
  parent: screen,
  border: 'line',
  style: {
  },
  top: '100%-4',
  height: 3,
  content: 'text',
  inputOnFocus: true,
});

messageBox.on('submit', function (message) {
  messageBox.clearValue();
  screen.render();
  client.sendTextMessage(message);
  addMessage({ t: message, u: client.todo.w_userno });
  messageBox.focus();
  screen.render();
});
messageBox.on('cancel', function () {
  command.setContent();
  screen.render();
});

screen.key(['i'], () => {
  command.setContent("{bold}-- INSERT --{/}");
  messageBox.focus();
  screen.render();
});
screen.key([':'], () => command.focus());

messages.focus();

screen.render();

const client = new XatUser(config.user).addExtension('user-actions').addExtension('extended-events').addExtension('chat-data');

client.connect();

function addMessage(message) {
  const userId = message.u ? message.u.split('_')[0] : null;
  let content = message.t;
  let user = null;

  if (userId) {
    user = findUser(userId);
  }

  let userColor = user >= 0 ? getUserColor(users[user]) : null;
  let headerContent = user >= 0 ? '{' + userColor + '-fg}' + blessed.escape(users[user].n) + '{/}' : (userId === client.todo.w_userno ? 'You' : 'System');

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
    height: content.length / messages.width + (content.length % messages.width > 0),
    left: 20,
    tags: true,
  });


  const messageContainer = blessed.box({
    parent: messages,
    top: 1 * messages.children.length,
    scrollable: true,
    height: 1,
  });

  messageContainer.append(header);
  messageContainer.append(messageContent);

  if (true) {
    messages.setScrollPerc(100);//scrollTo(messages.children.length - 30);
  }
}

function findUser(userId) {
  for (let i = 0; i < users.length; ++i) {
    if (users[i].u === userId) {
      return i;
    }
  }
  return -1;
}

function rebuildUserList() {
  while (userElements.children.length) {
    const element = userElements.children[userElements.children.length - 1];
    userElements.remove(element);
  }
  screen.render();
  users.sort((u1, u2) => {
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
  for (let i = 0; i < users.length; ++i) {
    addUserToWidget(users[i], i);
  }
}

function cleanName(user) {
  const name = user.n;
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

function getUserColor(user) {
  const colors = config.userColors;
  const rankcolors = [colors.guest, colors.mainowner, colors.moderator, colors.member, colors.owner];
  return !user.online ? colors.offline : rankcolors[user.f & 7];
}

function addUserToWidget(user, i) {
  let content = cleanName(user);
  const color = getUserColor(user);

  content = '{' + color + '-fg}' + content + '{/}';

  let userElement = blessed.box({
    content: content,
    tags: true,
    top: 1 * userElements.children.length,
    height: 1,
  });

  userElement.data.user = user;
  userElements.insert(userElement, i);
}

function addUser(user) {
  const old = findUser(user.u);
  if (old >= 0) {
    users.splice(old, 1);
  }
  users.push(user);
  if (client.gotDone)
    rebuildUserList();
}

client.on('ee-main-chat-message', function (data) {
  if (data.xml.m)
    addMessage(data.xml.m.attributes);
  else {
    command.setContent(JSON.stringify(data.xml));
  }
  screen.render();
});
client.on('ee-user-signout', function (data) {
  let userId = data.xml.l.attributes.u;
  let user = users[findUser(userId)];
  if (user) {
    user.online = false;
    rebuildUserList();
    screen.render();
  }
});

client.on('ee-user', function (data) {
  let user = data.xml;
  let online = user.o === undefined;
  user = (user.o || user.u).attributes;
  user.online = online;
  addUser(user);
  screen.render();
});

client.once('ee-done', function () {
  rebuildUserList();
  screen.render();
});

messages.on('scroll', function () {
  //command.setContent(messages.childBase.toString());
  //command.setContent(messages.children[0].top.toString());
  //screen.render();
});
