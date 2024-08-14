export class FilterState {

    constructor() {
        if (FilterState.instance) {
            return FilterState.instance;
        }
        this.currentFilter = {};
        this.onChangedCallbacks = [];

        FilterState.instance = this;
    }

    registerCallback(callback){
        this.onChangedCallbacks.push(callback);
    }

    getFilter(header) {
        if( Object.keys(this.currentFilter).includes(header) ) {
            return this.currentFilter[header];
        }
        return {};
    }

    updateFilter(header, filterDiff, source) {
        if( Object.keys(this.currentFilter).includes(header) === false ) {
            this.currentFilter[header] = {};
        }
        Object.entries(filterDiff).forEach( ([key, value]) => {
            this.currentFilter[header][key] = value;
        });
        this.onChangedCallbacks.forEach((callback) => {
            callback(header, source);
        });
    }
}
