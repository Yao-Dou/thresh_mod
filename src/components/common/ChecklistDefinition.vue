<script>
export default {
    props: ['hits_data', 'current_hit', 'config'],
    computed: {
        currentChecklistItem() {
            if (!this.hits_data || !this.hits_data[this.current_hit - 1]) {
                return null;
            }
            return this.hits_data[this.current_hit - 1].metadata?.checklist_item;
        },
        checklistDefinitions() {
            return {
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
        },
        currentDefinition() {
            if (!this.currentChecklistItem) {
                return null;
            }
            return this.checklistDefinitions[this.currentChecklistItem];
        },
        isLegalChecklistTask() {
            // Check if this is a legal checklist extraction task
            return this.config?.template_name === 'legal_checklist_extraction' || 
                   this.currentChecklistItem !== null;
        }
    }
}
</script>

<template>
    <div v-if="isLegalChecklistTask && currentChecklistItem" class="checklist-definition ba b--black-20 br2 pa3 mb3 bg-light-gray">
        <div class="f4 b mb2">
            <i class="fa fa-clipboard-check mr2"></i>
            Current Checklist Item: <span class="dark-blue">{{ currentChecklistItem }}</span>
        </div>
        <div class="f5 lh-copy">
            <strong>Definition:</strong> {{ currentDefinition || 'Definition not available' }}
        </div>
    </div>
</template>

<style scoped>
.checklist-definition {
    background-color: #f8f9fa;
}
</style>