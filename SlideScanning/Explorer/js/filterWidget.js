class FilterWidget {

    constructor(containerId, getUniqueValuesCallback) {
        this.containerId = containerId;
        this.optionElements = [];
        this.container = document.getElementById(containerId);
        this.activeHeader = "";
        this.filterState = new FilterState(); // Singleton-like instance
        this.getUniqueValues = getUniqueValuesCallback;
    }

    createWidgetHead(header, content) {
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
            this.filterOptions(filterValue);
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
            this.optionsChanged(allChanged);
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
            this.optionsChanged(allChanged);
        });
        buttonsContainer.appendChild(checkAllButton);

        filterItem.appendChild(buttonsContainer);

        content.appendChild(filterItem);
    }

    updateOnNewContent(header, sortOrder) {
        // Find the widget with the specified header
        const widget = this.container.querySelector(`.filter-widget[data-header="${header}"]`);

        if (widget) {
            // Find the content element within the widget
            const content = widget.querySelector('.filter-content');

            if (content) {
                this.updateCheckBoxes(header, content);
            }
        }
        this.sort(header, sortOrder);
    }

    updateCheckBoxes(header, content) {
        const checkboxContainers = content.querySelectorAll('div > input[type="checkbox"]');

        checkboxContainers.forEach((checkbox) => {
            const container = checkbox.parentElement; // Assuming each checkbox is directly inside a container div
            content.removeChild(container); // Remove the entire container (checkbox + label)
        });
        this.optionElements = [];
        const headerOptions = this.getUniqueValues(header);

        // Get the current filter state for this header
        const currentFilter = this.filterState.getFilter(header);

        headerOptions.forEach((opt) => {
            // Create a container div for each checkbox and label
            const item = document.createElement("div");

            // Create the checkbox input
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = opt; // Set an id for the checkbox
            checkbox.checked = !(currentFilter && currentFilter[opt] === false); // Default to true if not in filter or true

            checkbox.addEventListener('change', (event) => {
                const isChecked = event.target.checked;
                this.optionsChanged({ [opt]: isChecked });
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
    }

    createWidget(header) {
        this.optionElements = [];
        this.activeHeader = header;

        const widget = document.createElement("div");
        widget.classList.add("filter-widget");
        widget.setAttribute("data-header", header);

        // Add a scrollable content area
        const content = document.createElement("div");
        content.classList.add("filter-content");

        // Create the widget head (label, input, buttons)
        this.createWidgetHead(header, content);

        this.updateCheckBoxes(header, content);

        widget.appendChild(content);

        return widget;
    }

    filterOptions(filterValue) {
        this.optionElements.forEach(({ item, label }) => {
            if (label.textContent.toLowerCase().includes(filterValue)) {
                item.style.display = "";
            } else {
                item.style.display = "none";
            }
        });
    }

    showWidget(header, sortOrder) {
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
        const widget = this.createWidget(header);
        this.container.appendChild(widget);
        if (sortOrder) {
            this.sort(header, sortOrder);
        }
    }

    sort(header, sortOrder) {
        if (header !== this.activeHeader) return;
        if (this.optionElements.length === 0) return;

        this.optionElements.sort((a, b) => {
            if (a.label.textContent < b.label.textContent) return sortOrder === 'asc' ? -1 : 1;
            if (a.label.textContent > b.label.textContent) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        const content = this.container.querySelector('.filter-content');
        this.optionElements.forEach(({ item }) => {
            content.appendChild(item); // Append sorted items to the content container
        });
    }

    optionsChanged(filterDiff) {
        // Update the filter state
        this.filterState.updateFilter(this.activeHeader, filterDiff, this.containerId);

        // You can also trigger any other actions needed when the filter changes, e.g., re-filtering data
        console.log("Filter updated:", this.filterState.currentFilter);
    }
}
