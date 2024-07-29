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
         //console.log("hasQuery::keys", keys);
         for( let key of keys) {
            //console.log("hasQuery: progression:", key);
            if(!((key in targetData) && (pathToGroup[key] in targetData[key])))
            {
               //console.log("hasQuery: false", key, pathToGroup[key], this.data, targetData);
               return false;
            } else {
               targetData = targetData[key][pathToGroup[key]];
               //console.log("hasQuery: changingTargeData: ", key, pathToGroup, targetData);
            }
         }
      }
      //console.log("hasQUery: ", (query in targetData), query, pathToGroup, this.data );
      return (query in targetData);
   }

}

const TreeManager = {
   headers: [],
   rows: {},
   sortOrder: 'asc', // Default sort order
   currentSortColumn: null, // To track the current sorted column
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
            TreeManager.fetchRows(TreeManager.headers[0]);
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
            oldRows[row["rowID"]] = row;
         } );   
      }
      fetch(url, {
         method: 'GET'
      })
         .then(response => response.json())
         .then(rows => {
            console.log("fetchRows: ", rows);
            this.queriedBranchesCache.addQuery(queryGroup, pathToGroup);
            mergeRows(TreeManager.rows, rows);
            TreeManager.populateTree(TreeManager.rows);
         })
         .catch(error => {
            console.error('Error fetching rows:', error);
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
      if (TreeManager.currentSortColumn === header) {
         TreeManager.sortOrder = TreeManager.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
         TreeManager.currentSortColumn = header;
         TreeManager.sortOrder = 'asc';
      }
      TreeManager.sortTree();
      TreeManager.updateSortIndicators();
   },

   updateSortIndicators: function () {
      const headers = document.querySelectorAll("#fancyTable thead th");
      headers.forEach(header => {
         header.classList.remove('sort-asc', 'sort-desc');
         if (header.getAttribute('data-header') === TreeManager.currentSortColumn) {
            header.classList.add(TreeManager.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
         }
      });
   },

   renderTree: function(treeData) {
      if ($("#fancyTreeContainer").data("ui-fancytree")) {
         $("#fancyTreeContainer").fancytree("destroy");
      }
      $("#fancyTreeContainer").fancytree({
         source: treeData,
         activate: function(event, data) {
            console.log("ACTIVATE");
            var node = data.node;
            var parents = [];
            var currentNode = node;
            var depth = 0;
            while (currentNode.parent) {
               depth++;
               parents.push(currentNode.title);
               currentNode = currentNode.parent;
            }
            if(depth == TreeManager.headers.length)
            {
               return;
            }
            var pathToGroup = {};
            var key = TreeManager.headers[depth];
            while(depth > 0) {
               depth--;
               pathToGroup[TreeManager.headers[depth]] = parents[parents.length - depth - 1];
            }
            console.log("activate:pathToGroup", pathToGroup);
            if( TreeManager.queriedBranchesCache.hasQuery(key, pathToGroup, true))
            {
               node.toggleExpanded();
            } else {
               TreeManager.fetchRows(key, pathToGroup);
            }
            // Perform other actions here
         }
      });

      //TreeManager.sortTree();
   },

   populateTree: function (rows) {

      console.log("populateTree", rows);
      
       const getNextKey = (key) => {
         if (!key) {
           return TreeManager.headers.length > 0 ? TreeManager.headers[0] : '';
         }
         const index = TreeManager.headers.indexOf(key);
         if (index !== -1 && index < TreeManager.headers.length - 1) {
           return TreeManager.headers[index + 1];
         }
         return '';
       };


       const addToObject = (key, toInsert, target, pathToTarget) => {
         var containsKey = false;
         var nextKey = getNextKey(key);
         target.forEach((obj) => {
           if (obj.title === toInsert[key]) {
             containsKey = true;
             if (nextKey && toInsert.hasOwnProperty(nextKey)) {
                if (!obj.children) {
                  obj.children = [];
               }
               pathToTarget[key] = toInsert[key];
               addToObject(nextKey, toInsert, obj.children, pathToTarget);
             }
           }
         });
         if (!containsKey) {
            if(key in toInsert)
            {
               pathToTarget[key] = toInsert[key];
               console.log("addToObject:pathToGroup", pathToTarget);
               let canExpand = TreeManager.queriedBranchesCache.hasQuery(nextKey, pathToTarget);
               console.log("ToInsert: ", key, toInsert[key], canExpand);
               target.push({ title: toInsert[key], expanded: canExpand });
               addToObject(key, toInsert, target, pathToTarget); // to insert the rest
            }
         }
       };

      var treeData = [];
      for( let key in rows){
         console.log("Add row to TreeData START", rows[key]);
         addToObject(TreeManager.headers[0], rows[key], treeData, {});
         console.log("Add row to TreeData END", rows[key]);
      }

      this.renderTree(treeData);
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
            TreeManager.fetchRows(TreeManager.headers[0]);
         }
      });
   },

   sortTree: function () {
      const sortBy = TreeManager.currentSortColumn;
      const sortOrder = TreeManager.sortOrder;
      if (!sortBy) return;
      $("#fancyTreeContainer").fancytree("getRootNode").sortChildren(function(a, b) {
         if (a.data[sortBy] < b.data[sortBy]) return sortOrder === 'asc' ? -1 : 1;
         if (a.data[sortBy] > b.data[sortBy]) return sortOrder === 'asc' ? 1 : -1;
         return 0;
      }, true);
   }
};

// Initialize the TreeManager
TreeManager.init();
