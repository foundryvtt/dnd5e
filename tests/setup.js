import './mocks/hooks'
import './mocks/entities'
import './mocks/utilities'

global.game = Object.freeze({
  settings: Object.freeze({
      get: (module, settingKey) => {
          switch (settingKey) {
              /* Rest Variant */
              case 'restVariant':
                  return 'normal';

              default:
                  throw new Error('Undefined setting.');
          }
      },
  }),
  i18n: Object.freeze({
    localize: (x) => x,
    format: (x) => x,
  }),
  user: {}
});



// prototype modifications
Math.clamped = (value, min, max) => Math.min(Math.max(value, min), max);

String.prototype.slugify = (x) => x;

Number.isNumeric = function(n) {
  if ( n instanceof Array ) return false;
  else if ( [null, ""].includes(n) ) return false;
  return +n === +n;
};