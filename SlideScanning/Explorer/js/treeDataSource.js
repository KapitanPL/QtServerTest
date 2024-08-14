import { QueriesCache } from './queriesCache.js';

export class TreeDataSource {
    constructor() {
       this.queriedBranchesCache = new QueriesCache();
       this.rows = {};
    }
 
    fetchHeaders() {
       return fetch('http://localhost:8080/headers', {
          method: 'GET'
       })
          .then(response => response.json())
          .then(headers => {
             return headers;
          })
          .catch(error => {
             console.error('Error fetching headers:', error);
             return Promise.reject(error);
          });
    }
 
    fetchRows(queryGroup, pathToGroup = null) {
       let url = 'http://localhost:8080/rows';
       let queryParams = new URLSearchParams();
 
       queryParams.append('queryGroup', queryGroup);
 
       if (pathToGroup) {
          Object.entries(pathToGroup).forEach(([key, value]) => {
             queryParams.append(key, value);
          });
       }
 
       url += `?${queryParams.toString()}`;
 
       return fetch(url, {
          method: 'GET'
       })
          .then(response => {
             if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
             }
             return response.json();
          })
          .then(rows => {
             this.queriedBranchesCache.addQuery(queryGroup, pathToGroup);
             this.mergeRows(this.rows, rows);
             // TreeManager.filterWidget.updateOnNewContent(queryGroup, TreeManager.sortOrder[queryGroup]);
             console.log("Now Fetched: ", rows);
             return rows;
          })
          .catch(error => {
             console.error('Error fetching rows:', error);
             return [];
          });
    }
 
    fetchCachedRows(key, pathToGroup) {
       if (this.queriedBranchesCache.hasQuery(key, pathToGroup)) {
          return this.rows;
       }
       return [];
    }
 
    mergeRows(oldRows, newRows) {
       newRows.forEach((row) => {
          Object.keys(row).forEach((key) => {
             if (!oldRows.hasOwnProperty(row["rowID"])) {
                oldRows[row["rowID"]] = [];
             }
             oldRows[row["rowID"]][key] = row[key];
          });
       });
    }
 
    getUniqueValues(key) {
       let values = new Set();
       Object.entries(this.rows).forEach(([_, row]) => {
          if (Object.keys(row).includes(key)) {
             values.add(row[key]);
          }
       });
       return values;
    }
 } 
