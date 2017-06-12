# Refluxar

This module was designed in a startup environment and although we would have loved to have written it initially in ES6 and Angular2 it is intended to make use of the huge AngularJS (Angular 1.3.x and above) communities contribution, and not necessarily use the latest and greatest tools. It is opinionated but flexible enough for you to change your implementation.

This module will help you implement a unidirectional data flow (Flux architecture) for an AngularJS application in an elegant way. This is inspired by [refluxjs](https://github.com/reflux/refluxjs) and [ng-reflux](https://github.com/datchley/ng-reflux)


The way in which we use it was inspired by ideas in Facebooks GraphQL but it is flexible enough to use it with a more traditional REST api approach
You can read an overview of Flux [here](https://facebook.github.io/flux/docs/overview.html), however the gist of it is to introduce a more functional programming style architecture by eschewing MVC like pattern and adopting a single data flow pattern.

```
╔═════════╗       ╔════════╗       ╔═════════════════╗
║ Actions ║──────>║ Stores ║──────>║ View Components ║
╚═════════╝       ╚════════╝       ╚═════════════════╝
     ^                                      │
     └──────────────────────────────────────┘

```

The pattern is composed of actions and data stores, where actions initiate new data to pass through data stores before coming back to the view components again. If a view component has an event that needs to make a change in the application's data stores, they need to do so by
signaling to the stores through the actions available.

## Comparing Refluxar, RefluxJS and Flux
refluxar includes a subset of RefluxJS features. Notably, here is what refluxar provides:

* A component which introduces a react like lifecycle to angular controllers and directives.
* The ability to create Actions and Stores as angular factories
* Unidirectional data-flow, with synchronous Stores and the ability to use Actions with Promises.
* The singleton dispatcher is removed in favor for letting every action act as dispatcher instead.
* Because actions are listenable, the stores may listen to them. Stores don't need to have big switch statements that do static type checking (of action types) with strings
* Because stores can define their own events, which are themselves actions, directives and controllers can listen to them through the refluxar component
* Stores may listen to other stores, i.e. it is possible to create stores that can *aggregate data further*, similar to a map/reduce.
* *Action creators* are not needed because RefluxJS actions are functions that will pass on the payload they receive to anyone listening to them


## Installation

I have not yet published this as an npm package as yet so needs to be npm installed directly from the repository.

### Angular Compatibility
It is recommended to use refluxar with Angular 1.3.x or above. An Angular 2 version is not currently being developed; but may be considered.

## Refluxar Usage

Taking inspiration from facebooks GraphQL (Although nothing like it in terms of defining the data you want from the frontend and having the backend adapt) we went with a single API endpoint as oppossed to a rest based system. We wanted to be able to deal with the backend by passing messages for Commands/Events and Queries. This allows us to capture User intent nicely

In order to still get the advantage of http where we can still cache gets and use posts for commands we have defined a simple API as follows

```javascript
var angular = require('angular');

angular
    .module('app.core')
    .service('Api', Api);

Api.$inject = ['AuthWrapper', '$http', '$httpParamSerializer', 'endpoint'];

function Api(AuthWrapper, $http, $httpParamSerializer, endpoint) {

        var sendEndPoint;
        var queryEndPoint;

        var config = { headers: { } };

        var service = {
            send: send,
            query: query
        };

        init();

        return service;

        function init() {
            sendEndPoint = endpoint + "/api/send";
            queryEndPoint = endpoint + "/api/query";
        }

        function query(message) {

          message.mt = message.messageType;
          delete message.messageType;
          var qs = $httpParamSerializer(message);

          config.headers['X-correlation-id'] = AuthWrapper.getCorrelationId();

          return $http.get(queryEndPoint + "?" + qs, config);
        }

        function send(message) {

            config.headers['X-correlation-id'] = AuthWrapper.getCorrelationId();

            return $http.post(sendEndPoint, message, config);
        }
}
```
This is now the only http service we need for the entire application.

### Actions
Actions serve as function objects that can be listened to and emit an event, passing any arguments to the listener's callback to initiate a change in a Store.

#### Creating Actions

You can create a simple action as easily as

```javascript
var Refluxar = require('refluxar');

var doStuff = Refluxar.createAction();

doStuff("some data", 12);               // initiate an Action, passing data
doStuff.trigger("some data", 12);       // same as above
```

However were this becomes powerful is where you group actions into areas, say actions needed to handle Customers, using an angular factory approach. The code below defines three actions and can be invoked (normally from the controller or directive) as follows.

```javascript
CustomerActions.fetchCustomer({customer_id: 1});                // async, http get to server api/query endpoint
CustomerActions.addCustomer({name: 'Joe'});                     // async, http post to server api/send endpoint
CustomerActions.setCustomerSelectedSync({customer_id: 1});      // sync call with no call to api. Useful for setting values in stores
```


```javascript
var Refluxar 	= require('refluxar'),
    angular 	= require('angular');

angular
	.module('app.customers')
	.factory('CustomerActions', CustomerActions);

CustomerActions.$inject = ['Api'];

function CustomerActions(Api) {

	var Actions = Refluxar.createActions([
                                            {
                                                'fetchCustomer': Api.query,
                                                prepare: function(args) {
                                                            return { messageType: "FETCH_CUSTOMER",
                                                                    customer_id: args.customer_id };
                                                        }
                                            },
											{
												'addCustomer': Api.send,
												prepare: function(args) {
        													return { messageType: "ADD_CUSTOMER",
        													        name: args.name };
                                                        }
                                            },
                                            'setCustomerSelectedSync'
                                        ]);

	return Actions;
}
```

To be clear Api.query and Api.send could be any function which take an argument and return a promise.
The prepare method is the place where you mutate the arguments into those required by your promise.





### Stores

Stores hold the application state and can listen to multiple actions. Stores have a listenables mixin to easily allow listening to a group of actions. Stores can also define their own Events which are themselves actions which the controllers and directives can listen to.

To define a store we use an angular factory and the Refluxar.createStore command. A simple example of a store which listens to the CustomerActions and handles the fetchCustomer action on success and failure is shown below

```javascript
var angular = require('angular'),
	Refluxar = require('refluxar');

angular
    .module('app.jobs')
    .factory('CustomersStore', CustomersStore);

CustomersStore.$inject = ['CustomersActions'];

function CustomersStore(CustomersActions) {

	return Refluxar.createStore({

		events: [ 'customerFetched' ],

		listenables: [CustomersActions],

		init: function() {
			this.state = { customer: null };
		},

		getState: function() {
			return this.state;
		},

		onFetchCustomerCompleted: function(response) {

			this.state.customer = response.data;

			this.events.customerFetched();
		},

		onFetchCustomerFailed: function(response) {

			// Handle customer fetch errors here. (hint raise an event)
		}
	});
}

```

To listen to Customer actions we simple use the mixin funcionality. We could add multilpe Action groups by adding to the array
```
listenables: [CustomersActions]
```
To handle the success part of an action, just follow convention by defining a method prefixed with 'on' and the name of the action followed by "Completed", and the store automatically invokes this function. ie for the fetchCustomer we name our function onFetchCustomerCompleted. Similarly onFetchCustomerFailed is invoked on failure.

To fire an event (which is itself an action) from a Store, simply define the event in the events mixin

```
events: [ 'customerFetched' ]
```

and invoke it with this.events.customerFetched();
```
this.events.customerFetched();
this.events.customerFetched({customer:1}); // Pass data with the event
```

Although data can be passed with the event it is a better pattern to have the controller call the Stores getState method, which should return an immutable copy of the state. (although it doesnt above. consider lodash _.cloneDeep)
Now state can be accessed with CustomersStore.getState().customer

#### Mixins in Stores
You can create and add mixins to your Stores in refluxar.

```javascript
var MyMixin = { foo() { console.log('bar!'); } }
var Store = Refluxar.createStore({
    mixins: [MyMixin]
});
Store.foo(); // outputs "bar!" to console
```


A nice feature of mixins is that if a store is using multiple mixins and several mixins define an `init()` method, all of the `init()` methods are guaranteed to be called.  Any mixin `init()` methods are called in the order provided and *before* the Store's `init()` method is called.


## Refluxar in Directives and Contollers

In order to add a react style lifestyle to angular controllers and directives Refluxar introduces a component which is created with Refluxar.createComponent. The first argument is the $scope so the component can hook into angular. The component will have its componentDidMount called when the controller is invoked by angular and its componentWillUnmount method invoked when scope is destroyed.
To listen to stores events (or other actions for that matter) simply use the listenables mixin in the component

```javascript
    listenables: [CustomersStore.events]
```

Any methods defined on the component with the same convention as was done in the stores will automatically be invoked on that event. eg in the example below onCustomerFetched is invoked when the stores this.events.customerFetched() method is called. Following this convention greatly reduces the need for boilerplate code.

```javascript
var Refluxar 	= require('refluxar'),
	angular 	= require('angular'),
	_ 				= require('lodash');

angular
    .module('app.customers')
    .controller('CustomersController', CustomersController);

CustomersController.$inject = ['$scope', 'CustomersStore', 'CustomersActions'];

function CustomersController($scope, CustomersStore, CustomersActions) {

	var component,
		vm = _.merge(this, {
			name: ''
		});

	component = Refluxar.createComponent($scope,
	{
		listenables: [CustomersStore.events],

		onCustomerFetched: onCustomerFetched,

		componentDidMount: function()
		{
			// kick off anything in your controller here
			CustomersActions.fetchCustomer({customer: 1});
		},

		componentWillUnmount: function() {

			// fired when scope is destroyed and VERY useful for cleanup
		}
	});

	/////////

	function onCustomerFetched() {

		vm.name = CustomersStore.getState().customer.name;
	}
}
```









