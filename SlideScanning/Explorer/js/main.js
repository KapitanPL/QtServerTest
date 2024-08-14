import { QueriesCache } from './queriesCache.js';
import { FilterState } from './filterState.js';
import { FilterWidget } from './filterWidget.js';

class TreeDataSource {
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

const TreeManager = {
   headers: [],
   sortOrder: {},
   filters: new FilterState(), // Singleton instance of FilterState
   dragStartX: 0,
   dragStartY: 0,
   dragThreshold: 5,
   filterWidget: null,
   dataSource: new TreeDataSource(),

   init: function () {
      document.addEventListener("DOMContentLoaded", function () {
         TreeManager.filterWidget = new FilterWidget("fancyTreeFilterContainer", TreeManager.dataSource.getUniqueValues);
         TreeManager.fetchHeaders();
      });
       TreeManager.filters.registerCallback((header, source) => {
           if (source !== TreeManager) {
               TreeManager.updateOnFilterChanged(header);
           }
       });
   },

   fetchHeaders: function () {
      TreeManager.dataSource.fetchHeaders().then( (headers) =>{TreeManager.headers = headers;
         TreeManager.headers.forEach((header) => {
            TreeManager.sortOrder[header] = "asc";
         });
         TreeManager.updateTableHeaders();
         TreeManager.loadChildren({}).then((treeData) => {
            TreeManager.renderTree(treeData);
         });});
   },

   fetchRows: function (queryGroup, pathToGroup = null) {
      return TreeManager.dataSource.fetchRows(queryGroup, pathToGroup).then( (rows) => {
         TreeManager.filterWidget.updateOnNewContent(queryGroup, TreeManager.sortOrder[queryGroup]);
         return rows;
      });
   },

   updateTableHeaders: function () {
      const thead = document.querySelector("#fancyTable thead tr");
      thead.innerHTML = ""; // Reset headers

      TreeManager.headers.forEach(header => {
         const th = document.createElement("th");
         th.textContent = header;
         th.setAttribute('data-header', header);
         th.addEventListener('mousedown', TreeManager.handleMouseDown);
         th.addEventListener('mouseup', TreeManager.handleMouseUp);
         thead.appendChild(th);
      });

      TreeManager.makeHeadersSortable();
      TreeManager.updateSortIndicators();
   },

   handleMouseDown: function (event) {
      TreeManager.dragStartX = event.clientX;
      TreeManager.dragStartY = event.clientY;
   },

   handleMouseUp: function (event) {
      const dragEndX = event.clientX;
      const dragEndY = event.clientY;
      const diffX = Math.abs(dragEndX - TreeManager.dragStartX);
      const diffY = Math.abs(dragEndY - TreeManager.dragStartY);

      if (diffX < TreeManager.dragThreshold && diffY < TreeManager.dragThreshold) {
         TreeManager.handleHeaderClick(event);
      }
   },

   handleHeaderClick: function (event) {
      const header = event.target;
      const headerWidth = header.offsetWidth;
      const paddingRight = 30; // The same value as used in CSS for padding-right
      const clickX = event.clientX - header.getBoundingClientRect().left;
      const headerName = header.getAttribute('data-header');
      let level = 0;
      while (headerName !== TreeManager.headers[level]) {
         level++;
      }

      if (clickX > headerWidth - paddingRight) {
         // Continue with the sort logic if not clicked in the padding area
         if (!(headerName in TreeManager.sortOrder)) {
            TreeManager.sortOrder[headerName] = 'asc';
         } else {
            TreeManager.sortOrder[headerName] = (TreeManager.sortOrder[headerName] === 'asc') ? 'desc' : 'asc';
         }
         TreeManager.sortTree(level, TreeManager.sortOrder[headerName]);
         TreeManager.filterWidget.sort(headerName, TreeManager.sortOrder[headerName]);
         TreeManager.updateSortIndicators();
      } else {
         let currentSortOrder = TreeManager.sortOrder[headerName] || null;
         TreeManager.filterWidget.showWidget(headerName, currentSortOrder);
      }
   },

   updateOnFilterChanged: function (header) {
       console.log("updateOnFilterChanged", header);
      let level = 0;
      while (header !== TreeManager.headers[level]) {
         level++;
      }

      TreeManager.filterTree(level, TreeManager.filters.getFilter(header));
   },

   updateSortIndicators: function () {
      const headers = document.querySelectorAll("#fancyTable thead th");
      headers.forEach(header => {
         const headerName = header.getAttribute('data-header');
         header.classList.remove('sort-asc', 'sort-desc');
         if (TreeManager.sortOrder[headerName]) {
            header.classList.add(TreeManager.sortOrder[headerName] === 'asc' ? 'sort-asc' : 'sort-desc');
         }
      });
   },

   makeHeadersSortable: function () {
      $("#fancyTable thead").sortable({
         items: "> tr > th",
         axis: "x",
         stop: function (event, ui) {
            var newHeaders = [];
            $("#fancyTable thead th").each(function (index, element) {
               newHeaders.push($(element).text());
            });
            TreeManager.headers = newHeaders;
            TreeManager.updateTableHeaders();
            TreeManager.loadChildren({}).then((treeData) => {
               TreeManager.renderTree(treeData);
            });
         }
      });
   },

   renderTree: function (treeData) {
       console.log("renderTree");
      if ($("#fancyTreeContainer").data("ui-fancytree")) {
         $("#fancyTreeContainer").fancytree("destroy");
      }
      $("#fancyTreeContainer").fancytree({
         extensions: ["filter"],
         filter: {  // override default settings
           counter: false, // No counter badges
           mode: "hide"  // "dimm": Grayout unmatched nodes, "hide": remove unmatched nodes
         },
         source: treeData,
         click: function (event, data) {
            data.node.toggleExpanded();
         },
         lazyLoad: function (event, data) {
            data.result = TreeManager.loadChildren(data.node);
         },
         loadChildren: function(event, data) {
             let level = 0;
             let node = data.node;
             while(node.parent) {
                 level++;
                 node = node.parent;
             }
             let header = TreeManager.headers[level];
             if(! TreeManager.sortOrder[header])
             {
                 TreeManager.sortOrder[header] = "asc";
             }
            let filter = TreeManager.filters.getFilter(header);
             TreeManager.sortTree(level, TreeManager.sortOrder[header]);
             TreeManager.filterTree(level , filter);
         }
      });
   },

   getPathToGroupAndKey: function (node) {
      let parents = [];
      let currentNode = node;
      let depth = 0;
      while (currentNode.parent) {
         depth++;
         parents.push(currentNode.title);
         currentNode = currentNode.parent;
      }
      if (depth === TreeManager.headers.length) {
         return {};
      }
      let pathToGroup = {};
      let workKey = TreeManager.headers[depth];
      while (depth > 0) {
         depth--;
         pathToGroup[TreeManager.headers[depth]] = parents[parents.length - depth - 1];
      }
      return { path: pathToGroup, key: workKey };
   },

   getNextKey: function (key) {
      if (!key) {
         return TreeManager.headers.length > 0 ? TreeManager.headers[0] : '';
      }
      const index = TreeManager.headers.indexOf(key);
      if (index !== -1 && index < TreeManager.headers.length - 1) {
         return TreeManager.headers[index + 1];
      }
      return '';
   },

   addToObject: function (key, toInsert, target, pathToTarget) {
      var containsKey = false;
      var nextKey = TreeManager.getNextKey(key);
      target.forEach((obj) => {
         if (obj.title === toInsert[key]) {
            containsKey = true;
            if (nextKey && toInsert.hasOwnProperty(nextKey)) {
               if (!obj.children) {
                  obj.children = [];
               }
               pathToTarget[key] = toInsert[key];
               TreeManager.addToObject(nextKey, toInsert, obj.children, pathToTarget);
            }
         }
      });
      if (!containsKey) {
         if (key in toInsert) {
            pathToTarget[key] = toInsert[key];
            let canExpand = TreeManager.dataSource.queriedBranchesCache.hasQuery(nextKey, pathToTarget);
            let isLast = key === TreeManager.headers.at(-1);
            target.push({ title: toInsert[key], expanded: canExpand, lazy: !isLast });
            TreeManager.addToObject(key, toInsert, target, pathToTarget); // to insert the rest
         }
      }
   },

   loadChildren: function (node) {
      let nodeInfo = TreeManager.getPathToGroupAndKey(node);
      let pathToGroup = nodeInfo ? nodeInfo.path : {};
      let nodeKey = Object.keys(pathToGroup).length ? nodeInfo.key : TreeManager.headers[0];

      const buildTreeData = (rows) => {
        console.log("buildTreeData", rows);
         var treeData = [];
         for (let key in rows) {
            TreeManager.addToObject(nodeKey, rows[key], treeData, {});
         }
         return treeData;
      }

      let cachedRows = TreeManager.dataSource.fetchCachedRows(nodeKey, pathToGroup);
      if (Object.keys(cachedRows).length) {
          console.log("cached");
         return Promise.resolve(buildTreeData(cachedRows));
      }

      return TreeManager.fetchRows(nodeKey, pathToGroup).then((rows) => {
         console.log("fetched");
         return buildTreeData(rows);
      });
   },

   walkNode: function (node, currentLevel, targetLevel, callback) {
      if (currentLevel < targetLevel) {
         if (node.children) {
            node.children.forEach((childNode) => {
               TreeManager.walkNode(childNode, currentLevel + 1, targetLevel, callback);
            });
         }
      } else if (currentLevel === targetLevel) {
         callback(node);
      }
   },

   sortBranch: function (node, sortOrder) {
      node.sortChildren(function (a, b) {
         if (a.title < b.title) return sortOrder === 'asc' ? -1 : 1;
         if (a.title > b.title) return sortOrder === 'asc' ? 1 : -1;
         return 0;
      }, false);
   },

   sortTree: function (level, sortOrder) {
      let tree = $.ui.fancytree.getTree("#fancyTreeContainer");
      let root = tree.getRootNode();
      TreeManager.walkNode(root, 0, level, (node) => TreeManager.sortBranch(node, sortOrder));
   },

   filterBranch: function (node, filter) {
       // console.log("filter: ", node.title, filter);
      if (!node.children) return;
      node.children.forEach(function (childNode) {
          // console.log("childNode: ", childNode.title, childNode);
         if (Object.keys(filter).includes(childNode.title) && filter[childNode.title] === false) {
            childNode.setExpanded(false);
            childNode.addClass("hidden-node");
         } else {
            childNode.removeClass("hidden-node");
         }
      });
   },

   filterTree: function (level, filter) {
      let tree = $.ui.fancytree.getTree("#fancyTreeContainer");
      let root = tree.getRootNode();
      TreeManager.walkNode(root, 0, level, (node) => TreeManager.filterBranch(node, filter));
   },
};

// Initialize the TreeManager
TreeManager.init();
