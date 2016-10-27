
var _ = require('lodash');


function isApiAction(definition) {

	var isapiaction = false;

	definition = definition || {};
	
	if (_.isObject(definition) && _.has(definition, 'prepare')) {
			isapiaction = true;
	}	

	return isapiaction;
}

function retry(actionArgs) {			

	console.log();

	var callingActionArgs = actionArgs.actionArgs,
			description = actionArgs.description || 'action',
			retryaction = actionArgs.retryaction,
			done = actionArgs.done,
			self = this; 

	
	if (typeof callingActionArgs.retrycount === 'undefined') { callingActionArgs.retrycount = 0; }
	
	if ( callingActionArgs.retrycount > 0 ) {
						
		console.log('retrying ' + description);
						
		callingActionArgs.retrycount--;

		setTimeout(function(){ retryaction(callingActionArgs); }, 500);				
	} else {				
		setTimeout(function(){ done(callingActionArgs); }, 500);
	}
};


function createListener(definition) {
	

	return function() {
			
			var action = this;

			
			var msg = definition.prepare.apply(action, arguments);

			var actionArgs = arguments[0];

			if (typeof actionArgs.retrycount === 'undefined') { actionArgs.retrycount = 2; }

			
			definition.invoke(msg)
			.then(function(result) {

				action.completed(result.data);							
			})
			.catch(function(e) {

				
				
				retry({
					actionArgs: actionArgs, 
					description: msg.messageType,
					retryaction: action, 
					done: function(erroredArgs) {
											
						console.log('finished retrying');				
						console.log(erroredArgs);

						action.failed(e);
					}
				});
								

				
			});
			
			
		};
}

module.exports = function(Refluxar) {

	var superCreateAction = Refluxar.createAction;
	 
	Refluxar.createAction = function createAction(definition) {
	
		if (isApiAction(definition)) 
		{

			var name = _.chain(definition)
            .omit(['prepare'])
            .keys()
            .value()[0];
		
					
			var o = {
					asyncResult: true,
					children: [name]
			};

			var apiAction = superCreateAction(o);

			definition.invoke = definition[name];
			
			apiAction.listen(createListener(definition));
			return apiAction;
		} else {
			return superCreateAction(definition);
		}
		
	};;

	Refluxar.createActions = (function () {
			var reducer = function reducer(definitions, actions) {
					Object.keys(definitions).forEach(function (actionName) {
							var val = definitions[actionName];
							actions[actionName] = Refluxar.createAction(val);
					});
			};

			

			return function (definitions) {
					var actions = {};
					if (definitions instanceof Array) {
							definitions.forEach(function (val) {
									if (isApiAction(val)) {										
										var actionname = _.chain(val)
																		.omit(['prepare'])
																		.keys()
																		.value()[0]; 
										actions[actionname] = Refluxar.createAction(val); 										
									}
									else if (_.isObject(val)) {
											reducer(val, actions);
									} else {
											actions[val] = Refluxar.createAction(val);
									}
							});
					} else {
							reducer(definitions, actions);
					}
					return actions;
			};
	})();



}