export class HeaderManager {
    constructor(treeManager) {
        this.treeManager = treeManager; // Reference to TreeManager
        this.headers = [];
        this.sortOrder = {};

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/gnr_slide_scanning/SlideScanning/Explorer/css/headermanager.css';
        document.head.appendChild(link);
    }

    fetchHeaders() {
        return this.treeManager.dataSource.fetchHeaders().then((headers) => {
            this.headers = headers;
            this.headers.forEach((header) => {
                this.sortOrder[header] = "asc";
            });
            this.updateTableHeaders();
            return headers;
        });
    }

    updateTableHeaders() {
        const thead = document.querySelector("#fancyTable thead tr");
        thead.innerHTML = ""; // Reset headers

        this.headers.forEach(header => {
            const th = document.createElement("th");

            // Create a container for the upper part
            const upperPart = document.createElement("div");
            upperPart.classList.add("header-upper");

            // Header text and sort indicator
            const headerName = document.createElement("span");
            headerName.textContent = header;

            upperPart.appendChild(headerName);

            // Create a container for the lower part (highlight background and label)
            const lowerPart = document.createElement("div");
            lowerPart.classList.add("header-lower");
            lowerPart.textContent = "Highlight"; // This can be customized based on your needs

            // Append the upper and lower parts to the th element
            th.appendChild(upperPart);
            th.appendChild(lowerPart);

            th.setAttribute('data-header', header); // Ensure the data-header attribute is set correctly
            th.addEventListener('mousedown', this.handleMouseDown.bind(this));
            th.addEventListener('mouseup', this.handleMouseUp.bind(this));

            thead.appendChild(th);
        });

        this.makeHeadersSortable();
        this.updateSortIndicators();
    }

    handleMouseDown(event) {
        this.treeManager.dragStartX = event.clientX;
        this.treeManager.dragStartY = event.clientY;
    }

    handleMouseUp(event) {
        const dragEndX = event.clientX;
        const dragEndY = event.clientY;
        const diffX = Math.abs(dragEndX - this.treeManager.dragStartX);
        const diffY = Math.abs(dragEndY - this.treeManager.dragStartY);

        if (diffX < this.treeManager.dragThreshold && diffY < this.treeManager.dragThreshold) {
            this.handleHeaderClick(event);
        }
    }

    handleHeaderClick(event) {
        const header = event.target;
        const headerWidth = header.offsetWidth;
        const paddingRight = 30; // The same value as used in CSS for padding-right
        const clickX = event.clientX - header.getBoundingClientRect().left;
        const headerName = header.getAttribute('data-header');
        let level = 0;
        while (headerName !== this.headers[level]) {
            level++;
        }

        if (clickX > headerWidth - paddingRight) {
            // Continue with the sort logic if not clicked in the padding area
            if (!(headerName in this.sortOrder)) {
                this.sortOrder[headerName] = 'asc';
            } else {
                this.sortOrder[headerName] = (this.sortOrder[headerName] === 'asc') ? 'desc' : 'asc';
            }
            this.treeManager.sortTree(level, this.sortOrder[headerName]);
            this.treeManager.filterWidget.sort(headerName, this.sortOrder[headerName]);
            this.updateSortIndicators();
        } else {
            let currentSortOrder = this.sortOrder[headerName] || null;
            this.treeManager.filterWidget.showWidget(headerName, currentSortOrder);
        }
    }

    updateSortIndicators() {
        const headers = document.querySelectorAll("#fancyTable thead th");
        headers.forEach(header => {
            const headerName = header.getAttribute('data-header');
            header.classList.remove('sort-asc', 'sort-desc');
            if (this.sortOrder[headerName]) {
                header.classList.add(this.sortOrder[headerName] === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    makeHeadersSortable() {
        $("#fancyTable thead").sortable({
            items: "> tr > th",
            axis: "x",
            stop: (event, ui) => {
                var newHeaders = [];
                $("#fancyTable thead th").each(function (index, element) {
                    newHeaders.push($(element).attr('data-header')); // Use the data-header attribute instead of text content
                });
                this.headers = newHeaders;
                this.updateTableHeaders();
                this.treeManager.loadChildren({}).then((treeData) => {
                    this.treeManager.renderTree(treeData);
                });
            }
        });
    }
}
