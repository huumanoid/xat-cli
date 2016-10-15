module.exports = {
  userColors: {
    guest: 'green',
    member: 'blue',
    moderator: 'white',
    owner: 'yellow',
    mainowner: 'magenta',
    offline: 'red',
  },
  httpservices: {
    id2reg: {
      method: 'http',
      url: 'http://xat.me/_?id=#id#',
      placeholder: '#id#',
      fetchResult: function (body) {
        return body;
      }
    }
  },
  user: {
    todo: {
      w_autologin: 1,
      w_userno: '2',
      w_useroom: '123',
    }
  }
}
