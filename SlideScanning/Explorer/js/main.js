class QueriesCache {
   constructor() {
      this.data = {};
   }

   addQuery(query, pathToGroup) {
      let targetData = this.data;
      if(pathToGroup){
         let keys = Object.keys(pathToGroup).reverse();
         for( let key of keys) {
            if( ! (key in targetData) )
            {
               targetData[key] = {};
            }
            if( ! (pathToGroup[key] in targetData[key]) )
            {
               targetData[key][pathToGroup[key]] = {};
            }
            targetData = targetData[key][pathToGroup[key]];
         }
      }
      targetData[query] = {};
   }

   hasQuery(query, pathToGroup, reversKeys = false) {
      let targetData = this.data;
      if(pathToGroup){
         let keys = reversKeys ? Object.keys(pathToGroup).reverse() :Object.keys(pathToGroup);
         for( let key of keys) {
            if(!((key in targetData) && (pathToGroup[key] in targetData[key])))
            {
               return false;
            } else {
               targetData = targetData[key][pathToGroup[key]];
            }
         }
      }
      return (query in targetData);
   }

}

const TreeManager = {
   headers: [],
   rows: {},
   sortOrder: {},
   queriedBranchesCache: new QueriesCache(),

   init: function () {
      document.addEventListener("DOMContentLoaded", function () {
         TreeManager.fetchHeaders();
      });
   },

   fetchHeaders: function () {
      fetch('http://localhost:8080/headers', {
         method: 'GET'
      })
         .then(response => response.json())
         .then(headers => {
            TreeManager.headers = headers;
            TreeManager.updateTableHeaders();
            TreeManager.loadChildren({}).then( (treeData) => {
            TreeManager.renderTree(treeData);
            });
         })
         .catch(error => {
            console.error('Error fetching headers:', error);
         });
   },

   fetchRows: function ( queryGroup, pathToGroup = null ) {
      let url = 'http://localhost:8080/rows';
      let queryParams = new URLSearchParams();

      queryParams.append('queryGroup', queryGroup);

      if (pathToGroup) {
        Object.entries(pathToGroup).forEach(([key, value]) => {
            queryParams.append(key, value);
        });
      }

      url += `?${queryParams.toString()}`;

      const mergeRows = (oldRows, newRows) => {
         newRows.forEach( (row) =>{
            Object.keys(row).forEach((key) => {
               if(!oldRows.hasOwnProperty(row["rowID"])){
                  oldRows[row["rowID"]]=[];
               }
               oldRows[row["rowID"]][key] = row[key];
            });
         } );   
      }
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
            console.log("fetchRows: ", rows);
            this.queriedBranchesCache.addQuery(queryGroup, pathToGroup);
            mergeRows(TreeManager.rows, rows);
            return rows;
         })
         .catch(error => {
            console.error('Error fetching rows:', error);
            return [];
         });
   },

   updateTableHeaders: function () {
      const thead = document.querySelector("#fancyTable thead tr");
      thead.innerHTML = ""; // Reset headers
  
      TreeManager.headers.forEach(header => {
         const th = document.createElement("th");
         th.textContent = header;
         th.setAttribute('data-header', header);
         th.addEventListener('click', TreeManager.handleHeaderClick);
         thead.appendChild(th);
      });
  
      TreeManager.makeHeadersSortable();
    },

   handleHeaderClick: function (event) {
      const header = event.target.getAttribute('data-header');
      if (!(header in TreeManager.sortOrder))
      {
          TreeManager.sortOrder[header] = 'asc';
      } else {
          TreeManager.sortOrder[header] = (TreeManager.sortOrder[header] === 'asc') ? 'desc' :'asc';
      }
      let level = 0;
      while(header !== TreeManager.headers[level]){
          level++;
      }
      TreeManager.sortTree(level,TreeManager.sortOrder[header]);
   },

   renderTree: function(treeData) {
      console.log("rednerTree: ", treeData);
      if ($("#fancyTreeContainer").data("ui-fancytree")) {
         $("#fancyTreeContainer").fancytree("destroy");
      }
      $("#fancyTreeContainer").fancytree({
         source: treeData,
         click: function(event, data) {
               data.node.toggleExpanded();
         },
         lazyLoad: function(event, data) {
             data.result = TreeManager.loadChildren(data.node);
          },
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
       if(depth === TreeManager.headers.length)
       {
          return {};
       }
       let pathToGroup = {};
       let workKey = TreeManager.headers[depth];
       while(depth > 0) {
          depth--;
          pathToGroup[TreeManager.headers[depth]] = parents[parents.length - depth - 1];
       }
       return { path: pathToGroup, key: workKey};
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
         if(key in toInsert)
         {
            pathToTarget[key] = toInsert[key];
            let canExpand = TreeManager.queriedBranchesCache.hasQuery(nextKey, pathToTarget);
             let isLast = key === TreeManager.headers.at(-1);
            target.push({ title: toInsert[key], expanded: canExpand, lazy: !isLast });
            TreeManager.addToObject(key, toInsert, target, pathToTarget); // to insert the rest
         }
      }
    },

    fetchCachedRows: function(key, pathToGroup) {
        if (TreeManager.queriedBranchesCache.hasQuery(key, pathToGroup))
        {
            return TreeManager.rows;
        }
        return [];
    },

    loadChildren: function (node) {
        let nodeInfo = TreeManager.getPathToGroupAndKey(node);
        let pathToGroup = nodeInfo ? nodeInfo.path : {};
        let nodeKey = Object.keys(pathToGroup).length ? nodeInfo.key : TreeManager.headers[0];

        const buildTreeData = (rows) => {
            var treeData = [];
            for( let key in rows){
               TreeManager.addToObject(nodeKey, rows[key], treeData, {});
            }
            return treeData;
        }

        let cachedRows = TreeManager.fetchCachedRows(nodeKey, pathToGroup);
        if ( Object.keys(cachedRows).length) {
            return Promise.resolve(buildTreeData(cachedRows)); // The promiese allows only to chain in .then clause
        }

        return TreeManager.fetchRows(nodeKey, pathToGroup).then( (rows) => {
            return buildTreeData(rows);
        }
        );
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
             TreeManager.loadChildren({}).then( (treeData) => {
             TreeManager.renderTree(treeData);
             });
         }
      });
   },

   sortBranch: function(node, sortOrder) {
       node.sortChildren(function(a, b) {
           if (a.title < b.title) return sortOrder === 'asc' ? -1 : 1;
           if (a.title > b.title) return sortOrder === 'asc' ? 1 : -1;
           return 0;
        }, true);
   },

    walkNode: function(node, currentLevel, targetLevel, callback) {
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

   sortTree: function (level, sortOrder) {
       let tree = $.ui.fancytree.getTree("#fancyTreeContainer");
       let root = tree.getRootNode();
       TreeManager.walkNode(root, 0, level, (node) => TreeManager.sortBranch(node, sortOrder));
   }
};

// Initialize the TreeManager
TreeManager.init();

const TreeManagerTest = {

    getTestData: function () {
          // Sample static data for testing
          return [
             { title: "Root 1", folder: true, children: [
                { title: "Child 1.1", folder: true, children: [
                   { title: "Child 1.1.1", folder: false, noExpander: true },
                   { title: "Child 1.1.2", folder: false, noExpander: true }
                ]},
                { title: "Child 1.2", folder: false, noExpander: true }
             ]},
             { title: "Root 2", folder: true, children: [
                { title: "Child 2.1", folder: false, noExpander: true }
             ]}
          ];
       },

   init: function () {
      document.addEventListener("DOMContentLoaded", function () {
          $("#fancyTreeContainer").fancytree({
             source: TreeManagerTest.getTestData(),
          });
      });
   },

};

//TreeManagerTest.init();
