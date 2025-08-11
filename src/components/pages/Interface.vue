<script setup>
  import AnnotationEditor from "../editor/AnnotationEditor.vue";
  import AnnotationViewer from "../viewer/AnnotationViewer.vue";
  import CommentBox from "../common/CommentBox.vue";
  import Instructions from "../common/Instructions.vue";
  import HitBox from "../hitbox/HitBox.vue";

  import tinycolor from 'tinycolor2';
  import _ from 'lodash';
  import { COLORS } from '../../assets/js/constants.js';
</script>

<script>
  export default {
    data() {
      return {
        total_hits: 0,
        current_hit: 1,
        hits_data: null,
        config: null,
        edits_dict: {},
        lines: {},
        selected_edits: {},

        editor_open: false,
        selected_edits_html: '',
        annotating_edit_span_category_id: null,

        hit_box_config: undefined,
        selected_state: undefined,
        annotating_edit_span: undefined,
        
        set_hit: this.set_hit,
        set_hits_data: this.set_hits_data,
        set_edits_dict: this.set_edits_dict,
        set_lines: this.set_lines,
        set_span_text: this.set_span_text,
        set_span_indices: this.set_span_indices,
        set_span_category: this.set_span_category,
        set_edit_html: this.set_edit_html,
        set_selected_edits: this.set_selected_edits,
        set_hit_box_config: this.set_hit_box_config,
        set_editor_state: this.set_editor_state,
        set_annotating_edit_span_category_id: this.set_annotating_edit_span_category_id,
        set_annotating_edit_span: this.set_annotating_edit_span,

        refresh_interface_edit: this.refresh_interface_edit,

        instructions_open: false,
        toggle_instructions: this.toggle_instructions,
        
        boundary_editing_mode: false,
        boundary_editing_edit: null, // stores {category, id, type: 'source'|'target'}
        original_boundary: null,
        set_boundary_editing_mode: this.set_boundary_editing_mode,
        set_boundary_editing_edit: this.set_boundary_editing_edit,
        set_original_boundary: this.set_original_boundary,
      }
    },
    props: [
      'input_data',
      'consumed_config',
      'highlight'
    ],
    watch: {
      input_data() {
        this.consume_data()
      },
      consumed_config() {
        this.consume_config()
      }
    },
    methods: {
        consume_data() {
          let data = _.cloneDeep(this.input_data.data);
          this.set_hits_data(data)
          this.set_hit(1)
        },
        consume_config() {
          let new_config;
          if (this.consumed_config.hasOwnProperty('consumed_config')) {
            new_config = _.cloneDeep(this.consumed_config.consumed_config)
          } else if (this.consumed_config.hasOwnProperty('config')) { 
            new_config = _.cloneDeep(this.consumed_config.config)
          } else {
            new_config = _.cloneDeep(this.consumed_config)
          }
          this.config = new_config
          
          if (this.config.template_label) {
            $('title').text(this.config.template_label);
          }
        },
        set_hit(hit_num) {
          if (hit_num != this.current_hit && this.config.adjudication) {
            $(`.circle-${hit_num}`).click()
          }
          this.current_hit = hit_num;
        },
        set_hits_data(hit_data) {
            hit_data.forEach(o => o.edits = o.edits || []);
            hit_data.forEach((o, idx) => { o._thresh_id = idx + 1; });
            this.hits_data = hit_data;
            this.total_hits = hit_data.length;
        },
        set_edits_dict(edits_dict) {
            this.edits_dict = edits_dict;
        },
        set_span_text(text, type) {
          if (type == "source") {
            this.selected_state.source_span = text;
          } else if (type == "target") {
            this.selected_state.target_span = text;
          }
        },
        set_span_indices(indices, type) {
          if (type == "source") {
            this.selected_state.source_idx = indices;
          } else if (type == "target") {
            this.selected_state.target_idx = indices;
          }
        },
        set_span_category(category, type) {
          if (type == "source") {
            this.selected_state.source_category = category;
          } else if (type == "target") {
            this.selected_state.target_category = category;
          }
        },
        set_edit_html(html) {
          this.selected_edits_html = html;
        },
        set_selected_edits(edits) {
          this.selected_edits = edits;
        },
        refresh_interface_edit() {
          const DEFAULT_HIT_BOX_CONFIG = {
            enable_select_source_sentence: false,
            enable_select_target_sentence: false,
            enable_multi_select_source_sentence: false,
            enable_multi_select_target_sentence: false,
          }
          const DEFAULT_SELECTED_STATE = {
            source_span: '',
            source_idx: [],
            source_category: '',
            target_span: '',
            target_idx: [],
            target_category: '',
            split: '',
            split_id: null
          }
          const DEFAULT_ANNOTATING_EDIT_SPAN = {
            source: '',
            target: '',
            composite: ''
          }

          this.selected_edits = []
          this.selected_edits_html = ""
          this.selected_state = DEFAULT_SELECTED_STATE
          this.hit_box_config = DEFAULT_HIT_BOX_CONFIG
          this.annotating_edit_span = DEFAULT_ANNOTATING_EDIT_SPAN
        },
        set_hit_box_config(config) {
          this.hit_box_config = config;
        },
        set_editor_state(state) {
          this.editor_open = state;
        },
        set_annotating_edit_span_category_id(id) {
          this.annotating_edit_span_category_id = id;
        },
        set_annotating_edit_span(data, sent_type=null) {
          if (sent_type == 'source') {
            this.annotating_edit_span.source = data;
          } else if (sent_type == 'target') {
            this.annotating_edit_span.target = data;
          } else if (sent_type == 'composite') {
            this.annotating_edit_span.composite = data;
          } else {
            console.warn(`Invalid sent_type : ${sent_type}`)
          }
        },
        set_lines(lines) {
          this.lines = lines;
        },
        set_boundary_editing_mode(mode) {
          this.boundary_editing_mode = mode;
        },
        set_boundary_editing_edit(edit) {
          this.boundary_editing_edit = edit;
        },
        set_original_boundary(boundary) {
          this.original_boundary = boundary;
        },
        toggle_instructions() {
          this.instructions_open = !this.instructions_open;
        },
        remove_selected(category, start, end) {
          // This method will be called by the global removeSelected function
          // Call the HitBox component's remove_selected method directly
          if (this.$refs.hitBox && this.$refs.hitBox.remove_selected) {
            this.$refs.hitBox.remove_selected(category, start, end);
          } else {
            console.error('HitBox ref or remove_selected method not found');
          }
        },
        compile_style() {
          if (!this.config.hasOwnProperty('edits')) { return }

          // Compile color overrides

          let css = ``
          for (const edit of this.config.edits) {
            let color = edit.color
            if (COLORS.hasOwnProperty(color)) {
              color = COLORS[color]
            }

            let light_color = tinycolor(color).lighten(25).toHexString();
            
            css += `
              :root { --${edit.name}: ${color}; --${edit.name}-light: ${light_color}; }
              .border-${edit.name} { border-bottom: 3px solid ${color}; }
              .border-${edit.name}-all { border: 2px solid ${color}; }
              .bg-${edit.name} { background-color: ${color}; }
              .txt-${edit.name} { color: ${color}; }
              .bg-${edit.name}-light { background-color: ${light_color}; }
              .border-${edit.name}-light { border-bottom: 3px solid ${light_color}; }
              .border-${edit.name}-light-all { border: 2px solid ${light_color}; }
              .txt-${edit.name}-light { color: ${light_color}; }
              .checkbox-tools-yes-no:checked + label.question-${edit.name},
              .checkbox-tools:checked + label.question-${edit.name},
              .checkbox-tools:checked + label.txt-${edit.name}{
                border: 2px solid var(--${edit.name});
              }
              .select-color-${edit.name}::selection { background: ${light_color} !important; }
            `
          }

          // Compile font size overrides
          if (this.config.font_size) {
            if (this.config.font_size.source) {
              css += `#source-sentence { font-size: ${this.config.font_size.source}px; }`
            }
            if (this.config.font_size.target) {
              css += `#target-sentence { font-size: ${this.config.font_size.target}px; }`
            }
          }

          return css
        },
        isAdjacent() {
          return this.config.hasOwnProperty('display') && Object.values(this.config.display).includes('side-by-side')
        },
        getCircleClass(n) {
          let classes = [`circle-${n}`];
          if (n === this.current_hit) {
            classes.push('circle-active');
          }
          return classes.join(' ');
        },
        getChecklistDefinition(item) {
          // Complete definitions for all checklist items
          const definitions = {
            "Filing Date": "The date the case was initially filed with the court",
            "Cause of Action": "e.g., a statute (e.g., 42 USC 1983) or a case (e.g., Ex Parte Young)",
            "Statutory or Constitutional Basis for the Case": "A case can either be based on a statute or a provision of the Constitution. For constitutional cases, refer to the specific clause and amendment (e.g., 'the plaintiffs alleged violations of the Fourteenth Amendment's Equal Protection Clause')",
            "Remedy Sought": "e.g., declaratory judgment, injunctive relief, monetary damages",
            "Type of Counsel": "Private, legal services, ACLU, etc.",
            "First and Last name of Judge": "e.g., Judge John Smith",
            "All Reported Opinions Cited with Shortened Bluebook Citation": "Use shortened Bluebook citation format (e.g., '2020 WL 4218003'). No need to include case name, court, or date unless helpful",
            "Class Action or Individual Plaintiffs": "If there are class action plaintiffs the summary should say it's a class action; if there are individual plaintiffs it can just describe the plaintiffs",
            "Related Cases Listed by Their Case Code Number": "Other cases referenced or connected to this case",
            "How Long Decrees will Last": "Duration or expiration date of court orders",
            "Date of Settlement": "When the settlement agreement was reached",
            "How Long Settlement will Last": "Duration or expiration date of settlement terms",
            "Whether the Settlement is Court-enforced or Not": "If the court retains jurisdiction to enforce the settlement",
            "Name of the Monitor": "Court-appointed monitor or special master overseeing compliance",
            "Appeal": "Whether the case was appealed, to which court, and the result",
            "Who are the Parties": "Use specific terms like 'The city' or 'The parents' rather than general terms like 'The defendant' or 'The plaintiffs'",
            "Consolidated Cases Noted": "Cases that were combined with this case for joint proceedings",
            "Dates of All Decrees": "When court orders or decrees were issued",
            "Factual Basis of Case": "The underlying facts and evidence supporting the legal claims",
            "Note Important Filings": "Note motions for temporary restraining orders or preliminary injunctions, motions to dismiss, motions for summary judgment, etc.",
            "Significant Terms of Decrees": "The substance of what the judge orders the defendants to do",
            "Significant Terms of Settlement": "The substance of what the defendants agree to do",
            "Monitor Reports": "Summary of monitor's findings on compliance with court orders, including which terms are being complied with",
            "Trials": "Note if the case went to trial, including trial dates and outcomes",
            "Court Rulings": "Rulings on motions to dismiss, summary judgment, preliminary injunctions, class certification, and other significant filings",
            "Disputes Over Settlement Enforcement": "Any subsequent disputes about compliance with settlement terms"
          };
          return definitions[item] || 'Definition not available';
        },
        downloadFile() {
          // Implement download functionality
          if (this.$refs.hitBox && this.$refs.hitBox.file_download) {
            this.$refs.hitBox.file_download();
          }
        },
        uploadFile(event) {
          // Implement upload functionality
          if (this.$refs.hitBox && this.$refs.hitBox.file_upload) {
            this.$refs.hitBox.file_upload(event);
          }
        },
        submit_crowsource() {
          // Implement crowdsource submission
          if (this.$refs.hitBox && this.$refs.hitBox.submit_crowsource) {
            this.$refs.hitBox.submit_crowsource();
          }
        }
    },
    updated() {
      $('#custom_style').html(`<style>${this.compile_style()}</style>`)
      $(`#circle-${this.current_hit}`).addClass('circle-active');
    }, 
    mounted() {
      this.consume_data()
      this.consume_config()
    },
    created() {
      this.consume_config()
      this.refresh_interface_edit()
    }
  }
  
</script>

<template>
  <div v-if="config != null" class="container mb0 card-body" v-bind:class="{ 'w-100 w-adjacent': isAdjacent(), 'w-65': !isAdjacent() }">
    <div class='custom_style' id='custom_style'>Custom style has not loaded!</div>
    <div v-if="highlight" class="tc f3 b mb3 mt3 adjudication-highlight">
      {{ config.interface_text.adjudication.highlight_label }}
    </div>
    <main v-if="isAdjacent()" class="side-by-side-layout">
      <!-- Fixed top section spanning both columns -->
      <div class="top-section-fixed">
        <Instructions v-bind="$data" :config="config" />
        
        <!-- Navigation header from HitBox -->
        <div class="cf mt1 hit-header">
          <div class="tc f3 mt1 hit-selector">
            <button @click="set_hit(Math.max(1, current_hit - 1))" :disabled="current_hit <= 1" class="mid-gray br-100 pa1 bw0 bg-near-white pointer prev-next-btns" :class="{'o-50': current_hit <= 1}">&nbsp;&lt;&nbsp;</button>
            {{ config.interface_text.hit_box.hit_label }} <span>{{ current_hit }}</span> / <span>{{ total_hits }}&nbsp;</span>
            <button v-if="!(config.crowdsource && current_hit == total_hits)" @click="set_hit(Math.min(total_hits, current_hit + 1))" :disabled="current_hit >= total_hits" class="mid-gray br-100 pa1 bw0 bg-near-white pointer prev-next-btns" :class="{'o-50': current_hit >= total_hits}">&nbsp;&gt;&nbsp;</button>
            <button v-else @click="submit_crowsource()" class="ml2 pa1 ph3 br-pill-ns ba bw1 grow pointer crowdsource-submit">Submit</button>
          </div>

          <div class="hit-instructions">
            <button v-if="config.instructions && !config.prepend_instructions" @click="toggle_instructions()" class="pa2 ph3 br-pill-ns ba bw1 grow pointer hit-instructions-btn">
              <span class="f4">{{ config.interface_text.buttons.instructions_label }}</span>
            </button>
          </div>

          <div class="mr3 hit-browser">
            <div class="hit-browser-inner">
              <span v-for="n in total_hits" v-bind:key="'circle-' + n" v-bind:id="'circle-' + n" v-bind:class="getCircleClass(n)" @click="set_hit(n)" class="circle pointer"><span class="tooltiptext">{{n}}</span></span>
            </div>
          </div>

          <div class="fr hit-file-buttons">
            <div class="mt1 mr1 fr">
              <input type="button" id="download-btn" @click="downloadFile"/>
              <label class="file-upload file-download br-100 w2-5 h2-5 pointer" for="download-btn" :class="{'disabled': config.disable && Object.values(config.disable).includes('download')}"><i class="fa fa-arrow-down"></i></label>
            </div>

            <div class="mt1 mr2 ml2 fr">
              <input type="file" id="upload-btn" @change="uploadFile"/>
              <label class="file-upload br-100 w2-5 h2-5 pointer" for="upload-btn" :class="{'disabled': config.disable && Object.values(config.disable).includes('upload')}"><i class="fa fa-arrow-up"></i></label>
            </div>
          </div>            
        </div>
        
        <!-- Checklist Item Definition -->
        <div v-if="hits_data && hits_data[current_hit - 1] && hits_data[current_hit - 1].metadata" class="checklist-definition ba b--black-20 br2 pa3 bg-light-gray">
          <div class="f4 b mb2">
            <i class="fa fa-clipboard-check mr2" aria-hidden="true"></i>
            Current Checklist Item: 
            <span class="dark-blue">{{ hits_data[current_hit - 1].metadata.checklist_item }}</span>
          </div>
          <div class="f5 lh-copy">
            <strong>Definition:</strong> {{ getChecklistDefinition(hits_data[current_hit - 1].metadata.checklist_item) }}
          </div>
        </div>
      </div>
      
      <!-- Two column content below -->
      <div class="content-columns">
        <div class="left-column">
          <HitBox ref="hitBox" v-bind="$data" :config="config" :hide-header="true" />
        </div>
        <div class="right-column">
          <AnnotationEditor v-bind="$data" :config="config" :remove_selected="remove_selected" />
          <AnnotationViewer v-bind="$data" :config="config" />
        </div>
      </div>
    </main>
    
    <!-- Fallback for non-side-by-side layout -->
    <main v-else class="adjacent">
      <div class="selection-adjacent">
        <Instructions v-bind="$data" :config="config" />
        <HitBox ref="hitBox" v-bind="$data" :config="config" />
      </div>
      <div class="annotation-adjacent">
        <AnnotationEditor v-bind="$data" :config="config" :remove_selected="remove_selected" />
        <AnnotationViewer v-bind="$data" :config="config" />
      </div>
    </main>
  </div>
</template>

<style>
  @import '../../assets/css/index.css';
  @import '../../assets/css/selection.css';
  @import '../../assets/css/button.css';
  @import '../../assets/css/select_box.css';
  @import '../../assets/css/download_upload.css';
  @import 'https://unpkg.com/tachyons@4.10.0/css/tachyons.min.css';
  @import 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
  @import 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.7.2/animate.min.css';

  /* Side-by-side layout styles */
  .side-by-side-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .top-section-fixed {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: white;
    border-bottom: 1px solid #e5e5e5;
    padding: 16px 0;
    margin-bottom: 16px;
  }

  .checklist-definition {
    margin-top: 12px;
  }

  .content-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 32px;
    flex: 1;
    overflow: hidden;
  }

  .left-column {
    overflow-y: auto;
    padding-right: 16px;
  }

  .right-column {
    overflow-y: auto;
    padding-left: 16px;
  }

  /* Hide scrollbars in columns */
  .left-column::-webkit-scrollbar, 
  .right-column::-webkit-scrollbar {
    display: none;
  }

  .left-column, .right-column {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }
</style>
