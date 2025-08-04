<script setup>
import _ from 'lodash';
</script>

<script>
export default {
    data() {
        return {
            target_html: ""
        }
    },
    props: [
        'hits_data',
        'current_hit',
        'edits_dict',
        'selected_edits_html',
        'selected_edits',
        'set_selected_edits',
        'selected_state',
        'set_span_text',
        'set_span_indices',
        'set_span_category',
        'remove_selected',
        'lines',
        'set_lines',
        'handle_tokenization_rendering',

        'process_edit_list',
        'hasAnnotations',
        'is_selected',
        'get_selected_index',
        'multi_select_enabled',
        'render_sentence',
        'click_span',
        'hover_span',
        'un_hover_span',

        'hit_box_config',
        'config',
        'boundary_editing_mode',
        'boundary_editing_edit'
    ],
    watch: {
        current_hit() {
            this.process_target_html();
        },
        hits_data() {
            this.process_target_html();
        },
        set_span_text() {
            this.process_target_html();
        },
        selected_state: {
            handler() {
                this.process_target_html_with_selected_span(this.selected_state.target_category);
            },
            deep: true
        },
        'selected_state.target_idx': {
            handler() {
                this.process_target_html_with_selected_span(this.selected_state.target_category);
            },
            deep: true
        },
        boundary_editing_mode() {
            // Re-render HTML when entering/exiting boundary editing mode
            this.process_target_html();
        },
        boundary_editing_edit: {
            handler() {
                // Re-render HTML when the boundary editing target changes
                this.process_target_html();
            },
            deep: true
        }
    },
    methods: {
        process_target_html() {
            const sent_type = 'output_idx'
            const span_class = 'target_span'
            const sent = this.hits_data[this.current_hit - 1].target

            try {
                this.target_html = this.render_sentence(sent, sent_type, span_class, null);
            } catch (e) {
                this.target_html = ''
                console.warn(e)
            }
        },
        process_target_html_with_selected_span(category) {
            const sent_type = 'output_idx'
            const span_class = 'target_span'
            const sent = this.hits_data[this.current_hit - 1].target

            try {
                this.target_html = this.render_sentence(sent, sent_type, span_class, category);
            } catch (e) {
                this.target_html = ''
                console.warn(e)
            }
        },
        getAbsoluteOffset(parentElement, startNode, startOffset) {
            let absoluteOffset = 0;

            // Use a TreeWalker to efficiently iterate through only the text nodes
            // within the parent element, in the correct document order.
            const treeWalker = document.createTreeWalker(
                parentElement,
                NodeFilter.SHOW_TEXT, // We are only interested in text nodes
                null,
                false
            );

            let currentNode;
            while ((currentNode = treeWalker.nextNode())) {
                // If the current text node is the one where our selection starts...
                if (currentNode === startNode) {
                    // ...the absolute offset is the total length of all preceding
                    // text nodes plus the offset within the current node.
                    absoluteOffset += startOffset;
                    return absoluteOffset;
                } else {
                    // Otherwise, just add the full length of this text node and continue.
                    absoluteOffset += currentNode.textContent.length;
                }
            }

            // Fallback in case the node isn't found (should not happen in normal use)
            return absoluteOffset;
        },
        handle_boundary_selection(e) {
            let selection = window.getSelection();
            let txt = this.hits_data[this.current_hit - 1].target;
            let range = selection.getRangeAt(0);
            const parentElement = e.currentTarget;

            let start = this.getAbsoluteOffset(parentElement, range.startContainer, range.startOffset);
            let end = this.getAbsoluteOffset(parentElement, range.endContainer, range.endOffset);

            if (start == end || !txt.substring(start, end).trim()) {
                return;
            }

            // Process the boundary similar to normal selection but for boundary editing
            const { category, multi } = this.boundary_editing_edit;
            
            // Word boundary adjustment (same logic as existing)
            let split_chars = [' ', '\n'];
            if (this.config.tokenization && this.config.tokenization == 'tokenized') {
                split_chars = ['Ġ', ' ', '\n'];
            }
            
            if (!this.config.tokenization || this.config.tokenization != 'char') {
                end -= 1; 
                while (split_chars.includes(txt.charAt(start))) start += 1; 
                while (start - 1 >= 0 && !split_chars.includes(txt.charAt(start - 1))) start -= 1; 
                while (split_chars.includes(txt.charAt(end))) end -= 1; 
                while (end + 1 <= txt.length - 1 && !split_chars.includes(txt.charAt(end + 1))) end += 1; 
                end += 1;
            }

            if (start >= end) return;

            // Debug boundary selection
            console.log('Boundary selection:', {
                category, multi,
                selected_text: txt.substring(start, end),
                total_selections: (this.selected_state.target_idx || []).length + 1
            });

            // Handle multi-selection for boundary editing
            if (multi && this.hit_box_config.enable_multi_select_target_sentence) {
                // Create a new array to avoid reference issues
                let current_indices = this.selected_state.target_idx || [];
                let new_indices = [...current_indices, [start, end]];
                console.log('Multi-selection update:', {
                    previous_count: current_indices.length,
                    new_count: new_indices.length,
                    added_text: txt.substring(start, end)
                });
                this.set_span_indices(new_indices, 'target');
                
                let new_span_text = "";
                // Create spans with remove buttons for each selection
                for (let i = 0; i < new_indices.length; i++) {
                    let [span_start, span_end] = new_indices[i];
                    new_span_text += `<span class="selected-span-text" style="background-color: rgb(144, 238, 144); padding: 4px; border-radius: 3px;">\xa0
                        <span onclick="removeBoundarySpan('${category}',${span_start},${span_end})" class="hover-white black br-pill mr1 pointer">✘</span>
                            ${txt.substring(span_start, span_end)}\xa0</span>&nbsp&nbsp`;
                }
                // Debug: console.log('Generated boundary HTML:', new_span_text);
                this.set_span_text(new_span_text, 'target');
            } else {
                // Single boundary selection (original behavior)
                this.set_span_indices([[start, end]], 'target');
                let new_span_text = `<span class="selected-span-text boundary-edit-selection" style="background-color: rgb(144, 238, 144); padding: 4px; border-radius: 3px;">\xa0${txt.substring(start, end)}\xa0</span>`;
                this.set_span_text(new_span_text, 'target');
            }
            
            // Set category for boundary editing
            this.set_span_category(category, 'target');
            
            // Apply green highlighting to selected text spans in the document
            this.updateBoundaryHighlighting(category);
            
            // Visual feedback that boundary has been selected
            $('#target-sentence').addClass(`boundary-selected-${category}`);
        },
        updateBoundaryHighlighting(category) {
            // Apply green highlighting to all selected spans while preserving original evidence spans
            let selected_indices = this.selected_state.target_idx || [];
            
            // Defensive check: ensure selected_indices is an array of arrays
            if (selected_indices.length > 0 && typeof selected_indices[0] === 'number') {
                // If it's a single [start, end] pair, wrap it in an array
                selected_indices = [selected_indices];
            }
            
            // Clear existing green boundary highlighting only
            $('#target-sentence').find('.boundary-selected-span').contents().unwrap();
            
            if (selected_indices.length === 0) {
                // If no selections, don't add background colors in boundary editing mode
                if (!this.boundary_editing_mode) {
                    $('#target-sentence').find(`.${category}`).each(function() {
                        if ($(this).hasClass(`border-${category}-light`)) {
                            $(this).addClass(`bg-${category}-light`);
                        } else {
                            $(this).addClass(`bg-${category}`);
                        }
                    });
                }
                return;
            }
            
            // Don't re-render - just apply green highlights while preserving existing DOM
            this.$nextTick(() => {
                let targetElement = document.getElementById('target-sentence');
                if (!targetElement) return;
                
                // In boundary editing mode, don't add background colors to existing spans
                if (!this.boundary_editing_mode) {
                    $('#target-sentence').find(`.${category}`).each(function() {
                        if ($(this).hasClass(`border-${category}-light`)) {
                            $(this).addClass(`bg-${category}-light`);
                        } else {
                            $(this).addClass(`bg-${category}`);
                        }
                    });
                }
                
                // Sort indices by start position to avoid overlap issues
                const sorted_indices = [...selected_indices].sort((a, b) => a[0] - b[0]);
                
                // Apply green highlighting using DOM manipulation to preserve existing spans
                this.applyGreenHighlighting(targetElement, sorted_indices);
            });
        },
        applyGreenHighlighting(targetElement, sorted_indices) {
            // Apply green highlighting by wrapping text nodes, preserving existing HTML structure
            const txt = this.hits_data[this.current_hit - 1].target;
            
            // Apply highlighting from end to beginning to maintain text indices
            for (let i = sorted_indices.length - 1; i >= 0; i--) {
                const [start, end] = sorted_indices[i];
                
                // Find the text content and apply highlighting
                this.wrapTextRange(targetElement, start, end);
            }
        },
        wrapTextRange(container, start, end) {
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
                console.warn('Could not apply green highlighting:', e);
            }
        },
        select_target_html(e) {
            if (this.boundary_editing_mode) {
                return this.handle_boundary_selection(e);
            }
            if (!this.hit_box_config.enable_select_target_sentence) {
                return
            }
            let selected_category = $("input[name=edit_cotegory]:checked").val();
            let selection = window.getSelection();
            let txt = this.hits_data[this.current_hit - 1].target
            let range = selection.getRangeAt(0);
            const parentElement = e.currentTarget;

            let start = this.getAbsoluteOffset(parentElement, range.startContainer, range.startOffset);
            let end = this.getAbsoluteOffset(parentElement, range.endContainer, range.endOffset);

            if (start == end || !txt.substring(start, end).trim()) {
                this.process_target_html(null); // rerender if blocking 
                return;
            }

            $('#target-sentence').addClass(`select-color-${selected_category}`)

            let split_chars = [' ', '\n']
            if (this.config.tokenization && this.config.tokenization == 'tokenized') {
                split_chars = ['Ġ', ' ', '\n']
            }
            
            if (!this.config.tokenization || this.config.tokenization != 'char') {
                end -= 1; 
                while (split_chars.includes(txt.charAt(start))) {
                    start += 1; 
                }
                while (start - 1 >= 0 && !split_chars.includes(txt.charAt(start - 1))) {
                    start -= 1; 
                }
                while (split_chars.includes(txt.charAt(end))) {
                    end -= 1; 
                }
                while (end + 1 <= txt.length - 1 && !split_chars.includes(txt.charAt(end + 1))) {
                    end += 1; 
                }
                end += 1;
            }

            if (start >= end) {
                this.process_target_html_with_selected_span(selected_category)
                return;
            }

            let new_span_text = `<span class="selected-span-text bg-${selected_category}-light">\xa0${txt.substring(start, end)}\xa0</span>`
            this.set_span_text(new_span_text, 'target');

            if (this.hit_box_config.enable_multi_select_target_sentence) {
                let new_indices = this.selected_state.target_idx
                if (new_indices == null || new_indices.length == 0) {
                    new_indices = []
                }
                new_indices.push([start, end]);
                this.set_span_indices(new_indices, 'target');
                let new_span_text = "";
                // iterate through this.selected_span_in_target_indexs
                for (let i = 0; i < new_indices.length; i++) {
                    let [start, end] = new_indices[i];
                    new_span_text += `<span class="selected-span-text bg-${selected_category}-light">\xa0
                        <span onclick="removeSelected('${selected_category}',${start},${end})" class="hover-white black br-pill mr1 pointer">✘</span>
                            ${txt.substring(start, end)}\xa0</span>&nbsp&nbsp`;
                }
                this.set_span_text(new_span_text, 'target');
            } else {
                this.set_span_indices([start, end], 'target');
            }
            this.set_span_category(selected_category, 'target');
            this.process_target_html_with_selected_span(selected_category);
        },
        deselect_target_html(e) {
            if (!this.hit_box_config.enable_select_target_sentence) {
                return
            }
            // $("#target-sentence").html(this.hits_data[this.current_hit - 1].target);
            // this.target_html = this.hits_data[this.current_hit - 1].target
            this.process_target_html();
        }
    },
    computed: {
        get_target_html() {
            // Build dynamic classes for boundary editing
            let classes = 'f4 lh-paras sans-serif selection-area';
            let dataAttrs = '';
            
            if (this.boundary_editing_mode && this.boundary_editing_edit) {
                classes += ` boundary-editing-${this.boundary_editing_edit.category} boundary-editing-active`;
                dataAttrs = ' data-boundary-editing="true"';
            }
            
            return {
                template: `<pre @mousedown='deselect_target_html' @mouseup='select_target_html' id="target-sentence" class="${classes}"${dataAttrs}>${ this.target_html }</pre> `,
                methods: {
                        select_target_html: this.select_target_html,
                        deselect_target_html: this.deselect_target_html,
                        remove_selected: this.remove_selected,
                        hover_span: this.hover_span,
                        un_hover_span: this.un_hover_span,
                        click_span: this.click_span,
                        handle_tokenization_rendering: this.handle_tokenization_rendering
                },
                mounted() {
                    this.handle_tokenization_rendering()
                }
            }
        }
    }
}
</script>

<template>
    <component :is="get_target_html"></component>
</template>