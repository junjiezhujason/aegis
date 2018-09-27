# Python Documentation

### server/dagraph.py

```python
class BaseNode(object):
    """ Data structure associated with a basic node

    Attributes:
        id (int): the global node id
        cid (int): the context node id
        children (list of int): the list of child nodes in terms of global node ids
        parents (list of int): the list of parent nodes in terms of global node ids
        n_parents (int): the number of parent nodes
        n_children (int): the number of children nodes
        n_ancestors (int): the number of ancestral (recursive parent) nodes
        n_descendents (int): the number of descendent (recursive children) nodes
        root (bool): whether or not the node is a root
        leaf (bool): whether or not the node is a leaf

    """

class Node(BaseNode):
    """ Graph layout node which inherits the BaseNode object.

    Attributes:
        name (str): the name annotation of the node, such as "GO:...."
        weight (int): the number of gene annotations
        depth (int): the longest distance from the roots
        height (int): the longest distance from the leaves
        root_distance (int):
        depth_order: int
        height_order: int
        flex: int
        flex_order: int
        queried: bool

    """
    def get_position_info(self):
        """ Create a dictionary of depth, height and flex x,y coordinates

        Args:
            None

        Returns:
            dict: the dictionary with x,y, coordinates under different views

        """

class Link(object):
    """ Data structure for a link

    Attributes:
        source (:obj:Node): the parent node
        target (:obj:Node): the child node

    """

class DAGraph(object):
    """ Data structure for a directed cyclic graph

    Attributes:
        nodes: a list of Node objects
        links: a list of Link objects
        roots: a list of node ids
        leaves: a list of leaf ids
        name_index_map: a map from a node name to its index in the `nodes` list
    """

    def filter_redundant_nodes(self, node_map=None, roots=None):
        """ Apply graph refinement to remove redundant nodes

        Args:
            node_map: a map of node ids to Node objects (optional)
            roots: a list of node ids to be the roots (optional)

        Returns:
            a map of node ids to Node objects keeping only non-redundant nodes

        """

    def create_map_to_context_nodes(self, node_context):
        """ Create a dictionary for the context nodes given a set of nodes
            Node objects that can encode the information of the updated
            height, depth, parents and children in the particular context
            defined by the nodes under selection. Relationships between nodes
            are inferred from the original DAG.

        Args:
            note_context: a dict of node ids mapping to anything

        Returns:
            dict : a map from node ids to new Node objects in the new context
            list: a list of root nodes in the new context

        """

    def update_intrinsic_levels(self, metric, node_map=None):
        """ Update the hight or depth attributes based on the optional context

        Args:
            metric: either "height" or "depth"
            node_map: a map from node ids to Node objects (optional)

        Returns:
            dict: a map from node ids to Node objects with updated attributes

        """

    def find_nodes_in_context(self, node_type, node_context, node_map=None):
        """ Find either roots or leaves in a node context

        Args:
            node_type: either "root" of "leaf"
            node_context: a dict or set of node ids
            node_map: a map from node ids to Node Objects (optional)

        Returns:
            list: node ids of the roots or the leaves

        """

    def find_neighbors(self,
                       node_index,
                       relation,
                       node_map = None,
                       restrict_set= None):
        """ Find the neighbors of a node within a context or restricted set

        Args:
            node_index: the node id
            relation: either "parents" or "children"
            node_map: a map from node ids to Node Objects (optional)
            restrict_set: a dict or set of node ids to restrict search

        Returns:
            a list of (restricted) neighboring node ids

        """

    def relation_search(self,
                        node_indices,
                        relation,
                        measure = "level",
                        node_map = None,
                        restrict_set = None):
        """ Perform restricted hierarchical search with a queue

        Args:
            node_indices : list of node ids as the anchor for the search
            relation: either "parents" or "children"
            measure: only "level" for now
            node_map: a map from node ids to Node Objects (optional)
            restrict_set: a dict or set of node ids to restrict search

        Returns:
            dict: related nodes ids (including the anchors) mapped to measure

        """

    def create_node_grouping(self,
                             node_list,
                             context_map,
                             restrict_set=None):
        """ Given a list of node ids, group their descendants and
            ancestors into independent subgraphs for better layout.
            There are always some nodes that are in more than one groups
            so we want to partition the nodes optimally or greedily

        Args:
            node_list: list of node_ids
            context_map:  a map from node ids to Node Objects (optional)
            restrict_set: a dict or set of node ids to restrict search

        Returns:
            list: list of set of node ids indicating grouping

        """

    def compute_focus_flex_level(self,
                                 focus_nodes,
                                 context_map,
                                 gap_break = 5000,
                                 block_merge = False):
        """ Compute the level of each node using the bubble float algorithm
            heuristic: larger gap_break yields fewer nodes per level

        Args:
            focus_nodes: a set (or list or dict) of node ids
            context_map: a map from node ids to Node Objects
            gap_break: the maximum node weight difference between two layers
            block_merge: (default as False for now)

        Returns:
            None (only updates the Node objects in the context map)

        """

    def create_level_node_map(self, node_levels, node_indices=None):
        """ Create a map from level number to the node ids

        Args:
            node_levels: a dictionary of node_index to levels (like a context)
            node_list: a list of nodes to compute the level map for

        Returns:
            dict: (level) -> [nidx_1, nidx_2, ...] (ordered list)

        """

    def compute_node_order(self, node_indices, level_type, context_map):
        """ Given node ids and level type, compute its level specific position
            Uses the the hierarchical ordering heuristic

        Args:
            node_indices: a list/dict/set of node ids
            level_type: "height", "depth" or "flex"
            context_map: a map from node ids to Node Objects with specified attr

        Returns:
            dict: a map from node ids to their order in the level

        """

class OrderedContext():

        # index all the nodes in a given context cntx_d.
        # cntx_id is a dictionary mapping full context node id to the node
        sorted_nodes = None
        sorted_index_map = None
        # fixed_groups: nodes organized in a particular fixed grouping
        # retrieve the maximum number of levels
        fixed_level_nodes = None

    def boundary_histogram_search(self, level_breaks):
        """
        For each level, determine the starting index in that level
        If the level breaks are [a, b, c], then the counts should be
        [|{x: x >= a}|, |{x: a > x >= b}|, |{x: b > x >= c}|]

        NOTE: duplicate boundaries may occur, in this case, this could
        be due to the fact that there are nodes of the same size in the
        focus graph. This edge case should be handled before (and possibly
        after) this funciton is called

        Parameters
        ----------
        leve_breaks: obj: `list`
            A descending list of node weights dividers, e.g., [18529, 75, 1]

        Returns
        -------
        set
            dict of node indices mapped to their measure

        """

    def generate_fixed_level_counts(self, lev_t):

    def bouyant_context_layout(self, focus_node_ids):

    def format_node_data(self, node):

    def output_lite_node_info(self):

    def output_plain_tested_graph(self):


class GOStat():
    def __init__(self):

    def set_test_attr_from_dict(self, in_dict):

    def get_test_attr_as_dict(self):

    def reverse_list_to_dict(self, in_list, do_sort = True):

    def setup_simulation_oneway(self, params):

    def get_simulation_gene_list(self):

    def get_node_meta_dict(self):

    def evaluate_rejections(self, rej_list, nonnull_type):

    def determine_non_null(self, gene_ids):

    def independent_fisher_tests(self, study_genes, verbose=False):

    def independent_binomial_tests(self, study_genes, alpha, verbose=False):

    def independent_global_tests(self, gene_pvalues, method="Simes"):

    def generate_node_pvals_from_gene_pvals(self,
                                            genes,
                                            pvals,
                                            test="simes",
                                            cutoff=None,
                                            verbose=False):
        # the order of the genes should correspond to the p-values
        # these genes must be entrez ids to match the gene_go_map
        # returns a list of p-values that correspond to the node ordering
        # in the Ordered Context


    def convert_gene_from_to(self, source, target, gene_list):

    def output_ground_truth_info(self, output_graph=False):

class GODAGraph(DAGraph):
    """ Data structure for the DAG for GO analysis

    Attributes:
        cache_dir: directory to store cache files
        sim_dir: directory to store simulation outputs
        name: name of the dag
        go_fname: directory to store the .pkl file for the object
        ontology: "biological_process","cellular_component" or "molecular_function"
        species: "human" or "mouse"
        version: time stamp for version control
        root: the root of the entire ontolgy
        go_gene_map: map from GO id to a list of entrez gene ids
        gene_conversion_map: map from entrez gene id to gene symbol
        go_annotation: map from GO:id to the full GO name
        gene_go_map: map from entrez gene id to a list of GO ids
        context_graph: OrderedContext() object
        context_params: a data structure of context parameters
        main_statistician: GOStat() object used for statistical testing
        gohelper: GOHelper() object used for downloading and parsing the GO

    """


    def setup_full_dag(self,
                       ontology,
                       species,
                       version,
                       use_cache=True):
        """ Integrates annotation information to the GO DAG
            This steps includes reading the annotation files for a particular
            root DAG and a particular species, and creating the core structure
            for context and focus selection. It also reads and writes the .pkl
            files used to load to populate the Object

        Args:
            ontology: "biological_process","cellular_component" or "molecular_function"
            species: "human" or "mouse"
            version: time stamp for version control
            use_cache : whether or not to store/use a cached version of the DAG

        Returns
        -------
            None

        """

    def setup_context_graph(self,
                            rule,
                            target_node_list,
                            min_w=1,
                            max_w=30000,
                            refine_graph=False,
                            store_context=True):
        """ Create a context graph based on anchor nodes and rules

        Args:
            rule (str): rule to build the context: "waypoint", "root" or "leaf"
            target_node_list (list):  a list of node names (GO:..) anchors
            min_w (int): the minimum number of genes that each node should have
            max_w (int):: the maximum number of genes that each node should have
            refine_graph (bool): whether or not to remove redundent GO terms

        Returns
        -------
            OrderedContext: the Object representing the context
            dict: the parameters needed to specify the context

        """


    def setup_focus_graph(self,
                          query_go_ids,
                          ordered_context=None,
                          rule="waypoint",
                          max_descendents=10,
                          force_all_descendents=False,
                          gap_break=5000,
                          grouped=True,
                          ):
        """ Create a focus graph based on anchor nodes and rules

        Args:
            query_go_ids: a list of GO ids
            ordered_context: the context graph OrderedContext()
            rule: rule to build the context: "waypoint", "root" or "leaf"
            max_descendents: threshold for a node to be prolific
            force_all_descendents: whether or not to include all descendants
            gap_break: break parameter for the buoyant layout
            grouped: whether or not to segregate the terms into groups

        Returns:
            dict: the data structure of the graph needed for front-send display

        """

    def restore_testing_configuration(self, job_id):
        """ Restores the testing configuration for the main_statistician,
            It also modifies the OrderedContext() based on the meta parameters

        Args:
            job_id: the id of the simulation job

        Returns:
            dict: all the parameters formatted for front-end rendering *

        """

    def output_node_power_matrix(self, job_id, test, multitest):
        """ Output a matrix of node vs regime with node rejection rate

        Args:
            job_id: the id of the simulation job
            test: the method to generate node p-values
            multitest: the multiple correction method

        Returns:
            dict: a json-like matrix format

        """

    def output_summary_stats(self, job_id, test_method, adjust_method):
        """ Output the summary statistics used for plotting

        Args:
            job_id: the id of the simulation job
            test_method: the method to generate node p-values
            adjust_method: the multiple correction method

        Returns:
            dict: a json-like matrix format for plotting

        """

    def launch_simulation_pipeline(self, job_id, cleanup=False):

    def output_non_null_go_terms(self, gene_symb_list):

    def output_general_info(self):

    def output_context_info(self, c_graph):

    def plot_full_result(self, data_dir):

```

### server/algorithms.py

```python

def count_inverions(A):

def inverse_cumsum(z):

def bubble_float_algo(nodes,
                      node_weights,
                      node_depths,
                      node_parents,
                      node_order=None,
                      gap_break=3,
                      block_merge=False):
```

# Javascript Documentation

