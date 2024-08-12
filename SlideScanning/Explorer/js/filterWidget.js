class FilterWidget {

    constructor(containerId) {
        this.optionElements = [];
        this.container = document.getElementById(containerId);
        this.activeHeader = "";
    }

    createWidgetHead(header, content, headerOptions, onOptionsChangedCallback) {
        const filterItem = document.createElement("div");
        filterItem.classList.add("filter-edit");

        // Set up flexbox to align items
        filterItem.style.display = "flex";
        filterItem.style.justifyContent = "space-between";
        filterItem.style.alignItems = "center";

        // Create the label and input
        const labelInputContainer = document.createElement("div");
        labelInputContainer.style.display = "flex";
        labelInputContainer.style.alignItems = "center";

        const mainLabel = document.createElement("label");
        mainLabel.textContent = `${header}:`;
        mainLabel.classList.add("filter-label-rightgap");
        labelInputContainer.appendChild(mainLabel);

        const edit = document.createElement("input");
        edit.type = "text";
        edit.addEventListener('input', (event) => {
            const filterValue = event.target.value.toLowerCase();
            console.log("changed: ", filterValue);
            this.filterOptions(filterValue, headerOptions);
        });
        labelInputContainer.appendChild(edit);

        filterItem.appendChild(labelInputContainer);

        // Create buttons container
        const buttonsContainer = document.createElement("div");
        buttonsContainer.style.display = "flex";
        buttonsContainer.style.gap = "10px"; // Space between buttons

        // Invert selection button
        const invertButton = document.createElement("button");
        invertButton.textContent = "Invert Selection";
        invertButton.addEventListener('click', () => {
            let allChanged = {};
            this.optionElements.forEach(({ item }) => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                allChanged[checkbox.id] = checkbox.checked;
            });
            console.log("Changed: ", allChanged);
            onOptionsChangedCallback(allChanged);
        });
        buttonsContainer.appendChild(invertButton);

        // Check all button
        const checkAllButton = document.createElement("button");
        checkAllButton.textContent = "Check All";
        checkAllButton.addEventListener('click', () => {
            let allChanged = {};
            this.optionElements.forEach(({ item }) => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                checkbox.checked = true;
                allChanged[checkbox.id] = checkbox.checked;
            });
            onOptionsChangedCallback(allChanged);
        });
        buttonsContainer.appendChild(checkAllButton);

        filterItem.appendChild(buttonsContainer);

        content.appendChild(filterItem);
    }

    createWidget(header, headerOptions, currentFilter, onOptionsChangedCallback) {
        this.optionElements = [];
        const widget = document.createElement("div");
        widget.classList.add("filter-widget");
        widget.setAttribute("data-header", header);
        this.activeHeader = header;

        // Add a scrollable content area
        const content = document.createElement("div");
        content.classList.add("filter-content");

        this.createWidgetHead(header, content, headerOptions, onOptionsChangedCallback);

        headerOptions.forEach((opt) => {
            // Create a container div for each checkbox and label
            const item = document.createElement("div");

            // Create the checkbox input
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = opt; // Set an id for the checkbox
            checkbox.checked = ( currentFilter && currentFilter.has(opt)) ? false : true;

            checkbox.addEventListener('change', (event) => {
                const isChecked = event.target.checked;
                onOptionsChangedCallback( {[opt] : isChecked});
            });

            // Create the label for the checkbox
            const label = document.createElement("label");
            label.htmlFor = opt; // Associate the label with the checkbox
            label.textContent = opt;

            // Append the checkbox and label to the container div
            item.appendChild(checkbox);
            item.appendChild(label);

            // Append the container div to the content
            content.appendChild(item);

            // Store the elements for filtering
            this.optionElements.push({ item, label });
        });

        widget.appendChild(content);

        return widget;
    }

    filterOptions(filterValue, headerOptions) {
        this.optionElements.forEach(({ item, label }) => {
            if (label.textContent.toLowerCase().includes(filterValue)) {
                item.style.display = "";
            } else {
                item.style.display = "none";
            }
        });
    }

    showWidget(header, headerOptions, currentFilter, onOptionsChangedCallback, sortOrder) {
        const existingWidget = document.querySelector(`#${this.container.id} .filter-widget`);

        if (existingWidget) {
            const existingHeader = existingWidget.getAttribute('data-header');
            if (existingHeader === header) {
                this.container.removeChild(existingWidget);
                return;
            } else {
                this.container.removeChild(existingWidget);
            }
        }

        // Create and show the new filter widget
        const widget = this.createWidget(header, headerOptions, currentFilter, onOptionsChangedCallback, sortOrder);
        this.container.appendChild(widget);
        if(sortOrder) {
            this.sort(header, sortOrder);
        }
    }

    sort( header, sortOrder) {
        if(header !== this.activeHeader)
            return;
        if(this.optionElements.length === 0)
            return;
        this.optionElements.sort(
            function(a, b) {
                if (a.label.textContent < b.label.textContent) return sortOrder === 'asc' ? -1 : 1;
                if (a.label.textContent > b.label.textContent) return sortOrder === 'asc' ? 1 : -1;
                return 0;
        });
        const content = this.container.querySelector('.filter-content');
        this.optionElements.forEach(({ item }) => {
            content.appendChild(item);  // Append sorted items to the content container
        });
    }
}
