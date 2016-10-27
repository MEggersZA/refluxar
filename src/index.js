var Reflux = require('reflux-core');

var _ = require('lodash');



var Refluxar = Reflux;

require("./createAction")(Refluxar);
require("./createStore")(Refluxar);

Refluxar.createComponent = require("./createComponent");

module.exports = Refluxar;
