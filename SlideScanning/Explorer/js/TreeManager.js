import { FilterState } from './filterState.js';
import { FilterWidget } from './filterWidget.js';
import { TreeDataSource } from './treeDataSource.js';
import { HeaderManager } from './headerManager.js';

export class TreeManager {
    constructor() {
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragThreshold = 5;
        this.filterWidget = null;
        this.dataSource = new TreeDataSource();
        this.headerManager = new HeaderManager(this); // Initialize HeaderManager
        this.filters = new FilterState(); // Singleton instance of FilterState

        // Initialize the manager when the DOM is fully loaded
        document.addEventListener("DOMContentLoaded", () => {
            this.filterWidget = new FilterWidget("fancyTreeFilterContainer", this.dataSource.getUniqueValues.bind(this.dataSource));
            this.headerManager.fetchHeaders().then(() => {
                this.loadChildren({}).then((treeData) => {
                    this.renderTree(treeData);
                });
            });
        });

        this.filters.registerCallback((header, source) => {
            if (source !== this) {
                this.updateOnFilterChanged(header);
            }
        });
    }

    fetchRows(queryGroup, pathToGroup = null) {
        return this.dataSource.fetchRows(queryGroup, pathToGroup).then((rows) => {
            this.filterWidget.updateOnNewContent(queryGroup, this.headerManager.sortOrder[queryGroup]);
            return rows;
        });
    }

    updateOnFilterChanged(header) {
        console.log("updateOnFilterChanged", header);
        let level = 0;
        while (header !== this.headerManager.headers[level]) {
            level++;
        }

        this.filterTree(level, this.filters.getFilter(header));
    }

    renderTree(treeData) {
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
            click: (event, data) => {
                data.node.toggleExpanded();
            },
            lazyLoad: (event, data) => {
                data.result = this.loadChildren(data.node);
            },
            loadChildren: (event, data) => {
                let level = 0;
                let node = data.node;
                while (node.parent) {
                    level++;
                    node = node.parent;
                }
                let header = this.headerManager.headers[level];
                if (!this.headerManager.sortOrder[header]) {
                    this.headerManager.sortOrder[header] = "asc";
                }
                let filter = this.filters.getFilter(header);
                this.sortTree(level, this.headerManager.sortOrder[header]);
                this.filterTree(level, filter);
            }
        });
    }

    getPathToGroupAndKey(node) {
        let parents = [];
        let currentNode = node;
        let depth = 0;
        while (currentNode.parent) {
            depth++;
            parents.push(currentNode.title);
            currentNode = currentNode.parent;
        }
        if (depth === this.headerManager.headers.length) {
            return {};
        }
        let pathToGroup = {};
        let workKey = this.headerManager.headers[depth];
        while (depth > 0) {
            depth--;
            pathToGroup[this.headerManager.headers[depth]] = parents[parents.length - depth - 1];
        }
        return { path: pathToGroup, key: workKey };
    }

    getNextKey(key) {
        if (!key) {
            return this.headerManager.headers.length > 0 ? this.headerManager.headers[0] : '';
        }
        const index = this.headerManager.headers.indexOf(key);
        if (index !== -1 && index < this.headerManager.headers.length - 1) {
            return this.headerManager.headers[index + 1];
        }
        return '';
    }

    addToObject(key, toInsert, target, pathToTarget) {
        var containsKey = false;
        var nextKey = this.getNextKey(key);
        target.forEach((obj) => {
            if (obj.title === toInsert[key]) {
                containsKey = true;
                if (nextKey && toInsert.hasOwnProperty(nextKey)) {
                    if (!obj.children) {
                        obj.children = [];
                    }
                    pathToTarget[key] = toInsert[key];
                    this.addToObject(nextKey, toInsert, obj.children, pathToTarget);
                }
            }
        });
        if (!containsKey) {
            if (key in toInsert) {
                pathToTarget[key] = toInsert[key];
                let canExpand = this.dataSource.queriedBranchesCache.hasQuery(nextKey, pathToTarget);
                let isLast = key === this.headerManager.headers.at(-1);
                target.push({ title: toInsert[key], expanded: canExpand, lazy: !isLast });
                this.addToObject(key, toInsert, target, pathToTarget); // to insert the rest
            }
        }
    }

    loadChildren(node) {
        let nodeInfo = this.getPathToGroupAndKey(node);
        let pathToGroup = nodeInfo ? nodeInfo.path : {};
        let nodeKey = Object.keys(pathToGroup).length ? nodeInfo.key : this.headerManager.headers[0];

        const buildTreeData = (rows) => {
            console.log("buildTreeData", rows);
            var treeData = [];
            for (let key in rows) {
                this.addToObject(nodeKey, rows[key], treeData, {});
            }
            return treeData;
        }

        let cachedRows = this.dataSource.fetchCachedRows(nodeKey, pathToGroup);
        if (Object.keys(cachedRows).length) {
            console.log("cached");
            return Promise.resolve(buildTreeData(cachedRows));
        }

        return this.fetchRows(nodeKey, pathToGroup).then((rows) => {
            console.log("fetched");
            return buildTreeData(rows);
        });
    }

    walkNode(node, currentLevel, targetLevel, callback) {
        if (currentLevel < targetLevel) {
            if (node.children) {
                node.children.forEach((childNode) => {
                    this.walkNode(childNode, currentLevel + 1, targetLevel, callback);
                });
            }
        } else if (currentLevel === targetLevel) {
            callback(node);
        }
    }

    sortBranch(node, sortOrder) {
        node.sortChildren((a, b) => {
            if (a.title < b.title) return sortOrder === 'asc' ? -1 : 1;
            if (a.title > b.title) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        }, false);
    }

    sortTree(level, sortOrder) {
        let tree = $.ui.fancytree.getTree("#fancyTreeContainer");
        let root = tree.getRootNode();
        this.walkNode(root, 0, level, (node) => this.sortBranch(node, sortOrder));
    }

    filterBranch(node, filter) {
        if (!node.children) return;
        node.children.forEach((childNode) => {
            if (Object.keys(filter).includes(childNode.title) && filter[childNode.title] === false) {
                childNode.setExpanded(false);
                childNode.addClass("hidden-node");
            } else {
                childNode.removeClass("hidden-node");
            }
        });
    }

    filterTree(level, filter) {
        let tree = $.ui.fancytree.getTree("#fancyTreeContainer");
        let root = tree.getRootNode();
        this.walkNode(root, 0, level, (node) => this.filterBranch(node, filter));
    }
}
