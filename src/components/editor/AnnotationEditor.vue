<script setup>
  import Question from "./Question.vue";
  import _ from 'lodash';
</script>

<script>
export default {
    props: [
        'edits_dict', 'hits_data', 'current_hit', 'selected_edits_html', 'selected_edits',
        'selected_state', 'set_span_text', 'set_span_indices', 'set_hits_data',
        'refresh_interface_edit', 'editor_open', 'set_editor_state',
        'annotating_edit_span_category_id', 'set_annotating_edit_span_category_id',
        'annotating_edit_span', 'set_annotating_edit_span', 'set_hit_box_config', 'config',
        'boundary_editing_mode', 'boundary_editing_edit', 'original_boundary',
        'set_boundary_editing_mode', 'set_boundary_editing_edit', 'set_original_boundary',
        'remove_selected'
    ],
    data() {
        let edit_state = this.initalize_edit_state();
        let new_edit_state = this.initalize_edit_state();

        return {
            force_update: false,
            selected_category: null, // To track the selected radio button for reactive updates
            edit_state: edit_state, // For the "Edit Existing" panel
            new_edit_state: new_edit_state, // For the integrated "Add New" panel
            empty_edit_state: this.initalize_edit_state()
        }
    },
    watch: {
        config() {
            this.edit_state = this.initalize_edit_state();
            this.new_edit_state = this.initalize_edit_state();
            this.empty_edit_state = this.initalize_edit_state();
            this.fix_edit_box_formatting();
        },
        editor_open() {
            this.fix_edit_box_formatting();
        }
    },
    methods: {
        isChecklistCategory(category) {
            // Check if a category is one of the checklist item categories
            const checklistCategories = [
                'filing_date', 'parties', 'class_action', 'type_of_counsel',
                'cause_of_action', 'statutory_basis', 'remedy_sought', 'judge_name',
                'consolidated_cases', 'related_cases', 'important_filings', 'court_rulings',
                'reported_opinions', 'trials', 'appeals', 'decree_terms', 'decree_dates',
                'decree_duration', 'settlement_terms', 'settlement_date', 'settlement_duration',
                'court_enforced', 'settlement_disputes', 'monitor_name', 'monitor_reports',
                'factual_basis', 'not_covered', 'checklist_extraction'
            ];
            
            return checklistCategories.includes(category);
        },
        getCategoryLabel(category) {
            // Map category names to display labels
            const categoryLabels = {
                'filing_date': 'Filing Date',
                'parties': 'Who are the Parties',
                'class_action': 'Class Action or Individual Plaintiffs',
                'type_of_counsel': 'Type of Counsel',
                'cause_of_action': 'Cause of Action',
                'statutory_basis': 'Statutory or Constitutional Basis for the Case',
                'remedy_sought': 'Remedy Sought',
                'judge_name': 'First and Last Name of Judge',
                'consolidated_cases': 'Consolidated Cases Noted',
                'related_cases': 'Related Cases Listed by Their Case Code Number',
                'important_filings': 'Note Important Filings',
                'court_rulings': 'Court Rulings',
                'reported_opinions': 'All Reported Opinions Cited with Shortened Bluebook Citation',
                'trials': 'Trials',
                'appeals': 'Appeals',
                'decree_terms': 'Significant Terms of Decrees',
                'decree_dates': 'Dates of All Decrees',
                'decree_duration': 'How Long Decrees will Last',
                'settlement_terms': 'Significant Terms of Settlement',
                'settlement_date': 'Date of Settlement',
                'settlement_duration': 'How Long Settlement will Last',
                'court_enforced': 'Whether the Settlement is Court-enforced or Not',
                'settlement_disputes': 'Disputes Over Settlement Enforcement',
                'monitor_name': 'Name of the Monitor',
                'monitor_reports': 'Monitor Reports',
                'factual_basis': 'Factual Basis of Case',
                'not_covered': 'Not Covered'
            };
            
            return categoryLabels[category] || category;
        },
        fix_edit_box_formatting() {
            // Fix edit box formatting
            let editBoxes = $(".edit-box label");
            let heightDiff = 0;
            let maxHeight = 0;
            for (let i = 0; i < editBoxes.length; i++) {
                const height = editBoxes[i].offsetHeight;
                if (height > maxHeight) {
                    maxHeight = height;
                    heightDiff += 1;
                }
            }
            if (heightDiff > 0) {
                $(".edit-box label").css('justify-content', 'flex-start');
                $(".edit-box label").css('height', maxHeight-24 + "px");
            }
        },
        parse_options(edit_config) {
            if (typeof edit_config !== "object") { return null }
            let edit_options = {}
            for (const option_idx in edit_config) {
                edit_options['val'] = null
                edit_options[edit_config[option_idx].name] = this.parse_options(edit_config[option_idx].options)
            } 
            return edit_options
        },
        initalize_edit_state() {
            let edit_state = {}
            for (const edit of this.config.edits) {
                edit_state[edit.name] = this.parse_options(edit.annotation)
            }
            return edit_state
        },
        set_edit_state(edit_state) {
            this.edit_state = edit_state;
            this.force_update = !this.force_update;
        },
        set_new_edit_state(new_state) {
            this.new_edit_state = new_state;
            this.force_update = !this.force_update; // Ensures child components re-render if needed
        },
        force_update_f() {
            this.force_update = !this.force_update;
        },
        getCurrentExtractedValue(itemName, questionName) {
            // First check if there's a form response
            if (this.edit_state[itemName] && this.edit_state[itemName][questionName] && 
                (this.edit_state[itemName][questionName].response || this.edit_state[itemName][questionName].prefilled_response)) {
                return this.edit_state[itemName][questionName].response || this.edit_state[itemName][questionName].prefilled_response;
            }
            
            // Then check the annotation data from the current annotation being edited
            if (this.annotating_edit_span_category_id) {
                const annotatingId = parseInt(this.annotating_edit_span_category_id.split("-")[1]);
                const category = this.annotating_edit_span_category_id.split("-")[0];
                const currentHit = this.hits_data[this.current_hit - 1];
                
                if (currentHit && currentHit.edits) {
                    const edit = currentHit.edits.find(e => e.category === category && e.id === annotatingId);
                    if (edit && edit.annotation && edit.annotation[questionName]) {
                        return edit.annotation[questionName];
                    }
                }
            }
            
            return 'No value extracted yet';
        },
        cancel_click() {
            $(".icon-default").removeClass("open");
            
            // Reset colors for all edit categories that might have been highlighted
            if (this.selected_category) {
                // Remove highlight colors from document spans
                const category = this.selected_category;
                $(`.${category}`).removeClass(`white bg-${category} bg-${category}-light`);
                $(`.${category}_below`).removeClass(`white bg-${category} bg-${category}-light`);
                
                // Re-add the appropriate text color based on annotation status
                this.hits_data[this.current_hit - 1].edits.forEach(edit => {
                    if (edit.category === category) {
                        const id = `${category}-${edit.id}`;
                        const hasAnnotation = edit.annotation && edit.annotation != null;
                        const textColorClass = hasAnnotation ? `txt-${category}` : `txt-${category}-light`;
                        $(`.${category}_below[data-id='${id}']`).addClass(textColorClass);
                    }
                });
            }
            
            this.set_annotating_edit_span_category_id(null);
            this.set_annotating_edit_span(null, 'source');
            this.set_annotating_edit_span(null, 'target');
            this.set_annotating_edit_span(null, 'composite');
            this.refresh_edit();
        },
        save_click() {
            let new_hits_data = _.cloneDeep(this.hits_data);

            $(".icon-default").removeClass("open");
            this.set_editor_state(!this.editor_open);
            
            // let selected_category = $("input[name=edit_cotegory]:checked").val(); // Old way
            let selected_category = this.selected_category; // New reactive way
            const edits_data = new_hits_data[this.current_hit - 1].edits;

            let max_key = 0;
            for (const edit of edits_data) {
                if (edit['category'] == selected_category && parseInt(edit['id']) > max_key) {
                    max_key = parseInt(edit['id']);
                }
            }

            const config_category = this.config.edits.find((edit) => edit.name === selected_category);

            // Get the annotation data from the new integrated form state
            const new_annotation_data = _.cloneDeep(this.new_edit_state[selected_category]);

            let new_span = {
                'category': selected_category,
                'id': max_key + 1,
                // Add the cleaned annotation data. If no questions, it will be null.
                'annotation': this.removeNullElements(new_annotation_data)
            };

            if (config_category.type == undefined || config_category.type == 'single_span' || config_category.type == 'multi_span') {
                if (config_category['enable_input']) {
                    new_span['input_idx'] = (config_category['type'] !== 'multi_span') ? [this.selected_state.source_idx] : this.selected_state.source_idx;
                }
                if (config_category['enable_output']) {
                    new_span['output_idx'] = (config_category['type'] !== 'multi_span') ? [this.selected_state.target_idx] : this.selected_state.target_idx;
                }
            }

            if (config_category['type'] == 'composite') {
                let constituent_edits = [];
                for (let edit of this.selected_edits) {
                    let composite_span = { id: edit.id, category: edit.category };
                    if (edit.input_idx) { composite_span['input_idx'] = edit.input_idx; }
                    if (edit.output_idx) { composite_span['output_idx'] = edit.output_idx; }
                    constituent_edits.push(composite_span);
                }
                new_span['constituent_edits'] = constituent_edits;

                for (let old_edit of constituent_edits) {
                    new_hits_data[this.current_hit - 1].edits = new_hits_data[this.current_hit - 1].edits.filter(
                        o => o.category !== old_edit.category || o.id !== old_edit.id
                    );
                }
            }

            new_hits_data[this.current_hit - 1].edits.push(new_span);
            
            this.set_hits_data(new_hits_data);
            
            this.set_annotating_edit_span_category_id(null);
            this.set_annotating_edit_span(null, 'source');
            this.set_annotating_edit_span(null, 'target');
            this.set_annotating_edit_span(null, 'composite');
            this.refresh_edit();
        },
        cancel_annotation_click(category, e) {
            const id_str = this.annotating_edit_span_category_id;
            if (id_str === null || id_str === undefined) {
                console.warn('No annotation span ID found, cannot cancel annotation');
                return;
            }
            // Parse the numeric ID from the category-id string format
            const id = parseInt(id_str.split("-")[1]);
            const span_category = id_str.split("-")[0];
            
            $(".icon-default").removeClass("open");
            this.reset_annotation_colors(span_category, id);
            
            // Remove highlight from annotation container
            $(`.edit-container[data-edit-id='${span_category}-${id}']`).css('background-color', '');
            
            this.set_hits_data(_.cloneDeep(this.hits_data));
            this.refresh_edit();
        },
        removeNullElements(obj) {
            if (typeof obj !== 'object' || obj === null) return obj;
            if (Array.isArray(obj)) {
                return obj.map((item) => this.removeNullElements(item)).filter((item) => item !== null);
            }
            const newObj = {};
            let hasNonNullChild = false;
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    // Crucially, ignore the 'val' key if it's null or empty, but keep other properties
                    if (key === 'val' && (obj[key] === null || obj[key] === '')) {
                        continue;
                    }
                    const value = this.removeNullElements(obj[key]);
                    if (value !== null) {
                        newObj[key] = value;
                        hasNonNullChild = true;
                    }
                }
            }
            // If the only thing left was a null 'val', the object might be empty.
            // An object is "empty" if it has no 'val' and all its children are empty.
            if (newObj.val === undefined && Object.keys(newObj).length === 0) return null;

            return hasNonNullChild ? newObj : null;
        },
        save_annotation_click(category, e) {
            let edit_id_str = this.annotating_edit_span_category_id;
            if (edit_id_str === null || edit_id_str === undefined) {
                console.error('No annotating edit span category ID found');
                return;
            }
            // Parse the numeric ID from the category-id string format
            const edit_id = parseInt(edit_id_str.split("-")[1]);
            const span_category = edit_id_str.split("-")[0];
            
            let new_hits_data = _.cloneDeep(this.hits_data);
            let new_annotation = _.cloneDeep(this.edit_state[category]);
            let annotating_span = new_hits_data[this.current_hit - 1]['edits'].find(entry => entry['category'] === span_category && entry['id'] === edit_id);
            
            if (!annotating_span) {
                console.error(`Could not find span with category=${span_category} and id=${edit_id}`);
                return;
            }
            
            annotating_span.annotation = this.removeNullElements(new_annotation);
            this.reset_annotation_colors(span_category, edit_id);
            
            // Remove highlight from annotation container
            $(`.edit-container[data-edit-id='${span_category}-${edit_id}']`).css('background-color', '');
            
            this.set_hits_data(new_hits_data);
            this.refresh_edit();
        },
        cancel_boundary_edit() {
            // Clear visual indicators
            const { category, type } = this.boundary_editing_edit;
            const sentence_element = type === 'source' ? '#source-sentence' : '#target-sentence';
            $(sentence_element).removeClass(`boundary-editing-${category} boundary-editing-active`);
            $(sentence_element).removeAttr('data-boundary-editing');
            
            // Remove boundary editing highlights
            $(`.boundary-editing-highlight`).removeClass('boundary-editing-highlight');
            
            // Clear green boundary selection highlighting
            $('#target-sentence, #source-sentence').find('.boundary-selected-span').contents().unwrap();
            
            // Clear selection state (both single and multi)
            this.set_span_text('', type === 'source' ? 'source' : 'target');
            this.set_span_indices([], type === 'source' ? 'source' : 'target');
            
            // Reset hit box config to default
            this.set_hit_box_config({
                enable_select_source_sentence: false,
                enable_select_target_sentence: false,
                enable_multi_select_source_sentence: false,
                enable_multi_select_target_sentence: false,
            });
            
            // Reset boundary editing state via parent
            this.set_boundary_editing_mode(false);
            this.set_boundary_editing_edit(null);
            this.set_original_boundary(null);
            
            this.refresh_interface_edit();
        },

        save_boundary_edit() {
            if (!this.boundary_editing_mode || !this.boundary_editing_edit) return;
            
            const { category, id, type, multi } = this.boundary_editing_edit;
            
            // Get the new boundary from selected state
            const new_boundary = type === 'source' 
                ? this.selected_state.source_idx 
                : this.selected_state.target_idx;
                
                
            if (!new_boundary || (Array.isArray(new_boundary) && new_boundary.length === 0)) {
                alert('Please select a new boundary before saving.');
                return;
            }

            // Update the edit with new boundary
            let new_hits_data = _.cloneDeep(this.hits_data);
            const edit_to_update = new_hits_data[this.current_hit - 1].edits.find(
                edit => edit.category === category && edit.id === id
            );
            
            if (edit_to_update) {
                const boundary_key = type === 'source' ? 'input_idx' : 'output_idx';
                
                if (multi) {
                    // For multi-boundary editing, new_boundary should already be an array of [start, end] pairs
                    // from the multi-selection UI
                    edit_to_update[boundary_key] = new_boundary;
                } else {
                    // For single boundary editing, new_boundary is a single [start, end] pair
                    // Need to wrap it in an array since output_idx/input_idx expect array of spans
                    edit_to_update[boundary_key] = [new_boundary];
                }
                
                this.set_hits_data(new_hits_data);
            }
            
            this.cancel_boundary_edit(); // Cleanup
        },
        remove_selected_boundary(category, start, end) {
            // Custom remove function for boundary editing - called from editor HTML
            
            // Determine which type we're working with
            const type = this.boundary_editing_edit?.type || 'target';
            const current_indices = type === 'source' 
                ? this.selected_state.source_idx || []
                : this.selected_state.target_idx || [];
            
            // Remove the span from the indices array
            const new_indices = current_indices.filter(span => !(span[0] === start && span[1] === end));
            
            
            // Update the state
            this.set_span_indices(new_indices, type);
            
            // Update the selection bubbles HTML
            const txt = type === 'source' 
                ? this.hits_data[this.current_hit - 1].source
                : this.hits_data[this.current_hit - 1].target;
            
            let new_span_text = "";
            for (let i = 0; i < new_indices.length; i++) {
                let [span_start, span_end] = new_indices[i];
                new_span_text += `<span class="selected-span-text" style="background-color: rgb(144, 238, 144); padding: 4px; border-radius: 3px;">\xa0
                    <span onclick="removeBoundarySpan('${category}',${span_start},${span_end})" class="hover-white black br-pill mr1 pointer">✘</span>
                        ${txt.substring(span_start, span_end)}\xa0</span>&nbsp&nbsp`;
            }
            this.set_span_text(new_span_text, type);
            
            // Update green highlighting in the document (call the target sentence method)
            // We need to trigger an update to the green highlighting
            this.$nextTick(() => {
                // Trigger highlighting update by simulating a small change
                if (document.getElementById('target-sentence')) {
                    this.updateBoundaryHighlightingFromEditor(category, new_indices);
                }
            });
        },
        updateBoundaryHighlightingFromEditor(category, selected_indices) {
            // Apply green highlighting while preserving original evidence spans
            // Clear existing green boundary highlighting only
            $('#target-sentence').find('.boundary-selected-span').contents().unwrap();
            
            if (selected_indices.length === 0) return;
            
            // Wait for DOM to be ready, then apply green highlighting
            this.$nextTick(() => {
                let targetElement = document.getElementById('target-sentence');
                if (!targetElement) return;
                
                // Sort indices by start position to avoid overlap issues
                const sorted_indices = [...selected_indices].sort((a, b) => a[0] - b[0]);
                
                // Apply green highlighting using the same method as TargetSent
                this.applyGreenHighlightingFromEditor(targetElement, sorted_indices);
            });
        },
        applyGreenHighlightingFromEditor(targetElement, sorted_indices) {
            // Apply highlighting from end to beginning to maintain text indices
            for (let i = sorted_indices.length - 1; i >= 0; i--) {
                const [start, end] = sorted_indices[i];
                this.wrapTextRangeFromEditor(targetElement, start, end);
            }
        },
        wrapTextRangeFromEditor(container, start, end) {
            // Walk through text nodes and wrap the specified range with green highlighting
            let textOffset = 0;
            let startNode = null, endNode = null;
            let startOffset = 0, endOffset = 0;
            
            // Create a TreeWalker to iterate through text nodes
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentNode;
            while (currentNode = walker.nextNode()) {
                const nodeLength = currentNode.textContent.length;
                const nodeStart = textOffset;
                const nodeEnd = textOffset + nodeLength;
                
                // Find start position
                if (!startNode && start >= nodeStart && start < nodeEnd) {
                    startNode = currentNode;
                    startOffset = start - nodeStart;
                }
                
                // Find end position
                if (!endNode && end > nodeStart && end <= nodeEnd) {
                    endNode = currentNode;
                    endOffset = end - nodeStart;
                }
                
                textOffset += nodeLength;
                
                // If we found both positions, break
                if (startNode && endNode) break;
            }
            
            if (!startNode || !endNode) return;
            
            try {
                // Create a Range and wrap it with green highlighting
                const range = document.createRange();
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                
                // Create wrapper element
                const wrapper = document.createElement('span');
                wrapper.className = 'boundary-selected-span';
                wrapper.style.backgroundColor = '#90EE90';
                wrapper.style.padding = '2px';
                wrapper.style.borderRadius = '3px';
                
                // Wrap the range content
                try {
                    range.surroundContents(wrapper);
                } catch (e) {
                    // If range spans multiple elements, extract and wrap
                    const contents = range.extractContents();
                    wrapper.appendChild(contents);
                    range.insertNode(wrapper);
                }
            } catch (e) {
                console.warn('Could not apply green highlighting from editor:', e);
            }
        },
        reset_annotation_colors(category, id) {
            let annotating_span = this.hits_data[this.current_hit - 1]['edits'].find(function(entry) {
                return entry['category'] === category && entry['id'] === id;
            });
            if (!annotating_span) {
                console.warn(`Span not found for color reset: category=${category}, id=${id}`);
                return;
            }
            let color_class, border_class;
            if (!annotating_span.annotation || annotating_span.annotation == null) {
                color_class = `txt-${category}-light`; border_class = `border-${category}-light`;
            } else {
                color_class = `txt-${category}`; border_class = `border-${category}`;
            }
            let spans = $(`.${category}[data-id=${category}-${id}]`);
            let below_spans= $(`.${category}_below[data-id=${category}-${id}]`);
            below_spans.addClass(color_class);
            spans.removeClass(`white bg-${category} bg-${category}-light`).addClass(border_class);
            below_spans.removeClass(`white bg-${category} bg-${category}-light`);
        },
        getEditConfig(category) {
            // ... (no changes in this method)
            return this.config['edits'].find(entry => entry['name'] === category);
        },
        getAnnotatingEditLabel() {
            // Get the label for the edit currently being annotated
            if (this.annotating_edit_span_category_id) {
                const annotatingId = parseInt(this.annotating_edit_span_category_id.split("-")[1]);
                const category = this.annotating_edit_span_category_id.split("-")[0];
                const currentHit = this.hits_data[this.current_hit - 1];
                
                // For paragraph-level data, use the category to get the proper label
                if (this.config.data_format === 'paragraph') {
                    return this.getCategoryLabel(category);
                }
                
                // For item-level data, use metadata
                if (this.config.data_format === 'item' && currentHit && currentHit.metadata && currentHit.metadata.checklist_item) {
                    return currentHit.metadata.checklist_item;
                }
            }
            
            return "Checklist Item Extraction";
        },
        getDisplayLabel(item, isAnnotating = false) {
            // For paragraph-level data, use the category to get the proper label
            if (this.config.data_format === 'paragraph' && item && item.name) {
                return this.getCategoryLabel(item.name);
            }
            
            // For item-level data with checklist_extraction
            if (item && item.name === 'checklist_extraction' && this.config.data_format === 'item') {
                const currentHit = this.hits_data[this.current_hit - 1];
                if (currentHit && currentHit.metadata && currentHit.metadata.checklist_item) {
                    return currentHit.metadata.checklist_item;
                }
            }
            
            // Default: use the original label if item exists
            return item ? item.label : "Checklist Item Extraction";
        },
        getBoundaryEditTitle() {
            // For paragraph-level data, use the category to get the proper label
            if (this.config.data_format === 'paragraph' && this.boundary_editing_edit) {
                const categoryLabel = this.getCategoryLabel(this.boundary_editing_edit.category);
                return `Edit Supporting Text of ${categoryLabel}`;
            }
            
            // For item-level data with checklist_extraction
            if (this.config.data_format === 'item') {
                const currentHit = this.hits_data[this.current_hit - 1];
                if (currentHit && currentHit.metadata && currentHit.metadata.checklist_item) {
                    return `Edit Supporting Text of ${currentHit.metadata.checklist_item}`;
                }
            }
            
            // Default fallback
            return 'Edit Supporting Text of the extracted checklist item';
        },
        // MODIFIED: This method now resets the new state properties as well.
        refresh_edit() {
            this.set_editor_state(false);

            let classList = this.config.edits.map(edit => `txt-${edit.name}`).join(' ');
            $(".annotation-icon").removeClass(classList);

            // Fix: iterate over the actual class names, not characters
            for (let edit of this.config.edits) {
                $('#source-sentence').removeClass(`select-color-${edit.name}`);
                $('#target-sentence').removeClass(`select-color-${edit.name}`);
            }

            // Preserve boundary editing state - don't clear boundary editing classes
            // The boundary editing classes should only be cleared by cancel_boundary_edit()

            $("input[type=radio]").prop("checked", false);           // Clear all radio buttons
            $("input[type=checkbox]").prop("checked", false);        // Clear checkboxes if any
            $('.question-textbox, .question-textarea').val('');      // Clear text inputs
            
            // Force remove any visual selection states
            $("label").removeClass("selected active checked");       // Remove common selection classes
            $(".checkbox-tools").removeClass("selected");
            $('.quality-selection, .span-selection-div, .child-question').slideUp(300);

            // Reset all state objects for a clean slate
            this.edit_state = this.initalize_edit_state();
            this.new_edit_state = this.initalize_edit_state(); // Reset the new form
            this.selected_category = null; // Deselect the category
            
            this.set_annotating_edit_span_category_id(null);
            this.set_annotating_edit_span(null, 'source');
            this.set_annotating_edit_span(null, 'target');
            this.set_annotating_edit_span(null, 'composite');
            
            this.refresh_interface_edit();
        },
        // MODIFIED: Added logic to set the reactive selected_category property
        show_span_selection(e) {
            this.selected_category = e.target.value; // Set reactive property

            $(`.span-selection-div`).hide();
            $(`.span-selection-div[data-category=${e.target.value}]`).show();
            const edit_config = this.getEditConfig(e.target.value);

            this.refresh_interface_edit();

            let new_hit_box_config = {
                enable_select_source_sentence: false, enable_select_target_sentence: false,
                enable_multi_select_source_sentence: false, enable_multi_select_target_sentence: false,
            };
                        
            if (edit_config['enable_input']) {
                new_hit_box_config.enable_select_source_sentence = true;
                if (edit_config['type'] == 'multi_span') new_hit_box_config.enable_multi_select_source_sentence = true;
            } 
            if (edit_config['enable_output']) {
                new_hit_box_config.enable_select_target_sentence = true;
                if (edit_config['type'] == 'multi_span') new_hit_box_config.enable_multi_select_target_sentence = true;
            }

            this.set_hit_box_config(new_hit_box_config);

            this.set_span_text("", "source");
            this.set_span_text("", "target");
            this.set_span_indices("", "source");
            this.set_span_indices("", "target");
        },
        annotate_edit_disabled(item) {
            const force_update = this.force_update;
            const category = item.name;
            const edit_config = this.getEditConfig(category);
            if (!this.editor_open) return true;
            if (!$(`.quality-selection[data-category=${category}]`).is(':visible')) return true;
            if (!edit_config || !edit_config.annotation) return false;
            let filled_out = true;
            for (let question of edit_config.annotation) {
                const q_object = $(`#question_${category}_${question.name}`);
                if (q_object == undefined || q_object.length == 0) continue;
                const annotation = this.edit_state[category][question.name];
                if (annotation != null && ((annotation.val != null && annotation.val != '') || (annotation.val == null && annotation != '' ))) continue;
                if ($(q_object[0]).attr('annotated') != 'true' && (!question.hasOwnProperty('required') || question.required)) {
                    filled_out = false;
                }
            }
            return !filled_out;
        },
        // MODIFIED: A helper function to check if the new annotation form is valid.
        // In your main component's methods: { ... }

        isNewAnnotationFormValid(category, questions) {
            // If there are no questions for this category, the form is valid by default.
            if (!questions || questions.length === 0) {
                return true;
            }

            /**
             * Recursively checks if all required and visible questions are answered.
             * @param {Array} q_config - The configuration array for the current level of questions.
             * @param {Object} q_state - The state object containing answers for the current level.
             */
            const check_questions_recursively = (q_config, q_state) => {
                // Iterate over each question configuration at the current level.
                for (const question of q_config) {
                    // A question is required by default unless 'required: false' is specified.
                    const is_required = !question.hasOwnProperty('required') || question.required;

                    // Find the question's element in the DOM to check its visibility.
                    const q_element = $(`#add_an_edit #question-${category}-${question.name}`);

                    // We only validate questions that are both required AND currently visible to the user.
                    if (is_required && q_element.length > 0 && q_element.is(":visible")) {
                        // Safely get the state for this specific question.
                        const question_state = (q_state && q_state.hasOwnProperty(question.name)) ? q_state[question.name] : undefined;

                        // FIXED: Determine if this question has sub-questions
                        // A question has sub-questions if its 'options' property is an array of objects with 'name' properties
                        const has_sub_questions = Array.isArray(question.options) && 
                            question.options.length > 0 && 
                            typeof question.options[0] === 'object' && 
                            question.options[0].hasOwnProperty('name');

                        let isAnswered = false;
                        
                        if (has_sub_questions) {
                            // For a question with sub-questions, its state is an object.
                            // The primary answer that reveals the sub-questions is in the 'val' property.
                            isAnswered = question_state && 
                                question_state.val !== null && 
                                question_state.val !== undefined && 
                                question_state.val !== '';
                        } else {
                            // Special handling for textarea questions - ensure actual content exists
                            if (question.options === 'textarea') {
                                // For textarea, check the direct value or val property
                                if (question_state && typeof question_state === 'object' && question_state.hasOwnProperty('val')) {
                                    isAnswered = question_state.val !== null && 
                                        question_state.val !== undefined && 
                                        question_state.val !== '' &&
                                        question_state.val.toString().trim() !== '';  // Must have non-whitespace content
                                } else if (typeof question_state === 'string') {
                                    isAnswered = question_state.trim() !== '';  // Must have non-whitespace content
                                } else {
                                    isAnswered = false;
                                }
                            } else {
                                // For other simple questions (including those with string options like 'likert-3'),
                                // the answer is stored directly in the state object's 'val' property
                                if (question_state && typeof question_state === 'object' && question_state.hasOwnProperty('val')) {
                                    isAnswered = question_state.val !== null && 
                                        question_state.val !== undefined && 
                                        question_state.val !== '';
                                } else {
                                    // Fallback: check if the state itself is the answer (for simple text inputs)
                                    isAnswered = question_state !== null && 
                                        question_state !== undefined && 
                                        question_state !== '';
                                }
                            }
                        }

                        // If a required, visible question is not answered, the form is invalid.
                        if (!isAnswered) {
                            return false;
                        }

                        // FIXED: If the question is answered AND it has sub-questions, validate them recursively
                        if (has_sub_questions && isAnswered) {
                            // Find the selected option configuration
                            const selected_option = question.options.find(opt => opt.name === question_state.val);
                            
                            if (selected_option) {
                                // Check if the selected option has its own sub-questions
                                if (selected_option.options && Array.isArray(selected_option.options)) {
                                    // The sub-questions are in selected_option.options
                                    if (!check_questions_recursively(selected_option.options, question_state)) {
                                        return false;
                                    }
                                } else if (selected_option.options === 'likert-3' || 
                                        selected_option.options === 'binary' || 
                                        selected_option.options === 'textarea' || 
                                        selected_option.options === 'textbox') {
                                    // This is a simple question type - check if it's answered
                                    const sub_answer = question_state[selected_option.name];
                                    if (sub_answer === null || sub_answer === undefined || sub_answer === '' ||
                                        (typeof sub_answer === 'string' && sub_answer.trim() === '')) {
                                        return false;
                                    }
                                }
                            }
                        }
                    }
                }

                // If we successfully looped through all questions at this level without returning false, this level is valid.
                return true;
            }

            // Start the recursive validation from the top-level questions.
            return check_questions_recursively(questions, this.new_edit_state[category]);
        },
        areSpansSelected(item) {
            if (!item) return false;

            if (item.type === 'composite') {
                return this.selected_edits.length > 0;
            }

            // Handles single_span, multi_span, or undefined types
            const src = this.selected_state.source_span;
            const tg = this.selected_state.target_span;

            if (item.enable_input && item.enable_output) {
                return !!(src && tg); // Returns true if both are non-empty
            } else if (item.enable_input) {
                return !!src; // Returns true if src is non-empty
            } else if (item.enable_output) {
                return !!tg; // Returns true if tg is non-empty
            }

            // If no spans are required at all for this edit type
            return true; 
        },
    },
    mounted() {
        // Set up global functions for remove button functionality in v-html
        window.removeBoundarySpan = (category, start, end) => {
            this.remove_selected_boundary(category, start, end);
        };
        
        // Set up global function for regular multi-span remove buttons
        window.removeSelected = (category, start, end) => {
            // Call the remove_selected method through the prop functions passed to this component
            if (this.remove_selected) {
                this.remove_selected(category, start, end);
            } else {
                console.error('this.remove_selected is not available');
            }
        };
        
        // Add ESC key handler for closing annotation boxes
        this.handleEscKey = (event) => {
            if (event.key === 'Escape' || event.keyCode === 27) {
                // Check which box is currently open and call the appropriate cancel function
                
                // 1. Check if boundary editing box is open
                if (this.boundary_editing_mode) {
                    this.cancel_boundary_edit();
                    event.preventDefault();
                    return;
                }
                
                // 2. Check if "Annotating a value" box is open (edit existing annotation)
                if ($('.quality-selection:visible').length > 0 && this.annotating_edit_span_category_id) {
                    const category = this.annotating_edit_span_category_id.split("-")[0];
                    this.cancel_annotation_click(category, event);
                    event.preventDefault();
                    return;
                }
                
                // 3. Check if "Adding a value" box is open (add new annotation)
                if ($('.span-selection-div:visible').length > 0 && this.editor_open) {
                    this.cancel_click();
                    event.preventDefault();
                    return;
                }
            }
        };
        
        // Add the event listener to document
        document.addEventListener('keydown', this.handleEscKey);
    },
    beforeUnmount() {
        // Clean up global functions
        if (window.removeBoundarySpan) {
            delete window.removeBoundarySpan;
        }
        if (window.removeSelected) {
            delete window.removeSelected;
        }
        
        // Remove ESC key event listener
        if (this.handleEscKey) {
            document.removeEventListener('keydown', this.handleEscKey);
        }
    },
    // MODIFIED: The main save button now also checks if the integrated annotation form is valid.
    computed: {
        add_edit_disabled() {
            const force_update = this.force_update; // To trigger re-evaluation
            if (!this.editor_open) return true;
            
            const selected_category = this.selected_category;
            if (!selected_category) return true;

            const config_category = this.getEditConfig(selected_category);
            if (!config_category) return true;

            let spans_filled_out = false;
            if (config_category.type === 'composite') {
                if (this.selected_edits.length > 0) spans_filled_out = true;
            } else { // single_span, multi_span, or undefined
                const src = this.selected_state.source_span, tg = this.selected_state.target_span;
                if (config_category.enable_input && config_category.enable_output) {
                    if (src && tg) spans_filled_out = true;
                } else if (config_category.enable_input) {
                    if (src) spans_filled_out = true;
                } else if (config_category.enable_output) {
                    if (tg) spans_filled_out = true;
                } else {
                    spans_filled_out = true; // No spans required
                }
            }

            if (!spans_filled_out) return true;

            // For checklist categories, always check if explanation is filled
            if (this.config.data_format === 'paragraph' && this.isChecklistCategory && this.isChecklistCategory(selected_category)) {
                const categoryState = this.new_edit_state[selected_category];
                if (!categoryState || !categoryState.explanation) {
                    return true; // Disabled - no explanation yet
                }
                
                const explanationValue = typeof categoryState.explanation === 'string' 
                    ? categoryState.explanation 
                    : (categoryState.explanation?.val || '');
                    
                if (!explanationValue || explanationValue.trim() === '') {
                    return true; // Disabled - explanation is empty
                }
            }

            // Now, also check if the annotation questions are valid
            const questions_valid = this.isNewAnnotationFormValid(selected_category, config_category.annotation);
            if (!questions_valid) return true;

            return false; // If we get here, everything is valid.
        }
    }
}
</script>

<template>
    <div class="quality-selection-divs">
        <div class="quality-selection w-100" id="add_an_edit">
            <div id="dropdown-button-container">
                <div class="over-hide z-bigger mt2 editor-container">
                    <p class="f3 annotation-label ttu mv1">{{ config.interface_text.annotation_editor.add_edit_header }} <i class="fa-solid fa-plus"></i></p>
                    <div class="row">
                        <p class="mb2 b tracked-light"><i>{{ config.interface_text.annotation_editor.select_edit_header }}</i></p>
                        <div class="tc mb3">
                            <div v-for="item in config.edits" :key="item.id" class="edit-box mr2 dib">
                                <input @click="show_span_selection" class="checkbox-tools-edit-category checkbox-tools" type="radio" name="edit_cotegory"
                                    :id="`edit_cotegory-${item.name}`" :value="item.name">
                                <label :class="`txt-${item.name}`" :for="`edit_cotegory-${item.name}`">
                                    <i :class="`fa-solid ${item.icon} fa-1-5x mb1`"></i>
                                    {{ getDisplayLabel(item) }}
                                </label>
                            </div>
                        </div>

                        <div v-for="item in config.edits" :key="item.id" class="span-selection-div" :data-category="item.name">
                            <div v-if="selected_category === item.name">
                                <!-- Span Selection Instructions (as before) -->
                                <div v-if="item.enable_input">
                                    <p class="mt0 mb2 b tracked-light">{{ config.interface_text.annotation_editor.select_instructions }} <i>{{ config.interface_text.typology.source_label }}</i>.</p>
                                    <p class="tracked-light lh-paras-2">{{ config.interface_text.annotation_editor.selected_label }} {{ config.interface_text.typology.span_unit_name }}: <span v-html="selected_state.source_span"></span></p>
                                </div>
                                <div v-if="item.enable_output">
                                        <p class="mt0 mb2 b tracked-light">{{ config.interface_text.annotation_editor.select_instructions }} <i>{{ config.interface_text.typology.target_label }}</i>.</p>
                                        <p class="tracked-light lh-paras-2">{{ config.interface_text.annotation_editor.selected_label }} {{ config.interface_text.typology.span_unit_name }}: <span v-html="selected_state.target_span"></span></p>
                                </div>
                                <div v-if="item.type == 'composite'">
                                    <div class="span-selection-div" :data-category="item.name">
                                        <p class="mt0 mb2 b tracked-light">{{ config.interface_text.annotation_editor.composite_seletion_instructions }} {{ item.name }}.</p>
                                        <p class="tracked-light lh-paras-2">{{ config.interface_text.annotation_editor.selected_label }} {{ config.interface_text.typology.edits_unit_name }}: <span v-html="selected_edits_html"></span></p>
                                    </div>
                                </div>
                                <div v-if="item.annotation && item.annotation.length > 0 && areSpansSelected(item)">
                                    <hr class="mv3">
                                    <div>
                                        <p class="mb2 b tracked-light"><i>Please write down the value for this item.</i></p>
                                        <div v-for="question in item.annotation" :key="question.id">
                                            <Question 
                                                :edit_state="new_edit_state"
                                                :question_state="new_edit_state[item.name][question.name]" 
                                                :empty_question_state="empty_edit_state[item.name][question.name]"
                                                :set_edit_state="set_new_edit_state"
                                                :question="question" 
                                                :edit_type="item"
                                                :config="config" 
                                                :parent_show_next_question="null" 
                                                isRoot=true 
                                                :ref="`new_${item.name}_${question.name}`" 
                                                :force_update="force_update_f" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="buttons tc mt2">
                    <button @click="cancel_click" class="cancel-button b quality_button bw0 ba mr2 br-pill-ns grow" type="button">{{ config.interface_text.buttons.cancel_label }} <i class="fa-solid fa-close"></i></button>
                    <button @click="save_click" :class="{'o-40': add_edit_disabled, 'grow': !add_edit_disabled}" :disabled="add_edit_disabled" 
                        class="confirm-button b quality_button bw0 ba ml2 br-pill-ns" type="button">{{ config.interface_text.buttons.save_label }} <i class="fa-solid fa-check"></i></button>
                </div>
            </div>
        </div>

        <div v-if="boundary_editing_mode && config.enable && (Object.values(config.enable).includes('edit_boundary') || Object.values(config.enable).includes('edit_boundary_multi'))" id="boundary_edit_panel" style="display: none;">
            <div class="over-hide z-bigger mt3 editor-container">
                <p class="f3 annotation-label ttu mv1">
                    {{ boundary_editing_edit?.multi ? getBoundaryEditTitle() : 'Edit Boundary' }} 
                    <i class="fa-solid fa-expand-arrows-alt"></i>
                </p>
                <div class="tc mb3">
                <p class="mb2 b tracked-light">
                    <i>{{ boundary_editing_edit?.multi ? 'Select the supporting text for this extracted value' : 'Select new boundary for ' + boundary_editing_edit?.category + ' annotation' }}.</i>
                </p>
                <div v-if="boundary_editing_edit?.multi">
                    <p class="tracked-light lh-paras-2 mb2">
                        <strong>Selected supporting text:</strong>
                    </p>
                    <div class="tracked-light lh-paras-2" v-html="selected_state.target_span || selected_state.source_span"></div>
                    <p class="f6 gray mt2" v-if="!(selected_state.target_span || selected_state.source_span)">
                        <i>Click on text to add spans. Each span will appear with an ✘ to remove it.</i>
                    </p>
                </div>
                <p v-else class="tracked-light lh-paras-2">
                    New selection: <span v-html="selected_state.target_span || selected_state.source_span"></span>
                </p>
            </div>
            </div>
            <div class="buttons tc mt2">
                <button @click="cancel_boundary_edit" class="cancel-button b quality_button bw0 ba mr2 br-pill-ns grow">
                Cancel <i class="fa-solid fa-close"></i>
                </button>
                <button @click="save_boundary_edit" class="confirm-button b quality_button bw0 ba ml2 br-pill-ns grow">
                Save <i class="fa-solid fa-check"></i>
                </button>
            </div>
        </div>
        <div v-for="item in config.edits" :key="item.id">
            <div class="quality-selection w-100" :id="`${item.name}_edit_annotation`" :data-category="item.name">
                <div id="dropdown-button-container">
                    <div class="over-hide z-bigger mt3 editor-container">
                        <p class="f3 annotation-label ttu mv1">{{ config.interface_text.annotation_editor.annotating_edit_header }} <i class="fa-solid fa-pencil"></i></p>
                        <div class='single_part' />
                        <div class="f4 mt0 mb2 tl">
                            <span :class="`edit-type txt-${item ? item.name : 'checklist_extraction'} f4`">{{ getAnnotatingEditLabel() }} </span>

                            <span v-if="item.enable_input" v-html="annotating_edit_span.source"></span>
                            <span v-if="item.enable_input && item.enable_output" :class="`edit-type txt-${item.name} f3`">&nbsp;{{ config.interface_text.annotation_editor.composite_span_unification }}&nbsp;</span>
                            <span v-if="item.enable_output" v-html="annotating_edit_span.target"></span>
                            
                            <span v-if="item.type == 'composite'" v-html="annotating_edit_span.composite"></span>
                        </div>

                        <div class="row">
                            <div v-for="question in item.annotation" :key="question.id">
                                <Question :edit_state="edit_state" :empty_question_state="empty_edit_state[item.name][question.name]" :question_state="edit_state[item.name][question.name]" :question="question" :edit_type="item" :set_edit_state="set_edit_state"
                                    :config="config" :parent_show_next_question="null" isRoot=true :ref="`${item.name}_${question.name}`" :force_update="force_update_f" />
                            </div>
                        </div>
                    </div>
                    <div class="buttons tc">
                        <button @click="cancel_annotation_click(item.name, $event)" class="cancel-button b quality_button bw0 ba mr2 br-pill-ns grow" type="button">{{ config.interface_text.buttons.cancel_label }} <i class="fa-solid fa-close"></i></button>
                        <button @click="save_annotation_click(item.name, $event)" class="confirm-button b quality_button bw0 ba ml2 br-pill-ns"
                            :class="{'o-40': annotate_edit_disabled(item), 'grow': !annotate_edit_disabled(item)}" :disabled="annotate_edit_disabled(item)">{{ config.interface_text.buttons.save_label }} <i class="fa-solid fa-check"></i></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>