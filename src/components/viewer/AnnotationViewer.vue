<script setup>
import EditList from "./EditList.vue";
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
        'set_original_boundary',
        'set_boundary_editing_mode',
        'set_boundary_editing_edit',
        'boundary_editing_mode',
        'set_hit_box_config',
        'set_span_text',
        'set_span_indices'
    ],
    data() {
        return {}
    },
    methods: {
        add_an_edit() {
            if (this.editor_open) {
                $('#add_an_edit').slideUp(300);
                $(".add_button .icon-default").removeClass("open")
            } else {
                const addEditBox = $('#add_an_edit');
                
                // Check box_position configuration
                if (this.config.box_position === 'float') {
                    // Float mode - position at top right with draggable
                    this.positionFloatingBox(addEditBox);
                    this.makeBoxDraggable(addEditBox);
                } else {
                    // Fixed mode - original behavior at top of column
                    addEditBox.css({
                        'position': 'relative',
                        'top': 'auto',
                        'right': 'auto',
                        'left': 'auto',
                        'width': '100%'
                    });
                }
                
                addEditBox.slideDown(300);
                $(".add_button .icon-default").addClass("open")
            }
            this.set_editor_state(!this.editor_open)
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
            
            // Remove previous event handlers to avoid duplicates
            dragHandle.off('mousedown');
            
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
    },
    computed: {
        annotated_edits () {
            if (this.hits_data == null) { return 0 }
            let edit_data = this.hits_data[this.current_hit - 1]['edits']
            if (edit_data == null) { return 0 } 
            var count = 0
            edit_data.forEach(function(e) {
                if (e.hasOwnProperty('annotation') && e.annotation !== null) {
                    count++;
                }
            });
            return count
        },
        total_edits () {
            if (this.hits_data == null) { return 0 }
            let edit_data = this.hits_data[this.current_hit - 1]['edits']
            if (edit_data == null) { return 0 } 
            return edit_data.length
        },
    }
}
</script>

<template>
    <section>
        <div class="mt1 cf">
            <div class="fl w-80">
                <p class="f3 annotation-label ttu">{{ config.interface_text.annotation_viewer.header }} (<span v-if="!config.disable || !Object.values(config.disable).includes('annotation')">{{ annotated_edits }}/{{ total_edits }}</span><span v-if="config.disable && Object.values(config.disable).includes('annotation')">{{ total_edits }}</span>)</p>
            </div>
            <div class="fl w-20 tr">
                <p @click="add_an_edit" class="add_button pa2 br-pill-ns ba bw1 grow" :class="{'disabled': config.disable && Object.values(config.disable).includes('selection')}">
                    <i class="fa-solid fa-plus fa-1-5x icon-default pointer mr2"></i>
                    <span class="f4">{{ config.interface_text.buttons.add_edit_label }}</span>
                </p>
            </div>
        </div>
        <div>
            <EditList v-bind="$props" :config="config" />
        </div>
        <div id="hits-data" class="mt1 dn">{{ hits_data }}</div>
    </section>
</template>