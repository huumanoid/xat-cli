'use strict';


const and = (f1, f2) => {
  return function () {
    return (typeof f1 !== 'function' || f1.apply(this, arguments))
      && (typeof f2 !== 'function' || f2.apply(this, arguments))
  }
}

module.exports = {
  and,
}
