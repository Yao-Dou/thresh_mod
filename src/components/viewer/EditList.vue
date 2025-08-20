<script setup>
import VRuntimeTemplate from "vue3-runtime-template";
import _ from 'lodash';
import LeaderLine from 'leader-line-vue';
import tinycolor from 'tinycolor2';
import { COLORS, LIKERT_COLOR_MAP } from '../../assets/js/constants.js';
</script>

<script>
export default {
    props: [
        'hits_data',
        'set_hits_data',
        'current_hit',
        'edits_dict',
        'set_edits_dict',
        'editor_open',
        'set_editor_state',
        'refresh_interface_edit',
        'annotating_edit_span_category_id',
        'set_annotating_edit_span_category_id',
        'annotating_edit_span',
        'set_annotating_edit_span',
        'lines',
        'set_lines',
        'config',
        'set_boundary_editing_mode',
        'set_boundary_editing_edit',
        'set_original_boundary',
        'boundary_editing_mode',
        'set_hit_box_config',
        'set_span_text',
        'set_span_indices'
    ],
    data() {
        return {
            edits_html: "",
            line_locked: false
        }
    },
    watch: {
        current_hit() {
            $(`#circle-${this.current_hit}`).addClass('circle-active');
            this.process_edits_html();
            // this.draw_lines();
        },
        hits_data() {
            this.process_edits_html();
            // this.draw_lines();
        },
        edits_dict() {
            // this.draw_lines();
        },
    },
    methods: {
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
                'factual_basis': 'Factual Basis of Case'
            };
            
            return categoryLabels[category] || category;
        },
        isChecklistCategory(category) {
            // Check if a category is one of the checklist item categories
            const checklistCategories = [
                'filing_date', 'parties', 'class_action', 'type_of_counsel',
                'cause_of_action', 'statutory_basis', 'remedy_sought', 'judge_name',
                'consolidated_cases', 'related_cases', 'important_filings', 'court_rulings',
                'reported_opinions', 'trials', 'appeals', 'decree_terms', 'decree_dates',
                'decree_duration', 'settlement_terms', 'settlement_date', 'settlement_duration',
                'court_enforced', 'settlement_disputes', 'monitor_name', 'monitor_reports',
                'factual_basis', 'checklist_extraction'  // Include the generic one too
            ];
            
            return checklistCategories.includes(category);
        },
        annotate_edit(e) {
            if (this.boundary_editing_mode) {
                return;
            }
            const source_sentence = this.hits_data[this.current_hit - 1].source
            const target_sentence = this.hits_data[this.current_hit - 1].target
            const edit_dict = this.edits_dict

            const category = e.target.dataset.category
            const id = e.target.dataset.id
            const real_id = parseInt(e.target.dataset.id.split("-")[1])

            $(".child-question").hide();
            if (this.editor_open) {
                // Get the edit to check annotation status
                const edit = edit_dict.find(function(entry) {
                    return entry['category'] === category && entry['id'] === real_id;
                });
                
                $(`.quality-selection[data-category=${category}]`).hide(300);
                $(".icon-default").removeClass("open");
                $(e.target).removeClass(`txt-${category}`);
                
                // Reset background colors when closing
                $(`.${category}[data-id=${id}]`).removeClass(`white bg-${category} bg-${category}-light`);
                $(`.${category}_below[data-id=${id}]`).removeClass(`white bg-${category} bg-${category}-light`);
                
                // Remove highlight from annotation container
                $(`.edit-container[data-edit-id='${id}']`).css('background-color', '');
                
                // Re-add proper border and text color based on annotation status
                const hasAnnotation = edit && edit.annotation && edit.annotation != null;
                if (hasAnnotation) {
                    $(`.${category}[data-id=${id}]`).addClass(`border-${category}`);
                    $(`.${category}_below[data-id=${id}]`).addClass(`txt-${category}`);
                } else {
                    $(`.${category}[data-id=${id}]`).addClass(`border-${category}-light`);
                    $(`.${category}_below[data-id=${id}]`).addClass(`txt-${category}-light`);
                }
                
                this.set_annotating_edit_span_category_id(null);
                this.set_annotating_edit_span(null, 'source');
                this.set_annotating_edit_span(null, 'target');
                this.set_annotating_edit_span(null, 'composite');
                this.refresh_interface_edit();
                this.set_editor_state(false);
                return;
            } else {
                $(`.quality-selection`).hide(300)
                
                const qualitySelection = $(`.quality-selection[data-category=${category}]`);
                
                // Check box_position configuration
                if (this.config.box_position === 'float') {
                    // Float mode - position at top right with draggable
                    this.positionFloatingBox(qualitySelection);
                    this.makeBoxDraggable(qualitySelection);
                } else {
                    // Fixed mode - original behavior at top of column
                    qualitySelection.css({
                        'position': 'relative',
                        'top': 'auto',
                        'right': 'auto',
                        'left': 'auto',
                        'width': '100%'
                    });
                }
                
                qualitySelection.slideDown(300);
                $(e.target).addClass(`txt-${category}`)
                this.set_editor_state(!this.editor_open)
                
                // Auto-populate textarea with current extracted value if exists
                setTimeout(() => {
                    const edit = edit_dict.find(entry => entry['category'] === category && entry['id'] === real_id);
                    if (edit && edit.annotation && edit.annotation.explanation) {
                        // Find the textarea for this category's explanation question
                        const textarea = $(`#question-${category}-explanation`);
                        if (textarea.length > 0) {
                            textarea.val(edit.annotation.explanation);
                            // Trigger input event to update the component's state
                            textarea.trigger('input');
                        }
                    }
                }, 100); // Small delay to ensure DOM is ready
            }
            // Don't add background color if in boundary editing mode
            if (!this.boundary_editing_mode) {
                $(`.${category}[data-id=${id}]`).removeClass(`border-${category}-light`).addClass(`white border-${category} bg-${category}`)
            }

            let annotating_span = edit_dict.find(function(entry) {
                return entry['category'] === category && entry['id'] === real_id;
            });

            if (this.getEditConfig(category)['multi_span']) {
                let source_spans = annotating_span['input_idx']
                let new_edit_span = ""
                for (let i = 0; i < source_spans.length; i++) {
                    if (i != 0) {
                        new_edit_span += `<span class="edit-type txt-${category} f3"> and </span>`
                    }
                    new_edit_span += `<span class="pa1 edit-text br-pill-ns txt-${category} border-${category}-all ${category}_below">
                        &nbsp${source_sentence.substring(source_spans[i][0], source_spans[i][1])}&nbsp</span>`
                }
                this.set_annotating_edit_span(new_edit_span, 'source')

                let target_spans = annotating_span['output_idx']
                new_edit_span = ""
                for (let i = 0; i < target_spans.length; i++) {
                    if (i != 0) {
                        new_edit_span += `<span class="edit-type txt-${category} f3"> and </span>`
                    }
                    new_edit_span += `<span class="pa1 edit-text br-pill-ns txt-${category} border-${category}-all ${category}_below">
                        &nbsp${target_sentence.substring(target_spans[i][0], target_spans[i][1])}&nbsp</span>`
                }
                this.set_annotating_edit_span(new_edit_span, 'target')
            } else if (this.getEditConfig(category)['type'] == 'composite') {
                let new_edit_span = ""
                let light = ""
                
                new_edit_span += `<span class="edit-type txt-${category}${light} f3"> (</span>`;
                for (let j = 0; j < annotating_span['constituent_edits'].length; j++) {
                    const constituent_edit = annotating_span['constituent_edits'][j];
                    const constituent_key = constituent_edit['category'];

                    new_edit_span += this.render_edit_text(constituent_edit, real_id, constituent_key, light)
                    if (j == annotating_span['constituent_edits'].length - 1) {
                        new_edit_span += `<span class="edit-type txt-${category}${light} f3"> )</span>`;
                    } else {
                        new_edit_span += `<span class="edit-type txt-${category}${light} f3"> , </span>`;
                    }
                }
                this.set_annotating_edit_span(new_edit_span, 'composite')
            } else {
                if (annotating_span.hasOwnProperty('input_idx')) {
                    let span_idx = annotating_span['input_idx'][0]
                    let new_edit_span = ""
                    new_edit_span += `<span class="pa1 edit-text br-pill-ns txt-${category} border-${category}-all ${category}_below">
                        &nbsp${source_sentence.substring(span_idx[0], span_idx[1])}&nbsp</span>`
                    this.set_annotating_edit_span(new_edit_span, 'source')
                } 

                if (annotating_span.hasOwnProperty('output_idx')) {
                    let new_edit_span = ""
                    const isChecklistExtraction = this.isChecklistCategory(category);
                    
                    // Helper function for annotating box - show full text for checklist extraction
                    const truncateText = (text) => {
                        // In the annotating box, show full text for better readability
                        return text;
                    };
                    
                    // Handle checklist extraction with compact evidence display
                    if (isChecklistExtraction) {
                        // Show evidences first, then extracted value
                        new_edit_span += `<div class="mt3 mb3 pa2 tl" style="background-color: #f0f8ff; border-left: 4px solid #87CEEB; border-radius: 4px;">`;
                        new_edit_span += `<p class="mt0 mb2 f5 b tracked-light">Evidences:</p>`;
                        new_edit_span += `<div class="f5 lh-copy" style="color: #1e3a8a;">`;
                        
                        const spans = annotating_span['output_idx'];
                        for (let j = 0; j < spans.length; j++) {
                            let span_idx = spans[j];
                            const spanText = target_sentence.substring(span_idx[0], span_idx[1]);
                            const displayText = truncateText(spanText);
                            
                            if (j > 0) {
                                new_edit_span += `, `;
                            }
                            new_edit_span += `"${displayText}"`;
                        }
                        new_edit_span += `</div></div>`;
                        
                        // Add current extracted value below evidences (in light green)
                        let currentValue = 'No value extracted yet';
                        if (annotating_span.annotation && annotating_span.annotation.explanation) {
                            currentValue = annotating_span.annotation.explanation;
                        }
                        
                        new_edit_span += `<div class="mb3 pa2 tl" style="background-color: #f0f8f0; border-left: 4px solid #90EE90; border-radius: 4px;">`;
                        new_edit_span += `<p class="mt0 mb2 f5 b tracked-light">Current Extracted Value:</p>`;
                        new_edit_span += `<p class="ma0 f5" style="color: #2d5016;">${currentValue}</p>`;
                        new_edit_span += `</div>`;
                    } else {
                        // Non-checklist extraction - keep original bubble style
                        let span_idx = annotating_span['output_idx'][0]
                        const spanText = target_sentence.substring(span_idx[0], span_idx[1]);
                        const displayText = truncateText(spanText);
                        new_edit_span += `<span class="pa1 edit-text br-pill-ns txt-${category} border-${category}-all ${category}_below">
                            &nbsp${displayText}&nbsp</span>`
                    }
                    this.set_annotating_edit_span(new_edit_span, 'target')
                }
            }

            this.set_annotating_edit_span_category_id(id)
        },
        trash_edit(e) {
            const real_id = parseInt(e.target.dataset.id.split("-")[1])
            const category = e.target.dataset.category
            const old_edits_list = this.hits_data[this.current_hit - 1]["edits"]
            
            let new_edits_list = []
            for (const old_edit of old_edits_list) {
                if (old_edit["id"] == real_id && old_edit["category"] == category) {
                    continue
                }
                new_edits_list.push(old_edit)
            }

            let new_hits_data = _.cloneDeep(this.hits_data);
            new_hits_data[this.current_hit - 1]["edits"] = new_edits_list
            this.set_hits_data(new_hits_data);
        },
        hasAnnotation(edit) {
            return edit['annotation'] != null || (this.config.disable && Object.values(this.config.disable).includes('annotation'))
        },
        getEditConfig(category) {
            if (!this.config.hasOwnProperty('edits')) { return {}; }
            return this.config['edits'].find(function(entry) {
                return entry['name'] === category;
            });
        },
        linesDisabled() {
          return this.config.hasOwnProperty('display') && Object.values(this.config.display).includes('disable-lines')
        },
        getAnnotationHtml(ann_config, ann) {
            if (ann == null) {
                return '';
            }
            
            let ann_html = ''
            for (let edit_ann_type of ann_config) {
                let ann_type_name = edit_ann_type['name']
                let ann_type_label = edit_ann_type.label ? edit_ann_type.label : ann_type_name

                ann_type_label = ann_type_label.replace('grammar_error', 'G') // TODO: Get rid of manual override

                if (!edit_ann_type.hasOwnProperty('options')) {
                    continue
                }

                if (edit_ann_type['options'] == 'binary') {
                    if (ann[ann_type_name] == "yes") {
                        // ann_html += ` <span class="brown ba bw1 pa1 br-100">G</span>`;
                        // ann_html += ` <span class="brown ba bw1 pa1 br-pills">Coref error</span>`;
                        ann_html += ` <span class="brown ba bw1 pa1 br-pills mr2">${ann_type_label}</span>`;
                    }
                } else if (edit_ann_type['options'] == 'likert-3') {
                    if (ann[ann_type_name] != null) {
                        let ann_color = LIKERT_COLOR_MAP[ann[ann_type_name]] ? LIKERT_COLOR_MAP[ann[ann_type_name]] : 'black'
                        ann_html += `<span class="${ann_color} br-pills ba bw1 pa1">${ann_type_label}: ${ann[ann_type_name]}</span>`;
                    }
                } else if (edit_ann_type['options'] == 'textarea' || edit_ann_type['options'] == 'textbox') {
                    if (ann[ann_type_name] != null) {
                        // Style similar to evidences but with green colors
                        ann_html += `<div class="mt2 mb2">`;
                        ann_html += `<div class="f6 b mb1" style="color: #166534;">Extracted Value:</div>`;
                        ann_html += `<div class="f5 lh-copy pl2" style="color: #166534; border-left: 3px solid #22c55e;">${ann[ann_type_name]}</div>`;
                        ann_html += `</div>`;
                    }
                } else {
                    // custom edit types
                    if (!ann[ann_type_name]) { continue }
                    let selected = ann[ann_type_name]["val"]
                    if (selected != null && selected != "") {
                        ann_html += ''

                        let custom_label = edit_ann_type['options'].find(d => d.name === selected)
                        custom_label = custom_label.label ? custom_label.label : selected
                        ann_html += `<span class="light-purple ba bw1 pa1 mr2">${custom_label}</span>`

                        if (edit_ann_type.hasOwnProperty('options')) {
                            ann_html += this.getAnnotationHtml(edit_ann_type['options'], ann[ann_type_name])
                        }
                    }                            
                } 
            }
            return ann_html
        },
        render_edit_text(edit, i, key, light) {
            const edit_config = this.getEditConfig(key)
            let edit_label = edit_config.label ? edit_config.label : key
            
            // For paragraph-level data, use the category to get the proper label
            if (this.config.data_format === 'paragraph') {
                // Use the category mapping for paragraph-level data
                edit_label = this.getCategoryLabel(key)
            } else if (key === 'checklist_extraction' && this.hits_data[this.current_hit - 1]?.metadata?.checklist_item) {
                // Use metadata checklist_item for item-level data with generic category
                edit_label = this.hits_data[this.current_hit - 1].metadata.checklist_item
            }

            let new_html = ''
            new_html += `
                <span data-id="${key}-${i}" data-category="${key}" class="default_cursor" @mouseover="hover_span" @mouseout="un_hover_span">
                    <span class="edit-type txt-${key}${light} f5">${edit_label}</span>`;

            if (!edit.hasOwnProperty('input_idx') && !edit.hasOwnProperty('output_idx')) { return new_html }

            // Helper function - no truncation for better readability
            const truncateText = (text, isChecklistExtraction) => {
                // Show full text for all cases
                return text;
            };

            const isChecklistExtraction = this.isChecklistCategory(key);

            if (edit_config['type'] == 'multi_span') {
                // Handle checklist extraction with clean design
                if (isChecklistExtraction && edit.hasOwnProperty('output_idx')) {
                    new_html += `<div class="mt2 mb2">`;
                    new_html += `<div class="f6 b mb1" style="color: #1e3a8a;">Evidences:</div>`;
                    
                    // Show all evidence spans without bubbles
                    let target_spans_for_subs = edit['output_idx']
                    for (let j = 0; j < target_spans_for_subs.length; j++) {
                        let target_span = target_spans_for_subs[j];
                        const spanText = this.hits_data[this.current_hit - 1].target.substring(target_span[0], target_span[1]);
                        const displayText = truncateText(spanText, true);
                        
                        new_html += `<div class="f5 lh-copy mb1 pl2" style="color: #374151; border-left: 3px solid #1e3a8a;">${displayText}</div>`;
                    }
                    new_html += `</div>`;
                } else {
                    // Non-checklist extraction - keep original bubble style
                    if (edit.hasOwnProperty('input_idx')) {
                        let source_spans_for_subs = edit['input_idx']
                        for (let j = 0; j < source_spans_for_subs.length; j++) {
                            let source_span = source_spans_for_subs[j];
                            if (j != 0) {
                                new_html += `<span class="edit-type txt-${key}${light} f3"> and </span>`;
                            }
                            const spanText = this.hits_data[this.current_hit - 1].source.substring(source_span[0], source_span[1]);
                            const displayText = truncateText(spanText, isChecklistExtraction);
                            new_html += `
                                <span class="pa1 edit-text br-pill-ns txt-${key}${light} border-${key}${light}-all ${key}_below" data-id="${key}-${i}" data-category="${key}">
                                    &nbsp${displayText}&nbsp</span>`;
                        }
                    }
                    if (edit.hasOwnProperty('input_idx') && edit.hasOwnProperty('output_idx')) {
                        new_html += `<span class="edit-type txt-${key}${light} f3"> with </span>`;
                    }
                    if (edit.hasOwnProperty('output_idx')) {
                        let target_spans_for_subs = edit['output_idx']
                        for (let j = 0; j < target_spans_for_subs.length; j++) {
                            let target_span = target_spans_for_subs[j];
                            if (j != 0) {
                                new_html += `<span class="edit-type txt-${key}${light} f3"> and </span>`;
                            }
                            const spanText = this.hits_data[this.current_hit - 1].target.substring(target_span[0], target_span[1]);
                            const displayText = truncateText(spanText, isChecklistExtraction);
                            new_html += `
                                <span class="pa1 edit-text br-pill-ns txt-${key}${light} border-${key}${light}-all ${key}_below" data-id="${key}-${i}" data-category="${key}">
                                    &nbsp${displayText}&nbsp</span>`;
                        }
                    }
                }
            } else {
                if (edit.hasOwnProperty('input_idx')) {
                    let in_span = edit['input_idx'][0]
                    const spanText = this.hits_data[this.current_hit - 1].source.substring(in_span[0], in_span[1]);
                    const displayText = truncateText(spanText, isChecklistExtraction);
                    new_html += `
                    <span class="pa1 edit-text br-pill-ns txt-${key}${light} border-${key}${light}-all ${key}_below" data-id="${key}-${i}" data-category="${key}">
                        &nbsp${displayText}&nbsp</span>`;
                } else if (edit.hasOwnProperty('output_idx')) {
                    // Handle checklist extraction with clean design
                    if (isChecklistExtraction) {
                        new_html += `<div class="mt2 mb2">`;
                        new_html += `<div class="f6 b mb1" style="color: #1e3a8a;">Evidences:</div>`;
                        
                        // Show all evidence spans without bubbles
                        for (let j = 0; j < edit['output_idx'].length; j++) {
                            let spanIdx = edit['output_idx'][j];
                            const spanText = this.hits_data[this.current_hit - 1].target.substring(spanIdx[0], spanIdx[1]);
                            const displayText = truncateText(spanText, true);
                            
                            new_html += `<div class="f5 lh-copy mb1 pl2" style="color: #374151; border-left: 3px solid #1e3a8a;">${displayText}</div>`;
                        }
                        new_html += `</div>`;
                    } else {
                        // Non-checklist extraction - keep original bubble style
                        let out_span = edit['output_idx'][0]
                        const spanText = this.hits_data[this.current_hit - 1].target.substring(out_span[0], out_span[1]);
                        const displayText = truncateText(spanText, isChecklistExtraction);
                        new_html += `
                        <span class="pa1 edit-text br-pill-ns txt-${key}${light} border-${key}${light}-all ${key}_below" data-id="${key}-${i}" data-category="${key}">
                            &nbsp${displayText}&nbsp</span>`;
                    }
                }
            }

            return new_html
        },
        process_edits_html() {
            let new_html = ''

            let hit_edits = _.cloneDeep(this.hits_data[this.current_hit - 1].edits)

            // Sort edits
            const getSmallestValue = (arr) => (arr ? Math.min(...arr.map((arr) => arr[0])) : Infinity);
            hit_edits.sort((a, b) => {
                const aMin = Math.min(getSmallestValue(a.input_idx), getSmallestValue(a.output_idx));
                const bMin = Math.min(getSmallestValue(b.input_idx), getSmallestValue(b.output_idx));
                return aMin - bMin;
            });

            for (let edit of hit_edits) {
                let i = edit['id']
                let key = edit['category'];
                let light = !this.hasAnnotation(edit) ? "-light" : ""
                new_html += `
                    <div class='cf ba b--black-10 br2 pa3 mb3 edit-container' data-edit-id='${key}-${i}'>
                        <div class="fl w-80 edit" style="margin-bottom: 0 !important;">`;
                
                // Render edit
                const edit_config = this.getEditConfig(key)
                let edit_label = edit_config && edit_config.label ? edit_config.label : key
                
                // For paragraph-level data, use the category to get the proper label
                if (this.config.data_format === 'paragraph') {
                    // Use the category mapping for paragraph-level data
                    edit_label = this.getCategoryLabel(key)
                } else if (key === 'checklist_extraction' && this.hits_data[this.current_hit - 1]?.metadata?.checklist_item) {
                    // Use metadata checklist_item for item-level data with generic category
                    edit_label = this.hits_data[this.current_hit - 1].metadata.checklist_item
                }
                if (edit_config == null) { continue }
                if (edit_config['type'] == 'composite') {
                    const composite_icon = this.getEditConfig(key)['icon']
                    new_html += `
                        <span data-id="${key}-${i}" data-category="${key}" class="default_cursor" @mouseover="hover_span" @mouseout="un_hover_span">
                            <span class="edit-type txt-${key}${light} f5">${edit_label}</span>
                            <span class="pa1 edit-text br-pill-ns txt-${key}${light} border-${key}${light}-all ${key}_below" data-id="${key}-${i}" data-category="${key}">
                                &nbsp<i class="fa-solid ${composite_icon}"></i>&nbsp</span>
                                <span class="edit-type txt-${key}${light} f3"> (</span>`;
                    
                    for (let j = 0; j < edit['constituent_edits'].length; j++) {
                        const constituent_edit = edit['constituent_edits'][j];
                        const constituent_key = constituent_edit['category'];

                        new_html += this.render_edit_text(constituent_edit, i, constituent_key, light)
                        new_html += `</span>`;
                        if (j != edit['constituent_edits'].length - 1) {
                            new_html += `<span class="edit-type txt-${key}${light} f3"> , </span>`;
                        } else {
                            new_html += `<span class="edit-type txt-${key}${light} f3"> )</span>`;
                        }
                    }
                } else {
                    new_html += this.render_edit_text(edit, i, key, light)
                }

                // Render annotation
                if (!this.hasAnnotation(edit)) {
                    if (!this.config.disable || !Object.values(this.config.disable).includes('annotation')) {
                        new_html += `
                            <span class="f4 i black-60">${this.config.interface_text.annotation_viewer.not_annotated_text_1} <i class="fa-solid fa-pencil"></i> ${this.config.interface_text.annotation_viewer.not_annotated_text_2}</span>
                        `;
                    }
                } else {
                    const edit_config = this.getEditConfig(key)
                    let ann_html = this.getAnnotationHtml(edit_config['annotation'], edit['annotation'])
                    new_html += `<span class="f5">${ann_html}</span>`;
                }

                let disabled = ''
                if (this.config.disable && Object.values(this.config.disable).includes('annotation')) {
                    disabled = 'disabled'
                }
                let disable_delete = ''
                if (this.config.disable && Object.values(this.config.disable).includes('delete')) {
                    disable_delete = 'disabled'
                }
                let disable_boundary_edit = 'disabled'
                if (this.config.enable && (Object.values(this.config.enable).includes('edit_boundary') || Object.values(this.config.enable).includes('edit_boundary_multi'))) {
                    disable_boundary_edit = ''
                }
                new_html += `
                        </span>
                    </div>
                    <div class="fl w-20 mb4 operation tr">
                        <i @click="annotate_edit" class="annotation-icon fa-solid fa-pencil mr3 pointer dim ${disabled}" data-id="${key}-${i}" data-category="${key}"></i>
                        <i 
                            @click="edit_boundary" 
                            class="boundary-edit-icon fa-solid fa-pen-to-square mr2 pointer dim ${disable_boundary_edit}" 
                            data-id="${key}-${i}" 
                            data-category="${key}"
                            title="Edit boundary"></i>
                        <i 
                            @click="trash_edit" class="fa-solid fa-trash-can ml4 pointer dim ${disable_delete}" data-id="${key}-${i}" data-category="${key}"></i>
                    </div>
                </div>`;
            }
            
            this.set_edits_dict(hit_edits);
            this.edits_html = new_html;
        },
        clear_lines: function() {
            // Remove existing lines as defined by LeaderLine
            const lines_list = [].concat(...Object.values(this.lines).map(e => Object.values(e)));
            for (let line of lines_list) {
                if (line instanceof Array) {
                    Object.values(line).forEach(l => {
                        try {l.remove()} catch (e) { console.warn(e) }
                    });
                } else {
                    try { line.remove() } catch (e) { console.warn(e) }
                }
            }
            $('.leader-line').remove();
        },
        draw_lines: function() {
            // There's some latency in this function, the locking ensures no line references are lost
            if (this.line_locked) { return }
            if (!this.config.hasOwnProperty('edits') || this.linesDisabled()) { return }
            this.line_locked = true

            try {
                this.clear_lines()
            } catch (e) { console.warn(e) }

            let new_lines = Object.fromEntries(this.config.edits.map(t => [t.name, {}]));
            let hit_edits = _.cloneDeep(this.hits_data[this.current_hit - 1].edits)

            for (let edit of hit_edits) {
                let id = edit['id']
                let key = edit['category'];
                const edit_config = this.getEditConfig(key)

                const line_config = {
                    endPlug: "behind",
                    size: 3,
                    path: "straight"
                }

                let color = edit_config.color
                if (COLORS.hasOwnProperty(color)) {
                    color = COLORS[color]
                }
                if (!this.hasAnnotation(edit)) {
                    color = tinycolor(color).lighten(25).toHexString();
                }
                line_config.color = color

                try {
                    if (edit_config['type'] == 'composite') {
                        for (let constituent_edit of edit['constituent_edits']) {
                            new_lines[key][id] = []
                            const cid = constituent_edit['id']
                            const ccategory = constituent_edit['category']
                            const constituent_edit_config = this.getEditConfig(ccategory)

                            if (constituent_edit_config['enable_input'] && constituent_edit_config['enable_output']) {
                                new_lines[key][id].push(
                                    LeaderLine.setLine(
                                        $(`.${key}.source_span[data-id='${key}-${id}'][data-childcategory=${ccategory}][data-childid=${cid}]`)[0],
                                        $(`.${key}.target_span[data-id='${key}-${id}'][data-childcategory=${ccategory}][data-childid=${cid}]`)[0],
                                        line_config
                                    )
                                )
                            }
                        }
                    } else if (edit_config['enable_input'] && edit_config['enable_output']) {
                        if ($(`.${key}.source_span`)[0] == null) {
                            console.warn("Something went wrong!")
                        }

                        new_lines[key][id] = LeaderLine.setLine(
                            $(`.${key}.source_span[data-id='${key}-${id}']`)[0],
                            $(`.${key}.target_span[data-id='${key}-${id}']`)[0],
                            line_config
                        )
                        
                        // My attempt to fix line drawing in builder via mutation observers
                        // var draw_lines = this.draw_lines
                        // const targetElement = $(`.${key}.source_span[data-id='${key}-${id}']`)[0]
                        // let initialRect = targetElement.getBoundingClientRect();
                        // function checkPositionChange() {
                        //     const currentRect = targetElement.getBoundingClientRect();
                        //     if (currentRect.x !== initialRect.x || currentRect.y !== initialRect.y) {
                        //         draw_lines()
                        //         initialRect = currentRect;
                        //     }
                        // }
                        // const observer = new MutationObserver(() => {
                        //     checkPositionChange();
                        // });
                        // observer.observe(targetElement, { attributes: true });
                        // $('#sandbox')[0].addEventListener('scroll', checkPositionChange);
                    }
                } catch (e) { console.warn(e) }
            }

            // TODO: This is essentially code which points from split edits to other edits
            // let split_edits_dict = this.edits_dict["split"]
            // if (split_edits_dict != {}) {
            //     for (let id in split_edits_dict) {
            //         let color = "rgba(250, 229, 175, 0.4)"
            //         if (("annotations" in this.hits_data[[this.current_hit - 1]]) && (id in this.hits_data[[this.current_hit - 1]].annotations["split"])) {
            //             color = "rgba(247, 206, 70, 0.46)"
            //         }
            //         new_lines["split"][id] = []
            //         for (let span_category in split_edits_dict[id]) {
            //             for (let span_id in split_edits_dict[id][span_category]) {
            //                 let css_config = `[data-id='split-${id}'][data-childcategory=${span_category}][data-childid=${span_id}]`
            //                 const line_config = {
            //                     endPlug: "arrow3",
            //                     size: 3,
            //                     path: "arc",
            //                     color: color
            //                 }
            //                 if (span_category == "deletion") {
            //                     new_lines["split"][id].push(
            //                         LeaderLine.setLine(
            //                         $(`.split.source_span${css_config}`)[0],
            //                         $(`.split.split-sign[data-id='split-${id}']`)[0],
            //                         line_config)
            //                     )
            //                 } else if (span_category =="insertion") {
            //                     new_lines["split"][id].push(
            //                         LeaderLine.setLine(
            //                         $(`.split.target_span${css_config}`)[0],
            //                         $(`.split.split-sign[data-id='split-${id}']`)[0],
            //                         line_config)
            //                     )
            //                 } else if (span_category == "substitution" || span_category == "reorder") {
            //                     new_lines["split"][id].push(
            //                         LeaderLine.setLine(
            //                         $(`.split.source_span${css_config}`)[0],
            //                         $(`.split.target_span${css_config}`)[0],
            //                         line_config)
            //                     )

            //                     new_lines["split"][id].push(
            //                         LeaderLine.setLine(
            //                         $(`.split.target_span${css_config}`)[0],
            //                         $(`.split.split-sign[data-id='split-${id}']`)[0],
            //                         line_config)
            //                     )
            //                 }
            //             }
            //         }
            //     }
            // }

            this.set_lines(new_lines)
            this.line_locked = false
        },
        reposition_lines() {
            // this.draw_lines()
            const lines_list = [].concat(...Object.values(this.lines).map(e => Object.values(e)));
            for (let line of lines_list) {
                if (line instanceof Array) {
                    Object.values(line).forEach(l => {
                        try {l.position()} catch (e) { console.warn(e) }
                    });
                } else {
                    try { line.position() } catch (e) { console.warn(e) }
                }
            }
        },
        edit_boundary(e) {
            const real_id = parseInt(e.target.dataset.id.split("-")[1]);
            const category = e.target.dataset.category;
            const id = e.target.dataset.id;
            
            // Find the edit and store original boundary
            const edit_to_modify = this.hits_data[this.current_hit - 1].edits.find(
                edit => edit.category === category && edit.id === real_id
            );
            
            if (!edit_to_modify) return;

            const edit_config = this.getEditConfig(category);
            let boundary_type = null;
            
            if (edit_config.enable_input && edit_config.enable_output) {
                boundary_type = 'target'; // Default to target, could be made configurable
            } else if (edit_config.enable_input) {
                boundary_type = 'source';
            } else if (edit_config.enable_output) {
                boundary_type = 'target';
            }
            
            if (!boundary_type) return;

            // Store original boundary and set editing mode
            const boundary_key = boundary_type === 'source' ? 'input_idx' : 'output_idx';
            this.set_original_boundary(_.cloneDeep(edit_to_modify[boundary_key]));
            
            // Check if multi-boundary editing is enabled
            const is_multi_boundary = this.config.enable && 
                Object.values(this.config.enable).includes('edit_boundary_multi');
            
            this.set_boundary_editing_edit({
                category: category,
                id: real_id,
                type: boundary_type,
                multi: is_multi_boundary
            });
            this.set_boundary_editing_mode(true);
            
            // Clear selection state for clean start in boundary editing
            this.set_span_text('', boundary_type === 'source' ? 'source' : 'target');
            this.set_span_indices([], boundary_type === 'source' ? 'source' : 'target');
            
            // Set up hit box config for boundary editing
            this.setup_boundary_hit_box_config(boundary_type, is_multi_boundary);
            
            // Visual setup
            this.enable_boundary_selection(boundary_type, category);
            this.highlight_current_boundary(edit_to_modify, boundary_type, category);
            
            // Position the boundary edit panel based on configuration
            this.$nextTick(() => {
                const boundaryPanel = $('#boundary_edit_panel');
                
                // Check box_position configuration
                if (this.config.box_position === 'float') {
                    // Float mode - position at top right with draggable
                    this.positionFloatingBox(boundaryPanel);
                    this.makeBoxDraggable(boundaryPanel);
                } else {
                    // Fixed mode - original behavior at top of column
                    boundaryPanel.css({
                        'position': 'relative',
                        'top': 'auto',
                        'right': 'auto',
                        'left': 'auto',
                        'width': '100%'
                    });
                }
                
                boundaryPanel.slideDown(300);
            });
        },

        setup_boundary_hit_box_config(boundary_type, is_multi) {
            let new_hit_box_config = {
                enable_select_source_sentence: false,
                enable_select_target_sentence: false,
                enable_multi_select_source_sentence: false,
                enable_multi_select_target_sentence: false,
            };

            if (boundary_type === 'source') {
                new_hit_box_config.enable_select_source_sentence = true;
                if (is_multi) {
                    new_hit_box_config.enable_multi_select_source_sentence = true;
                }
            } else if (boundary_type === 'target') {
                new_hit_box_config.enable_select_target_sentence = true;
                if (is_multi) {
                    new_hit_box_config.enable_multi_select_target_sentence = true;
                }
            }

            this.set_hit_box_config(new_hit_box_config);
        },

        enable_boundary_selection(boundary_type, category) {
            // Enable selection on the target sentence
            const sentence_element = boundary_type === 'source' ? '#source-sentence' : '#target-sentence';
            $(sentence_element).addClass(`boundary-editing-${category}`);
            
            // Add visual indicator
            $(sentence_element).attr('data-boundary-editing', 'true');
            
            // You might want to add some CSS to show this is in editing mode
            $(sentence_element).addClass('boundary-editing-active');
        },

        highlight_current_boundary(edit, boundary_type, category) {
            // The boundary highlighting is now handled by Vue watchers
            // in TargetSent.vue and SourceSent.vue that trigger HTML regeneration
            // when boundary_editing_mode or boundary_editing_edit changes
        },
        is_boundary_editable(edit) {
            const edit_config = this.getEditConfig(edit.category);
            // Only allow boundary editing for single_span and multi_span types
            // Composite edits are more complex and would need special handling
            return edit_config && 
                edit_config.type !== 'composite' && 
                (edit_config.enable_input || edit_config.enable_output);
        },
        positionEditBox(editBox, editContainer) {
            // Make the edit box absolutely positioned
            editBox.css({
                'position': 'absolute',
                'width': editContainer.outerWidth() + 'px',
                'z-index': '1000'
            });
            
            // Get the position of the edit container
            const containerOffset = editContainer.offset();
            const containerTop = containerOffset.top;
            
            // Position the edit box above the container
            const editBoxHeight = editBox.outerHeight() || 300; // Estimate height if not visible
            const spacing = 10; // Space between edit box and container
            
            // Calculate position relative to document
            const newTop = containerTop - editBoxHeight - spacing;
            
            // Check if it would go above viewport
            const scrollTop = $(window).scrollTop();
            if (newTop < scrollTop + 50) { // 50px buffer from top
                // If it would go above viewport, position it below instead
                editBox.css({
                    'top': (containerTop + editContainer.outerHeight() + spacing) + 'px',
                    'left': containerOffset.left + 'px'
                });
            } else {
                // Position above
                editBox.css({
                    'top': newTop + 'px',
                    'left': containerOffset.left + 'px'
                });
            }
        },
        positionFloatingBox(box) {
            // Calculate responsive width based on viewport
            const viewportWidth = $(window).width();
            let boxWidth;
            
            if (viewportWidth < 768) {
                // Mobile: 90% of viewport
                boxWidth = '90vw';
            } else if (viewportWidth < 1024) {
                // Tablet: 60% of viewport
                boxWidth = '60vw';
            } else if (viewportWidth < 1440) {
                // Small laptop: 50% of viewport
                boxWidth = '50vw';
            } else {
                // Large laptop/desktop: 40% of viewport with min-width
                boxWidth = '40vw';
            }
            
            // Position the box at top right corner
            box.css({
                'position': 'fixed',
                'top': '80px', // Not too corner
                'right': '20px',
                'width': boxWidth,
                'min-width': '400px',
                'max-width': '800px',
                'z-index': '1000',
                'cursor': 'move'
            });
        },
        makeBoxDraggable(box) {
            let isDragging = false;
            let startX, startY, initialX, initialY;
            
            // Add drag handle if not exists
            if (!box.find('.drag-handle').length) {
                box.prepend('<div class="drag-handle" style="height: 30px; background: #e5e7eb; margin: -10px -10px 10px -10px; border-radius: 4px 4px 0 0; cursor: move; display: flex; align-items: center; padding: 0 10px;"><span style="font-size: 12px; color: #6b7280;">Drag to move</span></div>');
            }
            
            const dragHandle = box.find('.drag-handle');
            
            dragHandle.on('mousedown', function(e) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                
                const boxPosition = box.position();
                initialX = boxPosition.left;
                initialY = boxPosition.top;
                
                // Prevent text selection while dragging
                e.preventDefault();
                
                $(document).on('mousemove.drag', function(e) {
                    if (!isDragging) return;
                    
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    
                    const newLeft = initialX + deltaX;
                    const newTop = initialY + deltaY;
                    
                    // Keep box within viewport
                    const maxLeft = $(window).width() - box.outerWidth();
                    const maxTop = $(window).height() - box.outerHeight();
                    
                    box.css({
                        'left': Math.max(0, Math.min(newLeft, maxLeft)) + 'px',
                        'top': Math.max(0, Math.min(newTop, maxTop)) + 'px',
                        'right': 'auto'
                    });
                });
                
                $(document).on('mouseup.drag', function() {
                    isDragging = false;
                    $(document).off('mousemove.drag');
                    $(document).off('mouseup.drag');
                });
            });
        },
        hover_span(e) {
            // Handle bidirectional hover - highlight document spans when hovering annotation list
            if (this.boundary_editing_mode) {
                return;
            }
            
            // Handle both Vue events and jQuery delegated events
            const target = e.currentTarget || e.target;
            const category = target.dataset ? target.dataset.category : $(target).data('category');
            const id = target.dataset ? target.dataset.id : $(target).data('id');
            
            if (!category || !id) return;
            
            // Find all matching spans in the document
            let spans = $(`.${category}[data-id='${id}']`);
            let below_spans = $(`.${category}_below[data-id='${id}']`);
            
            // Determine color based on whether it has annotations
            let color_code, color_class;
            const real_id = id.split("-")[1];
            const edit = this.hits_data[this.current_hit - 1].edits.find(
                e => e.category === category && e.id === parseInt(real_id)
            );
            
            if (edit && !this.hasAnnotation(edit)) {
                color_code = `bg-${category}-light`;
                color_class = "rgba(173, 197, 250, 1.0)";
            } else {
                color_code = `bg-${category}`;
                color_class = "rgba(33, 134, 235, 1.0)";
            }
            
            // Add highlight to document spans
            spans.addClass(`white ${color_code}`);
            below_spans.addClass(`white ${color_code}`);
            below_spans.removeClass(`txt-${category} txt-${category}-light`);
            
            // Update lines color if applicable
            try {
                if (category === 'substitution' && this.lines[category] && this.lines[category][real_id]) {
                    this.lines[category][real_id].color = color_class;
                }
            } catch (e) { /* Handle error silently */ }
        },
        un_hover_span(e) {
            // Handle bidirectional hover - remove highlight from document spans
            if (this.boundary_editing_mode) {
                return;
            }
            
            // Handle both Vue events and jQuery delegated events
            const target = e.currentTarget || e.target;
            const category = target.dataset ? target.dataset.category : $(target).data('category');
            const id = target.dataset ? target.dataset.id : $(target).data('id');
            
            if (!category || !id) return;
            
            // Find all matching spans in the document
            let spans = $(`.${category}[data-id='${id}']`);
            let below_spans = $(`.${category}_below[data-id='${id}']`);
            
            // Determine color based on whether it has annotations
            let color_code, color_class;
            const real_id = id.split("-")[1];
            const edit = this.hits_data[this.current_hit - 1].edits.find(
                e => e.category === category && e.id === parseInt(real_id)
            );
            
            if (edit && !this.hasAnnotation(edit)) {
                color_code = "rgba(173, 197, 250, 0.4)";
                color_class = `txt-${category}-light`;
            } else {
                color_code = "rgba(33, 134, 235, 0.46)";
                color_class = `txt-${category}`;
            }
            
            // Remove highlight from document spans
            below_spans.addClass(color_class);
            spans.removeClass(`white bg-${category} bg-${category}-light`);
            below_spans.removeClass(`white bg-${category} bg-${category}-light`);
            
            // Update lines color if applicable
            try {
                if (category === 'substitution' && this.lines[category] && this.lines[category][real_id]) {
                    this.lines[category][real_id].color = color_code;
                }
            } catch (e) { /* Handle error silently */ }
        }
    },
    computed: {
        get_edits_html() {
            return {
                template: `<div id="edits_html" class="f4 lh-paras">${this.edits_html}</div>`,
                methods: {
                    annotate_edit: this.annotate_edit,
                    trash_edit: this.trash_edit,
                    hover_span: this.hover_span,
                    un_hover_span: this.un_hover_span,
                    edit_boundary: this.edit_boundary
                }
            }
        }
    },
    mounted() {
        // Set up event delegation for hover events on dynamically created elements
        const self = this;
        
        // Use event delegation on parent element that persists
        $(document).on('mouseenter', '#edits_html [data-category][data-id]', function(e) {
            // Stop event propagation to prevent multiple triggers
            e.stopPropagation();
            self.hover_span(e);
        });
        
        $(document).on('mouseleave', '#edits_html [data-category][data-id]', function(e) {
            // Stop event propagation to prevent multiple triggers
            e.stopPropagation();
            self.un_hover_span(e);
        });
    },
    created() {
        $(window).on("resize", this.reposition_lines);

        if ($('#sandbox').length) {
            $("#sandbox").on("scroll", this.reposition_lines);
            $("#sandbox").on("resize", this.reposition_lines);
            const sandboxObserver = new ResizeObserver(entries => {
                for (const e of entries) {
                    if (e.target.id === 'sandbox') { this.reposition_lines() }
                }
            });
            sandboxObserver.observe(document.getElementById('sandbox'));
        }
    },
    // destroyed() {
    //     window.removeEventListener("resize", this.reposition_lines);
    // },
}
</script>

<template>
    <component :is="get_edits_html"></component> 
</template>