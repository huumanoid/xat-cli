'use strict'
const blessed = require('blessed')
const widget = blessed.widget
const StreamTab = require('./stream-tab')

module.exports =
class TextChatTab extends StreamTab {
  constructor(options) {
    const filters = options.filters || {}
    filters.input = filters.input || ((data) => {
      return data.types.indexOf('main-chat-message') >= 0
    })

    filters.output = filters.output || ((data) => {
      return data.xml.m && data.xml.m.attributes.t
    })

    super(Object.assign({}, options, { filters }))
  }

  addMessage(channel, data) {
    const xml = data.xml
    const message = xml[Object.keys(xml)[0]].attributes

    const userId = message.u ? message.u.split('_')[0] : null;
    let content = message.t || '';

    content = blessed.helpers.dropUnicode(content)
    let userName = 'none';
    let user = null;

    if (userId) {
      user = this.findUser(userId);
      if (user) {
        userName = this.cleanName(user);
      }
    }

    const userColor = user ? this.getUserColor(user) : null;
    const headerContent = user ? '{' + userColor + '-fg}' + userName + '{/}' : 'System';

    const header = blessed.box({
      top: 0,
      left: 0,
      height: 1,
      width: 20,
      content: headerContent,
      tags: true,
    });

    const messageContent = blessed.box({
      content: '{bold}' + blessed.escape(content) + '{/}',
      top: 0,
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
    });


    messageContainer.append(header);
    messageContainer.append(messageContent);
    messageContainer.data.userId = userId;

    const maxContentWidth = (messageContainer.width - messageContent.left)
    const height = (content.length / maxContentWidth | 0) + (content.length % maxContentWidth > 0);

    messageContainer.height = messageContent.height = height
  }

  addOutputMessage(data) {
    data = data.xml;
    if (data.m && data.m.attributes.t) {
      this.addMessage(data.m.attributes);
      this.screen.render();
    }
  }
}
