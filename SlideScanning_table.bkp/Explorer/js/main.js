const TreeManager = {
   headers: [],
   rows: [],
   currentSortColumn: null,
   sortOrder: 'asc', // or 'desc'

   init: function () {
      document.addEventListener("DOMContentLoaded", function () {
         TreeManager.fetchHeaders();
         TreeManager.setupFilter();
      });
   },

   fetchHeaders: function () {
      fetch('http://localhost:8080/headers', {
         method: 'GET'
      })
         .then(response => response.json())
         .then(headers => {
            console.log("Fetched Headers: ", headers);
            TreeManager.headers = headers;
            TreeManager.updateTableHeaders();
            TreeManager.fetchRows();
         })
         .catch(error => {
            console.error('Error fetching headers:', error);
         });
   },

   fetchRows: function () {
      fetch('http://localhost:8080/rows', {
         method: 'GET'
      })
         .then(response => response.json())
         .then(rows => {
            console.log("Fetched Rows: ", rows);
            TreeManager.rows = rows;
            TreeManager.populateTree(rows);
         })
         .catch(error => {
            console.error('Error fetching rows:', error);
         });
   },

   updateTableHeaders: function () {
      const thead = document.querySelector("#fancyTreeContainer thead tr");
      thead.innerHTML = ""; // Reset headers

      TreeManager.headers.forEach(header => {
         const th = document.createElement("th");
         th.textContent = header;
         th.classList.add('resizable');
         th.setAttribute('data-header', header);
         th.addEventListener('click', TreeManager.handleHeaderClick);
         thead.appendChild(th);
      });

      TreeManager.makeHeadersResizable();
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
      const headers = document.querySelectorAll("#fancyTreeContainer thead th");
      headers.forEach(header => {
         header.classList.remove('sort-asc', 'sort-desc');
         if (header.getAttribute('data-header') === TreeManager.currentSortColumn) {
            console.log(`Updating sort indicator for ${header.getAttribute('data-header')} with class ${TreeManager.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc'}`);
            header.classList.add(TreeManager.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
            console.log('Class list:', header.classList);
         }
      });
   },

   populateTree: function (rows) {
      console.log("LOGGING ROWS: ", rows);
      var treeData = rows.map(row => {
         var nodeData = {};
         TreeManager.headers.forEach(header => {
            nodeData[header] = row[header];
         });
         return {
            data: nodeData
         };
      });

      console.log("LOGGING TREEDATA: ", treeData);

      // Use FancyTree to render the tree
      $("#fancyTreeContainer").fancytree({
         extensions: ["table", "filter", "dnd5"],
         source: treeData,
         table: {
            indentation: 20, // indent 20px per node level
            nodeColumnIdx: -1  // Disable the node title column
         },
         filter: {
            autoExpand: true,
            mode: "hide"
         },
         renderColumns: function (event, data) {
            var node = data.node,
               $tdList = $(node.tr).find(">td");

            TreeManager.headers.forEach((header, index) => {
               console.log(`Setting cell ${index} for header ${header} to ${node.data[header]}`);
               $tdList.eq(index).text(node.data[header] || "Dummy");
            });
         }
      });

      TreeManager.sortTree();
   },

   makeHeadersResizable: function () {
      $("#fancyTreeContainer th").resizable({
         handles: "e",
         resize: function(event, ui) {
            var th = ui.element;
            var index = th.index() + 1;
            var td = $("#fancyTreeContainer tbody td:nth-child(" + index + ")");
            td.width(th.width());
         },
         stop: function(event, ui) {
            var th = ui.element;
            var index = th.index() + 1;
            var td = $("#fancyTreeContainer tbody td:nth-child(" + index + ")");
            td.width(th.width());
         }
      });
   },

   makeHeadersSortable: function () {
      $("#fancyTreeContainer thead tr").sortable({
         axis: "x",
         stop: function (event, ui) {
            var newHeaders = [];
            $("#fancyTreeContainer thead th").each(function (index, element) {
               newHeaders.push($(element).text());
            });
            TreeManager.headers = newHeaders;
            TreeManager.updateTableHeaders();
            TreeManager.populateTree(TreeManager.rows); // Re-render the tree with reordered headers
            TreeManager.updateSortIndicators(); // Ensure sort indicators are updated
         }
      });
   },

   setupFilter: function () {
      $("#filterInput").keyup(function (e) {
         var match = $(this).val();
         $("#fancyTreeContainer").fancytree("getTree").filterNodes(match, {
            autoExpand: true
         });
      });
   },

   clearFilter: function () {
      $("#filterInput").val("");
      $("#fancyTreeContainer").fancytree("getTree").clearFilter();
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
