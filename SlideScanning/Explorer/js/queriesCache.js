export class QueriesCache {
    constructor() {
       this.data = {};
    }
 
    addQuery(query, pathToGroup) {
       let targetData = this.data;
       if (pathToGroup) {
          let keys = Object.keys(pathToGroup).reverse();
          for (let key of keys) {
             if (!(key in targetData)) {
                targetData[key] = {};
             }
             if (!(pathToGroup[key] in targetData[key])) {
                targetData[key][pathToGroup[key]] = {};
             }
             targetData = targetData[key][pathToGroup[key]];
          }
       }
       targetData[query] = {};
    }
 
    hasQuery(query, pathToGroup, reversKeys = false) {
       let targetData = this.data;
       if (pathToGroup) {
          let keys = reversKeys ? Object.keys(pathToGroup).reverse() : Object.keys(pathToGroup);
          for (let key of keys) {
             if (!((key in targetData) && (pathToGroup[key] in targetData[key]))) {
                return false;
             } else {
                targetData = targetData[key][pathToGroup[key]];
             }
          }
       }
       return (query in targetData);
    }
 }
