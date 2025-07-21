<script setup>
import _ from 'lodash';
</script>

<script>
export default {
    data() {
        return {
            source_html: "",
        }
    },
    props: [
        'hits_data',
        'current_hit',
        'edits_dict',
        'selected_state',
        'selected_edits_html',
        'selected_edits',
        'set_selected_edits',
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
        'config'
    ],
    mounted() {
        this.process_source_html();
    },
    watch: {
        current_hit() {
            this.process_source_html();
        },
        hits_data() {
            this.process_source_html();
        },
        set_span_text() {
            this.process_source_html();
        },
        selected_state() {
            this.process_source_html_with_selected_span(this.selected_state.source_category);
        }
    },
    methods: {
        process_source_html() {
            try {
                this.process_source_html_with_selected_span(null);
            } catch (e) {
                this.source_html = ''
                console.warn(e)
            }
        },
        process_source_html_with_selected_span(category) {
            const hit = this.hits_data[this.current_hit - 1];
            const sent = hit.source;
            const highlightable_areas = hit.source_highlightable_areas;

            try {
                // If highlightable areas are defined and not empty, use the new renderer.
                if (highlightable_areas && highlightable_areas.length > 0) {
                     this.source_html = this.render_sentence_with_highlightable_areas(sent, highlightable_areas, category);
                } else {
                    // Otherwise, fall back to the original behavior.
                    const sent_type = 'input_idx'
                    const span_class = 'source_span'
                    this.source_html = this.render_sentence(sent, sent_type, span_class, category);
                }
            } catch (e) {
                this.source_html = ''
                console.warn(e)
            }
        },
        render_sentence_with_highlightable_areas(sentence, areas, category) {
            let html = '';
            let lastIndex = 0;

            // Sort areas by start index to ensure correct processing
            const sorted_areas = [...areas].sort((a, b) => a[0] - b[0]);

            sorted_areas.forEach(([start, end]) => {
                // Add the non-highlightable part before the current area
                if (start > lastIndex) {
                    html += `<span class="non-highlightable-area">${sentence.substring(lastIndex, start)}</span>`;
                }
                const highlightable_text = sentence.substring(start, end);
                const processed_sub_html = this.render_sentence(highlightable_text, 'input_idx', 'source_span', category, start); // pass offset `start`
                html += `<span class="selection-area">${processed_sub_html}</span>`;
                
                lastIndex = end;
            });

            // Add the final non-highlightable part after the last area
            if (lastIndex < sentence.length) {
                html += `<span class="non-highlightable-area">${sentence.substring(lastIndex)}</span>`;
            }

            return html;
        },
        select_source_html(e) {
            if (e.target.closest('.non-highlightable-area')) {
                window.getSelection().removeAllRanges(); // Clear the selection
                return;
            }

            if (!this.hit_box_config.enable_select_source_sentence) {
                return
            }

            const hit = this.hits_data[this.current_hit - 1];
            const highlightable_areas = hit.source_highlightable_areas;

            let selected_category = $("input[name=edit_cotegory]:checked").val();
            let selection = window.getSelection();
            // Check if there's a valid selection range
            if (selection.rangeCount === 0) {
                return; // No selection, just ignore
            }
            let txt = this.hits_data[this.current_hit - 1].source
            let range = selection.getRangeAt(0);
            let [start, end] = [range.startOffset, range.endOffset];
            
            if (start == end || !txt.substring(start, end).trim()) {
                this.process_source_html(null); // rerender if blocking 
                return;
            }
            if (selection.anchorNode != selection.focusNode || selection.anchorNode == null) {
                this.process_source_html_with_selected_span(selected_category)
                return;
            }

            // If we have highlightable areas, we need to convert the selection offsets
            if (highlightable_areas && highlightable_areas.length > 0) {
                // Find which selection-area contains the selected text
                let selectionAreaElement = selection.anchorNode.parentElement;
                while (selectionAreaElement && !selectionAreaElement.classList.contains('selection-area')) {
                    selectionAreaElement = selectionAreaElement.parentElement;
                }
                
                if (!selectionAreaElement) {
                    this.process_source_html_with_selected_span(selected_category);
                    return;
                }
                
                // Find which highlightable area this corresponds to by examining the text content
                let textBeforeSelection = '';
                let currentElement = document.querySelector('#source-sentence').firstChild;
                
                while (currentElement && currentElement !== selectionAreaElement) {
                    if (currentElement.textContent) {
                        textBeforeSelection += currentElement.textContent;
                    }
                    currentElement = currentElement.nextSibling;
                }
                
                // Add the text within the selection area up to our selection point
                if (selectionAreaElement) {
                    let textWithinArea = '';
                    let walker = document.createTreeWalker(
                        selectionAreaElement,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );
                    
                    let textNode;
                    while (textNode = walker.nextNode()) {
                        if (textNode === selection.anchorNode) {
                            textWithinArea += textNode.textContent.substring(0, start);
                            break;
                        } else {
                            textWithinArea += textNode.textContent;
                        }
                    }
                    
                    textBeforeSelection += textWithinArea;
                }
                
                // Now we can calculate the actual position in the original sentence
                let actualStart = textBeforeSelection.length;
                let selectedText = selection.toString();
                let actualEnd = actualStart + selectedText.length;
                
                // Update start and end to use the actual sentence positions
                start = actualStart;
                end = actualEnd;
                
                // Validate that the selection is within highlightable areas
                const is_selection_valid = highlightable_areas.some(([area_start, area_end]) => {
                    return start >= area_start && end <= area_end;
                });

                if (!is_selection_valid) {
                    this.process_source_html_with_selected_span(selected_category);
                    return; 
                }
            }

            $('#source-sentence').addClass(`select-color-${selected_category}`)

            let split_chars = [' ', '\n']
            if (this.config.tokenization && this.config.tokenization == 'tokenized') {
                split_chars = ['Ġ', ' ', '\n']
            }

            if (!this.config.tokenization || this.config.tokenization != 'char') {
                end -= 1
                while (split_chars.includes(txt.charAt(start))) {
                    start += 1
                }
                while (start - 1 >= 0 && !split_chars.includes(txt.charAt(start - 1))) {
                    start -= 1
                }
                while (split_chars.includes(txt.charAt(end))) {
                    end -= 1
                }
                while (end + 1 <= txt.length - 1 && !split_chars.includes(txt.charAt(end + 1))) {
                    end += 1
                }
                end += 1
            }

            if (start >= end) {
                this.process_source_html_with_selected_span(selected_category)
                return
            }

            let new_span_text = `<span class="selected-span-text bg-${selected_category}-light">\xa0${txt.substring(start, end)}\xa0</span>`
            this.set_span_text(new_span_text, 'source')

            if (this.hit_box_config.enable_multi_select_source_sentence) {
                let new_indices = this.selected_state.source_idx
                if (new_indices == null || new_indices.length == 0) {
                    new_indices = []
                }
                new_indices.push([start, end])
                this.set_span_indices(new_indices, 'source')
                let new_span_text = ""
                // iterate through this.selected_span_in_source_indexs
                for (let i = 0; i < new_indices.length; i++) {
                    let [start, end] = new_indices[i]
                    new_span_text += `
                    <span class="selected-span-text bg-${selected_category}-light">\xa0
                        <span @click="remove_selected('${selected_category}', ${start}, ${end})" class="hover-white black br-pill mr1 pointer">✘</span>
                            ${txt.substring(start, end)}\xa0</span>&nbsp&nbsp`
                }
                this.set_span_text(new_span_text, 'source')
            } else {
                this.set_span_indices([start, end], 'source')
            }
            this.set_span_category(selected_category, 'source')
            this.process_source_html_with_selected_span(selected_category)
        },
        deselect_source_html() {
            if (!this.hit_box_config.enable_select_source_sentence) {
                return
            }
            const selection = window.getSelection();
            if (selection.isCollapsed) {
                this.process_source_html_with_selected_span(null);
            }
        }
    },
    computed: {
        get_source_html() {
            return {
                template: `<pre @mousedown='deselect_source_html' @mouseup='select_source_html' id="source-sentence" class="f4 lh-paras sans-serif selection-area">${this.source_html}</pre>`,
                methods: {
                    select_source_html: this.select_source_html,
                    deselect_source_html: this.deselect_source_html,
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
    <component :is="get_source_html"></component>
</template>
