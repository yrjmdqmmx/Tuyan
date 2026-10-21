// English task summaries, paired with the complete authored Chinese source contract.
// These summaries do not replace domain-specific requirements in canonicalSource.
const entries = `
method_framework|Show how research modules transform inputs into outputs.|Distinguish data flow, feedback and unverified contributions.
experimental_design|Show experimental units, allocation, treatments, controls and measurements.|Keep repeated measurements tied to the same unit; never invent sample sizes.
apparatus|Show connected physical components, interfaces and measurement paths.|Distinguish material, electrical and optical paths; label schematic scale.
mechanism|Explain the evidence chain connecting entities, actions and outcomes.|Separate activation, inhibition and transport; never turn association into causation.
anatomical|Locate organs or tissues using a specified species, view and orientation.|Verify left/right and anatomy; schematic proportions are not measurements.
chemical_reaction|Show structures, reagents, conditions and chemical transformations.|Verify bonding, charge and stereochemistry; yields require a source.
energy_diagram|Show states and barriers along a defined reaction coordinate.|A reaction coordinate is not time; separate qualitative and measured energies.
sbgn_pd|Describe biochemical state transformations using SBGN process-description semantics.|Keep entity pools, processes and modulation arcs distinct.
sbgn_af|Show signed influences between biological activities.|Activities are not material pools; influence is not substance conversion.
sbgn_er|Describe entity states, relationships and their regulation.|Do not interpret every relationship as a temporal process or database relation.
workflow|Show ordered actions, decisions, inputs, outputs and termination.|Label branch conditions and loop exits; identify parallel paths explicitly.
swimlane|Show responsibility and handoffs across participants in a workflow.|Assign every step to a participant; a lane is not a proportional time axis.
decision_tree|Show successive conditions leading to decision leaves.|Verify threshold sources and branch coverage; do not invent trained-model metrics.
state_transition|Show states and the events and guards that trigger transitions.|Nodes denote states, not actions; inspect self-loops and unreachable states.
sequence_diagram|Show message order between interacting participants.|Keep lifelines, synchronous calls, asynchronous messages and returns distinct.
dataflow|Show named data moving between processes, stores and external entities.|Balance decomposition inputs and outputs; data flow is not control order.
timeline|Place supported events and intervals in chronological order.|Disclose non-proportional spacing and missing intervals.
gantt|Show scheduled intervals and dependencies for named activities.|Verify start/end units and dates; dependencies must be supplied.
roadmap|Show planned milestones and dependencies across phases.|Distinguish plans from completed events and avoid invented dates.
system_architecture|Show system components, boundaries, layers and interfaces.|Separate deployment from logical structure and label interface directions.
neural_architecture|Show neural-network blocks, tensor flow and connections.|Check dimensions, shared weights and training/inference paths against the source.
entity_relationship|Show entities, attributes, keys and relationship cardinalities.|Keep database relationships distinct from biochemical entity relationships.
circuit|Show electrical components and their connections.|Use verified symbols and terminals; wire crossings do not imply junctions.
concept_map|Show named conceptual relationships, inclusion and dependencies.|Label relation types; proximity alone cannot express a relationship.
hierarchy|Show parent/child structure and levels.|Check multiple parents and cycles; size must not imply unsupported quantity.
network|Show nodes and explicitly supplied edges.|Distinguish edge direction and weight; layout distance is not measured similarity.
adjacency_matrix|Show pairwise links between named row and column entities.|Preserve ordering and directedness; absence and missingness are different.
venn|Show set membership and intersections for a small number of sets.|Check members and intersections; area is not quantitative unless supported.
euler|Show existing set relationships and omit empty intersections.|Do not imply intersections that are absent from the source sets.
upset|Show exact set-intersection sizes with a membership matrix.|Distinguish exclusive intersections from inclusive set counts.
sankey|Show weighted flows between stages or entities.|Verify nonnegative weights and conservation or explicitly explain losses.
chord|Show weighted connections between groups around a circle.|Distinguish direction and reciprocal flows; arc and ribbon widths need consistent units.
causal_dag|Show a directed acyclic graph of stated causal assumptions.|Preserve acyclicity and distinguish hypotheses from demonstrated causation.
bar|Compare quantities across named categories.|Verify baseline, units, category order and any uncertainty intervals.
dotplot|Compare category values using position on a common scale.|Keep one consistent scale and identify groups and intervals.
stripplot|Show individual observations by group.|Jitter is for overlap only; do not change measurements or sample counts.
lollipop|Compare values using dots and baseline stems.|The stem baseline and numerical scale must be explicit.
dumbbell|Compare two paired values for each entity.|Keep endpoints paired and label their conditions and units.
forest|Show effect estimates with uncertainty intervals.|Verify effect scale, interval method and the correct null reference.
waterfall|Show sequential changes and their contribution to a total.|Reconcile starting value, changes, subtotals and final total.
radar|Compare multivariate profiles on radial axes.|Explain normalization and axis direction; polygon area is not a valid aggregate score.
histogram|Show observation frequencies across numerical bins.|Record bin edges, denominator and count versus density normalization.
density|Show an estimated continuous distribution.|Record bandwidth and normalization; do not imply unobserved precision.
boxplot|Show quantiles, spread and outliers for groups.|Specify quartile and whisker definitions; outliers are not automatically errors.
violin|Compare estimated distribution shapes.|Record bandwidth, sample size and width/area normalization.
raincloud|Combine raw observations, density and summary intervals.|Every layer must use the same observations and grouping.
ridgeline|Compare distributions across ordered groups.|Keep scale and normalization comparable; disclose vertical offsets.
ecdf|Show the empirical cumulative distribution of observations.|Verify monotonicity, denominator and handling of ties and missing values.
qq|Compare sample quantiles with reference quantiles.|Name the reference distribution and quantile convention; do not infer fit from aesthetics.
line|Show values over an ordered or continuous coordinate.|Preserve ordering and gaps; do not connect unrelated categories as continuous data.
area|Show magnitude over an ordered coordinate using filled areas.|Keep baselines and stacking explicit; area requires a meaningful coordinate scale.
streamgraph|Show changing composition through stacked, shifted areas.|Explain the baseline and preserve totals; negative values require a different encoding.
kaplan_meier|Estimate survival from event times and censoring.|Verify event coding, censoring, risk sets, intervals and estimator provenance.
cumulative_incidence|Show event incidence with competing risks.|Do not replace a competing-risk estimator with one minus Kaplan-Meier.
scatter|Show paired quantitative observations.|Verify pairing, units and transformations; correlation does not establish causation.
bubble|Show paired coordinates and a third quantity encoded by area.|Encode size by area rather than radius and provide a size legend.
heatmap|Show a matrix of numerical values using color.|Keep row/column identity, missing values and color normalization explicit.
bubble_matrix|Show matrix values using sized markers.|Use area consistently and separate missing cells from zero values.
binary_matrix|Show presence/absence or another explicitly binary state.|Verify the two allowed states and distinguish unknown values.
correlation_matrix|Show pairwise correlation coefficients.|Specify method, pairwise sample counts and missing-data handling; verify symmetry and range.
matrix_link_overlay|Combine a matrix with links representing a separate association analysis.|Do not confuse matrix coefficients with link statistics; align sample identities and methods.
parallel_coordinates|Show multivariate observations across parallel axes.|Explain normalization, axis direction and ordering; preserve row identity.
ordination|Show coordinates from a specified dimension-reduction or ordination method.|Keep PCA, PCoA, NMDS, CCA, RDA, UMAP and t-SNE interpretations separate.
pie|Show nonnegative parts of one defined total.|Verify the denominator and total; do not mix independent percentages.
treemap|Show hierarchical quantities through nested rectangle areas.|Verify parent totals and area encoding; color and area need separate legends.
circle_packing|Show hierarchical quantities using nested circles.|Check parent/child membership and area semantics; empty space is not quantity.
rose|Show values across radial categories or angular bins.|Explain whether radius or area encodes magnitude and keep angular bins explicit.
alluvial|Show weighted category transitions across stages.|Preserve cohort totals and identity; link widths require actual transition counts.
geological_section|Show geological layers, structures and orientation along a section.|Label scale and vertical exaggeration; do not invent subsurface evidence.
point_map|Locate observations using known coordinates and a projection.|Validate coordinate reference systems and distinguish location from magnitude.
choropleth|Show regional values on verified geographic boundaries.|Use appropriate denominators and explicit joins; missing regions are not zero.
contour|Show equal-value lines or regions over a sampled field.|Document interpolation, units and unsupported spatial gaps.
vector_field|Show vector direction and magnitude over coordinates.|Verify coordinate frame and component units; arrow scaling must be explained.
volcano|Show effect sizes against transformed significance values.|Verify effect definition, logarithm, adjustment method and thresholds; never fabricate P values.
ma_plot|Show effects or log ratios against mean abundance.|Verify normalization, effect direction and zero-value handling.
enrichment|Show enrichment estimates for named terms.|Verify background, counts, adjustment method and significance provenance.
gene_track|Show genomic features along defined coordinates.|State genome assembly, coordinate convention, strand and interval boundaries.
protein_domain|Show annotated domains on protein coordinates.|Verify accession, sequence length, residue numbering and annotation sources.
motif_logo|Show sequence-position composition or information content.|Specify alphabet, alignment, background and height units.
genome_circos|Show genomic intervals and links around circular tracks.|Preserve assembly, chromosome order, coordinates and link semantics.
synteny|Show corresponding genomic blocks or genes between sequences.|Verify coordinate systems, orientation and homology evidence.
phylogenetic|Show an inferred or supplied evolutionary tree.|Keep topology, rooting, branch-length meaning and support values traceable.
dendrogram|Show a clustering tree.|Specify distance and linkage; branch height is not evolutionary time.
roc|Show true-positive versus false-positive rates over thresholds.|Verify positive class and validation data; calculate AUC from evidence, not appearance.
pr_curve|Show precision versus recall over thresholds.|Report class prevalence; average precision and trapezoidal AUC are not interchangeable.
confusion_matrix|Show observed versus predicted class counts.|Label axis orientation and normalization denominators; reconcile totals.
calibration|Compare predicted probabilities with observed outcomes.|Record bin boundaries and counts; uncertainty intervals require a method.
bland_altman|Compare paired measurement differences and their means.|Verify difference direction and limits-of-agreement method; correlation is not agreement.
funnel_meta|Show study effects versus precision.|State effect scale and method; asymmetry alone does not prove publication bias.
comparison|Compare structural differences across common dimensions.|Use consistent visual grammar; unsupported differences must not be invented.
multipanel|Compose different figure types into a coherent multi-panel figure.|Apply each panel's own input and review contract; share legends only for matching semantics.
small_multiples|Repeat one figure type across groups or conditions.|Keep type and sampling consistent; shared and independent scales must be explicit.
`.trim().split('\n');

export const CATEGORY_ENGLISH = Object.fromEntries(entries.map(line => {
  const [id, description, check] = line.split('|');
  return [id, { description, requiredChecks: [check, 'Verify every required input and record missing evidence explicitly.', 'Compare the actual rendered artifact with source terminology, labels, units and the full type contract.'] }];
}));
