

module.exports = function(Refluxar) {
	
	var superCreateStore = Refluxar.createStore;

	Refluxar.createStore = function createAction(definition) {

		var store = superCreateStore(definition);

		if (store.events) {
				arr = [].concat(store.events);
				
				store.events = Refluxar.createActions(arr)
		}

		return store;

	};
}