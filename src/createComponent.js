var Reflux = require('reflux-core');
var _ = Reflux.utils;
var mixer = require("./mixer");
var bindMethods = require("./bindMethods");

var allowed = { preEmit: 1, shouldEmit: 1 };

module.exports = function ($scope, definition) {

	var ComponentMethods = require("./ComponentMethods"),			
			ListenerMethods = Reflux.ListenerMethods;

	definition = definition || {};

	for (var a in ComponentMethods) {
			if (!allowed[a] && (ListenerMethods[a])) {
					throw new Error("Cannot override API method " + a + " in Refluxar.ComponentMethods. Use another method name.");
			}
	}

	for (var d in definition) {
			if (!allowed[d] && (ListenerMethods[d])) {
					throw new Error("Cannot override API method " + d + " in component creation. Use another method name.");
			}
	}

	definition = mixer(definition);	

	function Component() {

		var i = 0,
            arr;
		this.subscriptions = [];		
		bindMethods(this, definition);
		if (this.init && _.isFunction(this.init)) {
				this.init();
		}
		if (this.listenables) {
				arr = [].concat(this.listenables);
				for (; i < arr.length; i++) {
						this.listenToMany(arr[i]);
				}
		}
	}

	

	_.extend(Component.prototype, ListenerMethods, ComponentMethods, definition);
	
	var component = new Component();
	
	$scope.$on('$destroy', function() {
		
		component.stopListeningToAll();

		if (component.componentWillUnmount && _.isFunction(component.componentWillUnmount)) {
			component.componentWillUnmount();
		}
	});

	$scope.safeApply = function(fn) {
		var phase = this.$root.$$phase;
		if(phase === '$apply' || phase === '$digest') {
			if(fn && (typeof (fn) === 'function')) {
				fn();
			}
		} else {
				this.$apply(fn);
		}
	};

	// kick off lifecycle
	if (component.componentDidMount && _.isFunction(component.componentDidMount)) {
			component.componentDidMount();
	}
	

	return component;
};