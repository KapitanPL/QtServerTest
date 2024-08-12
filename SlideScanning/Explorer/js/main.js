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
   filters: {},
   queriedBranchesCache: new QueriesCache(),
   dragStartX: 0, // To store the starting X position of the drag
   dragStartY: 0, // To store the starting Y position of the drag
   dragThreshold: 5, // Threshold to differentiate between click and drag
   filterWidget: null,

   init: function () {
      document.addEventListener("DOMContentLoaded", function () {
         TreeManager.filterWidget = new FilterWidget("fancyTreeFilterContainer");
         TreeManager.fetchHeaders();
      });
   },

   fetchHeaders: function () {
      fetch('http://localhost:8080/headers', {
         method: 'GET'
      })
         .then(response => response.json())
         .then(headers => {
                   console.log("headers", JSON.stringify(headers));
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
               TreeManager.filterWidget.sort(headerName,TreeManager.sortOrder[headerName]);
               TreeManager.updateSortIndicators();
           } else {
               let currentFilter = Object.keys(TreeManager.filters).includes(headerName) ? TreeManager.filters[headerName] : null;
               let currentSortOrder = Object.keys(TreeManager.sortOrder).includes(headerName) ? TreeManager.sortOrder[headerName] : null;
               TreeManager.filterWidget.showWidget(headerName, TreeManager.getUniqueValues(headerName), currentFilter, (filtersChanged) => TreeManager.updateOnFilterChanged(headerName, filtersChanged), currentSortOrder);
           }
   },

    updateOnFilterChanged: function(header, filtersChanged){
        let level = 0;
        while (header !== TreeManager.headers[level]) {
            level++;
        }
        if(Object.keys(TreeManager.filters).includes(header) === false) {
           TreeManager.filters[header] = new Set();
        }

        console.log("update: ", filtersChanged, typeof(filtersChanged));
        Object.entries(filtersChanged).forEach( ([opt, check]) => {
            if( !check ) {
               TreeManager.filters[header].add(opt);
            } else {
               TreeManager.filters[header].delete(opt);
            }
        });

        TreeManager.filterTree(level, TreeManager.filters[header]);
    },

    getUniqueValues: function(key){
        let values = new Set();
        Object.entries(TreeManager.rows).forEach( ([id, row]) => {
            if( Object.keys(row).includes(key) ) {
                values.add(row[key]);
            }
        });
        return values;
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
              TreeManager.loadChildren({}).then( (treeData) => {
              TreeManager.renderTree(treeData);
              });
          }
       });
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


    sortBranch: function(node, sortOrder) {
        node.sortChildren(function(a, b) {
            if (a.title < b.title) return sortOrder === 'asc' ? -1 : 1;
            if (a.title > b.title) return sortOrder === 'asc' ? 1 : -1;
            return 0;
         }, true);
    },

   sortTree: function (level, sortOrder) {
       let tree = $.ui.fancytree.getTree("#fancyTreeContainer");
       let root = tree.getRootNode();
       TreeManager.walkNode(root, 0, level, (node) => TreeManager.sortBranch(node, sortOrder));
   },

    filterBranch: function(node, filterOut) {
        if(!node.children)
            return;
        node.children.forEach(function(childNode) {
            if ( filterOut.has( childNode.title ) ) {
                childNode.setExpanded(false);
                $(childNode.span).hide();
            } else {
                $(childNode.span).show();
            }
        });
    },

    filterTree: function(level, filterOut){
        let tree = $.ui.fancytree.getTree("#fancyTreeContainer");
        let root = tree.getRootNode();
        TreeManager.walkNode(root, 0, level, (node) => TreeManager.filterBranch(node, filterOut));
    },
};

// Initialize the TreeManager
TreeManager.init();
