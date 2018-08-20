#!/usr/bin/env python3
#title           :dagraph.py
#description     :DAG Data Structures and Algorithms for core computations
#author          :Junjie Zhu
#date            :20171128
#version         :0.1
#usage           :
#notes           :
#python_version  :3.6.0
#==============================================================================

import os
import time
import logging
from collections import deque, Counter
from statistics import median
import numpy as np
import scipy.stats as stats
from math import ceil, floor
import json
import pickle
import pandas as pd
# import multiprocessing as mp
# import matplotlib.pyplot as plt

from .algorithms import count_inverions, inverse_cumsum, bubble_float_algo
from .gohelper import GOHelper
from .stathelper import global_test_pvalue, multitest_rejections
from .stathelper import OnewaySimulator
# from .plothelper import plot_group_bars


logger = logging.getLogger(__name__)

import shutil
def cleanup_dir(cache_dir):
    if not os.path.isdir(cache_dir):
        assert 0, "{} does not exist!".format(cache_dir)

    trial_dir = os.path.join(cache_dir , "trials")
    if os.path.exists(trial_dir):
        # clear everything in the folder
        for the_file in os.listdir(trial_dir):
            file_path = os.path.join(trial_dir, the_file)
            if os.path.isfile(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
    else:
        # make the empty folder
        os.makedirs(trial_dir)

    # move the trials folders into it
    for folder in os.listdir(cache_dir):
        if folder.startswith("trial_"):
            file_path = os.path.join(cache_dir, folder)
            shutil.move(file_path, trial_dir)

    if (os.path.isfile(trial_dir + ".zip")):
        os.remove(trial_dir + ".zip")

    shutil.make_archive(trial_dir, 'zip', trial_dir)
    shutil.rmtree(trial_dir)

def save_data_to_file(data, fname, ftype):
    # double-check suffix
    sufx = fname.split(".")[-1]
    assert sufx == ftype, "Suffix '{}' does to match!".format(sufx)
    if ftype == "npy":
        np.save(fname, data)
    elif ftype == "csv":
        np.savetxt(fname, data, delimiter=',')
    elif ftype == "pkl":
        with open(fname, "wb") as outfile:
            pickle.dump(data, outfile,
                        protocol=pickle.HIGHEST_PROTOCOL)
    elif ftype == "json":
        with open(fname, "w") as outfile:
            json.dump(data, outfile)
    else:
        assert 0, "File type: {} not recognized".format(ftype)
    if ftype in ["npy", "csv"]:
        msg = "Data (shape {})".format(data.shape)
    else:
        msg = "Data (length {})".format(len(data))
    logger.debug("{} saved as: {}".format(msg, fname))

def load_data_from_file(fname, ftype):
    # double-check suffix
    sufx = fname.split(".")[-1]
    assert sufx == ftype, "Suffix '{}' does to match!".format(sufx)
    if ftype == "npy":
        data = np.load(fname)
    elif ftype == "csv":
        data = np.loadtxt(fname, delimiter=',')
    elif ftype == "pkl":
        with open(fname, "rb") as infile:
            data = pickle.load(infile)
    elif ftype == "json":
        with open(fname, "r") as infile:
            data = json.load(infile)
    else:
        assert 0, "File type: {} not recognized".format(ftype)
    if ftype in ["npy", "csv"]:
        msg = "Data (shape {})".format(data.shape)
    else:
        msg = "Data (length {})".format(len(data))
    logger.debug("{} loaded from: {}".format(msg, fname))

    return data

def flag_complete(data_dir, action, sufx=None):
    if sufx:
        flagfn = "_COMPLETE_{}".format(sufx)
    else:
        flagfn = "_COMPLETE"
    filename = os.path.join(data_dir, flagfn)
    if action == "add":
        open(filename, 'w').close()
    if action == "remove":
        try:
            os.remove(filename)
        except OSError:
            pass
    if action == "check":
        return os.path.exists(filename)

class BaseNode(object): # typically context-specific
    def __init__(self, id):
        self.id = id
        self.cid = id
        self.children = []
        self.parents = []
        self.n_parents = None
        self.n_children = None
        self.n_ancestors = None
        self.n_descendents = None
        self.root = False
        self.leaf = False
        # the full graph determines the depth/height
        self.depth = None # TODO: remove later
        self.height = None # TODO: remove later

class Node(BaseNode):
    def __init__(self, id, name=None):
        BaseNode.__init__(self, id)
        # primary attributes
        # self.id = id
        self.name = name
        self.weight = None
        self.queried = False
        # self.stat_info = {}

        # secondary attributes (used in context graphs)
        # self.root = False
        # self.leaf = False
        # self.children = []
        # self.parents = []
        # self.n_parents = None
        # self.n_children = None
        # self.n_ancestors = None
        # self.n_descendents = None
        self.root_distance = None
        # self.depth = None # TODO: remove later
        # self.height = None # TODO: remove later

        # group-specific information (used in focus graphs)
        self.group = None # TODO: remove later
        self.group_depth_order = None # TODO: remove later
        self.group_height_order = None
        self.group_flex_order = None
        self.depth_order = None
        self.height_order = None
        self.flex = 0
        self.flex_order = 0
        # self.level = None
        # self.level_order = None
        # self.group_level_order = None # TODO: remove later

    def get_position_info(self):
        info =  {
            "depth": {
                "x" : self.depth_order,
                "y" : self.depth
            },
            "height": {
                "x" : self.height_order,
                "y" : self.height
            },
            "flex": {
                "x" : self.flex_order,
                "y" : self.flex
            }
        }
        return info

    def print_secondary_attributes(self):
        logger.debug(self.__dict__)

class Link:
    def __init__(self, source, target):
        self.source = source # Node object
        self.target = target # Node object

# base class
class DAGraph(object):
    def __init__(self):
        self.nodes = [] # list of Node objects
        self.links = [] # maybe remove in the future as it is not used now
        self.roots = []
        self.leaves = []
        self.name_index_map = {}

    # general utilities to retreive information
    def get_node_by_name(self, name):
        """ Get the node object by name
        """
        return self.nodes[self.name_index_map[name]]

    def trim_dag_by_weight(self, min_w = 1, max_w = 30000):
        # returns a set of node indices in a dag
        # note that the trim set should not require rewiring of edges
        # if the weights have hiearchical ordering
        trim = set([n.id for n in self.nodes if min_w <= n.weight <= max_w])
        logger.info("Trimmed {} nodes to {}".format(len(self.nodes),len(trim)))
        return trim

    def filter_redundant_nodes(self, node_map=None, roots=None):
        # node map maps node id (a subset of nodes in the original indices)
        if not node_map:
            node_map = {i : n for i, n in enumerate(self.nodes)}
        # search for all the root nodes
        if roots:
            root_ids = roots
        else:
            root_ids = []
            for node_i in node_map:
                if len(node_map[node_i].parents) == 0:
                    root_ids.append(node_i)
        logger.info("Applying redundant node filtering on {} roots".format(len(root_ids)))
        # create the proecure top-down using a queue
        queue = deque(root_ids)
        curr_level = 0
        while (queue): # non-empty queue
            curr_cnt = len(queue)
            while (curr_cnt > 0):
                node_i = queue.popleft() # the parent node
                if node_i not in node_map:
                    # the node has been removed due to redundency
                    curr_cnt -= 1
                    continue
                curr_node = node_map[node_i]
                # the parent only has one child, and has the same weight
                if len(curr_node.children) > 0 :
                    max_child_w = max([node_map[child_i].weight for child_i in curr_node.children ])
                else:
                    max_child_w = 0
                # the maximum weight among the child is equal to the node weight
                # then, let the child inherit all the parents' ancestors
                if curr_node.weight == max_child_w:
                    logger.debug("")
                    logger.debug("Handling node: {}".format(node_i))
                    logger.debug("all children: {}".format(curr_node.children))
                    for child_i in curr_node.children:
                        child_node = node_map[child_i]
                        logger.debug("  -----------------------------")
                        logger.debug("  child {} inherreting from {}:"
                            .format(child_i, node_i))
                        logger.debug("  before: {}".format(child_node.parents))
                        # inherent all the current node's parents
                        ss = set(child_node.parents) | set(curr_node.parents)
                        ss.remove(node_i) # remove the node to be removed
                        child_node.parents = sorted(list(ss))
                        logger.debug("  after: {}".format(child_node.parents))
                    # all parents need to replace this child with the new child
                    logger.debug("all parents: {}".format(curr_node.parents))
                    for parent_i in curr_node.parents:
                        parent_node = node_map[parent_i]
                        logger.debug("  -----------------------------")
                        logger.debug("  parent {} inherreting from {}:"
                            .format(parent_i, node_i))
                        logger.debug("  before: {}".format(parent_node.children))
                        ss = set(parent_node.children) | set(curr_node.children)
                        ss.remove(node_i) # remove the node to be removed
                        parent_node.children = sorted(list(ss))
                        logger.debug("  before: {}".format(parent_node.children))
                    # remove the key from the dictoinary in this context
                    node_map.pop(node_i)
                for child_i in curr_node.children:
                    queue.append(child_i)
                curr_cnt -= 1
            curr_level += 1
        # logger.debug("Total number of levels searched: {}".format(curr_level))
        # return node_index_dict
        return node_map

    def create_map_to_context_nodes(self, node_context):
        """
        Create a dictionary for the context nodes given a set of nodes

        This function takes a set of node indices as inputs and outputs a
        dictionary mapping from node indices in the orignal graph to light
        weight Node objects that can encode the information of the updated
        height, depth, parents and children in the particular contexted
        defined by the nodes under selection. Relationships between nodes are
        inferred from the original DAG

        Parameters
        ----------
        nodes : :obj:`dict` of :obj:`int` mapped to :obj:`Node`
            The node indices in the total graph that defines a context

        Returns
        -------
        dict
            a dictionary mapping from node indices to context Node objects

        """
        cntx = set(node_context)
        logger.debug("Updating levels of {} context nodes".format(len(cntx)))
        roots = self.find_nodes_in_context("root", cntx)
        updated_d = self.relation_search(roots, "children", restrict_set=cntx)
        leaves = self.find_nodes_in_context("leaf", cntx)
        updated_h = self.relation_search(leaves, "parents", restrict_set=cntx)
        assert set(updated_d) == cntx, "Inconsistent context output"
        assert set(updated_h) == cntx, "Inconsistent context output"
        # return updated_d, updated_h
        # output a node context summary

        # node_index -> context_node
        # create new (lightweight) nodes with only secondary attributes
        # as they depend on the new context
        # dict from original_i to context_i
        # context_mapping = { orig_i : i for i, orig_i in enumerate(node_context)}
        cntx_nodes = { i : Node(i) for i in node_context }
        for n_index in cntx_nodes:
            parrs = self.find_neighbors(n_index, "parents",
                                        restrict_set=cntx)
            chils = self.find_neighbors(n_index, "children",
                                        restrict_set=cntx)
            cntx_node = cntx_nodes[n_index]
            # inheritted from the original parent node
            cntx_node.id = self.nodes[n_index].id
            cntx_node.name = self.nodes[n_index].name
            cntx_node.weight = self.nodes[n_index].weight
            # updated within the context
            cntx_node.height = updated_h[n_index]
            cntx_node.depth = updated_d[n_index]
            cntx_node.parents = parrs
            cntx_node.children = chils
        return cntx_nodes, roots

    def update_intrinsic_levels(self, metric, node_map=None):
        # node map maps node id (a subset of nodes in the original indices)
        if not node_map:
            node_map = {i : n for i, n in enumerate(self.nodes)}
        assert metric in ["height", "depth"], "{} metric invalid".format(metric)
        if metric == "height":
            relation = "parents"
            seed_type = "leaf"
        if metric == "depth":
            relation = "children"
            seed_type = "root"
        seeds = self.find_nodes_in_context(seed_type, set(node_map), node_map)
        level_map = self.relation_search(seeds, relation, node_map=node_map)
        for node_i in level_map:
            setattr(node_map[node_i], metric, level_map[node_i])
        return node_map

    def find_nodes_in_context(self, node_type, node_context, node_map=None):
        assert node_context, "Context cannot be empty"
        logger.debug("Searching for {} nodes in context".format(node_type))
        if node_type == "root":
            relation = "parents"
        elif node_type == "leaf":
            relation = "children"
        output_node_indices = []
        for n_index in node_context:
            neighs = self.find_neighbors(n_index, relation,
                                         node_map=node_map,
                                         restrict_set=node_context)
            if len(neighs) == 0:
                output_node_indices.append(n_index)
        assert output_node_indices, "Unexpected: no {} found".format(node_type)
        logger.debug("Found {} in context".format(len(output_node_indices)))

        return output_node_indices

    def find_neighbors(self,
                       node_index,
                       relation,
                       node_map = None,
                       restrict_set= None):
        if not node_map:
            node_map = self.nodes
        node = node_map[node_index]
        neighbors = getattr(node, relation)
        if restrict_set:
            return [i for i in neighbors if i in restrict_set]
        else:
            return neighbors

    # core search via a queue (superior to recursion)
    def relation_search(self,
                        node_indices,
                        relation,
                        measure = "level",
                        node_map = None,
                        restrict_set = None):
        """
        Perform hierarcical search with restrictions

        Parameters
        ----------
        node indices : obj:`list` of :obj:`int`
            The nodes to find descendents for
        relation: str
            The relationship attribute in Node to use (parents or children)
        measure: obj
            The value that is measured for each node in the output dict
        node_map: obj: `list` of obj:`Node` or `dict` of index to Nodes
            The list of Node objects that encode the search information
        restrict_set : obj:`list` or obj:`dict` of :obj:`int` (key)
            The context under which to search

        Returns
        -------
        set
            dict of node indices mapped to their measure

        """

        # the node indices and the node contexts are both w.r.t.
        # the node list (which is all available nodes by default)
        if not node_map: # overloaded notation with dict or list
            node_map = self.nodes

        if restrict_set: # limit search to a nodes in context
            found = [i for i in node_indices if i in restrict_set]
            assert found, "the search nodes are not in the node context"
            queue = deque(found)
        else:
            queue = deque(node_indices)

        curr_level = 0
        node_index_dict = {}
        while (queue): # non-empty queue
            # logger.debug("Current level: {}".format(curr_level))
            # logger.debug("- Number of nodes: {}".format(len(queue)))
            curr_cnt = len(queue)
            while (curr_cnt > 0):
                node_index = queue.popleft()
                if measure == "level":
                    node_index_dict[node_index] = curr_level
                for neighbor_index in getattr(node_map[node_index], relation):
                    if restrict_set: # limit search to a nodes in context
                        if neighbor_index in restrict_set:
                            queue.append(neighbor_index)
                    else:
                        queue.append(neighbor_index)
                curr_cnt -= 1
            curr_level += 1
        # logger.debug("Total number of levels searched: {}".format(curr_level))
        return node_index_dict

    # older code:
    def get_neighbors(self, node, relation):
        # nodes =  [self.nodes[node_idx] for node_idx in getattr(node, relation)]
        return set([node_idx for node_idx in getattr(node, relation)])


    def create_node_grouping(self,
                             node_list,
                             context_map,
                             restrict_set=None):
        """ Given a list of node indices, group their descendents and
            ancestors into indepdendent subgraphs for better layout.
            There are always some nodes that are in more than one groups
            so we want to partition the nodes optimally or greedily
        """
        # TODO: optimize the divide-and-merge in the future
        # partition nodes into node groups
        node_groups = []
        for n_index in node_list:
            # get all the connected nodes in the main graph
            descendents = set(self.relation_search([n_index], "children",
                                                node_map=context_map,
                                                restrict_set=restrict_set))
            ancestors = set(self.relation_search([n_index], "parents",
                                                node_map=context_map,
                                                restrict_set=restrict_set))

            node_groups.append(descendents.union(ancestors))
        # merge groups based on shared queried nodes
        for n_index in node_list:
            groups_to_merge = []
            for i_group, group in enumerate(node_groups):
                if group: # has not been merged yet
                    if n_index in group:
                        groups_to_merge.append(i_group)
            # merge the groups
            for idx, i_group in enumerate(groups_to_merge):
                if idx == 0:
                    set_list = [node_groups[i] for i in groups_to_merge]
                    node_groups[i_group] = set.union(*set_list)
                else:
                    node_groups[i_group] = None
        # finalize the node groups
        node_groups = [g for g in node_groups if g is not None]
        return node_groups


    def compute_focus_flex_level(self,
                                 focus_nodes,
                                 context_map,
                                 gap_break = 5000,
                                 block_merge = False):
        # Note it is better if context is in test_context
        # because we elimnate parent->children with same nodes
        # TODO: handle case where we can do this in full_context
        # TODO: in the future maybe it will be better for the user to
        # determine the focus level resolution
        # heuristic: larger gap_break when there are fewer nodes, smaller when larger
        # block merge creates more nodes in a shared layer (may be better for layout)

        logger.info("Computing focus graph levels in for a flexible view")

        # 1. format the inputs
        node_ids = [node_i for node_i in focus_nodes]
        node_weights = [context_map[node_i].weight for node_i in node_ids]
        node_depths = [context_map[node_i].depth for node_i in node_ids]
        node_parents = [[node_i for node_i in context_map[node_i].parents
                            if node_i in focus_nodes]
                                for node_i in node_ids]
        # 2. run the core algorithm
        logger.info("Running {} mode".format( "block" if block_merge else "node" ))
        layer_list = bubble_float_algo(node_ids,
                                       node_weights,
                                       node_depths,
                                       node_parents,
                                       gap_break = gap_break,
                                       block_merge = block_merge)
        logger.info("Number of flex levels: {}".format(len(layer_list)))
        # 3. append the node attribtues in context
        for layer, layer_nodes in enumerate(layer_list):
            for node_i in layer_nodes:
                context_map[node_i].flex = layer

        # TODO: layer_list could be used to send some meta information
        # to the output if necessary

    def focus_node_layout(self,
                          context_query,
                          context=None,
                          flex_layer=True,
                          gap_break = 5000):
        # context_query: set of query indices (anchor nodes)
        # translation needed for mapping to a new context
        # context: is a mapping from original indices to Node objects

        # focus nodes are nodes that are related to query nodes
        # here the nodes are grouped into multiple sets, then
        # their ordering is decided within a group prior to display
        # within "context" the node levels are already assigned

        if context is None: # use the self.nodes list to create the context map
            context = {i : n for i, n in enumerate(self.nodes)}
        # check and make sure query is in context

        groups = self.create_node_grouping(context_query, restrict_set=context)

        logger.info("Created {} groups in the focus graph".format(len(groups)))
        logger.debug(groups)
        # the focus nodes are the ones that will be output to a graph display
        focus_nodes = set.union(*groups)
        if flex_layer : # compute flexible layer type based on the focus node
            self.compute_focus_flex_level(focus_nodes,
                                          context,
                                          gap_break = gap_break)
            level_types = ["depth", "height", "flex"]
        else:
            level_types = ["depth", "height"]
        for level_type in level_types:
            logger.info("Generating layout for {} levels".format(level_type))
            logger.info("Number of node groups: {}".format(len(groups)))
            # a map from the focus nodes to their levels
            focus_node_level = {}
            for node_index in focus_nodes:
                context_node = context[node_index] # retrieve the Node object
                focus_node_level[node_index] = getattr(context_node, level_type)

            g_sizes = {i : 0 for i in range(len(groups))}
            g_widths = {i : 0 for i in range(len(groups))}
            for i_group, group in enumerate(groups):
                g_lev_map = self.create_level_node_map(focus_node_level,
                                                       node_indices=group)
                g_sizes[i_group] = sum([len(g_lev_map[l]) for l in g_lev_map])
                g_widths[i_group] = max([len(g_lev_map[l]) for l in g_lev_map])
            # pick the narrowest group as the starting point
            g_narrowest = 0
            min_width = len(focus_node_level)
            for i_group in g_widths.keys():
                width = g_widths[i_group]
                if width < min_width:
                    min_width = width
                    g_narrowest = i_group

            # key info to be updated for node group order and node ordering
            node_group_orders = {}
            node_orders = {}
            res_node_lev = focus_node_level.copy()
            curr_offset = 0
            while len(g_sizes) > 0:
                if len(g_sizes) == len(groups):
                    include_group = g_narrowest # first iteration
                else: # pick the group with the smallest group size
                    include_group = min(g_sizes, key = g_sizes.get)

                logger.debug("Including group: {}".format(include_group))

                old_group_node_ids =  groups[include_group]
                # move the nodes in the group into a new group
                n_to_order = []
                for node_id in old_group_node_ids:
                    if node_id in res_node_lev:
                        res_node_lev.pop(node_id, None)
                        n_to_order.append(node_id)
                gnord = self.compute_node_order(n_to_order, level_type, context)
                node_group_orders.update(gnord)

                # remove this group and recompute size of the remaining groups
                g_sizes.pop(include_group, None)
                for i_group in g_sizes: # consider the remaining groups
                    group = groups[i_group]
                    # the residual node level will account for removed nodes
                    g_lev_map = self.create_level_node_map(res_node_lev,
                                                           node_indices=group)
                    g_sizes[i_group] = sum([len(g_lev_map[l]) for l in g_lev_map])
                    g_widths[i_group] = max([len(g_lev_map[l]) for l in g_lev_map])

                # offset should be the size of the removed group plus old offset
                nord = { n : (gnord[n] + curr_offset) for n in gnord}
                curr_offset += g_widths[include_group]
                node_orders.update(nord)

            # TODO: maybe update later
            for node_id in node_orders:
                node = context[node_id]
                ord_attr = "{}_order".format(level_type)
                grp_ord_attr = "group_{}_order".format(level_type)
                setattr(node, ord_attr, node_orders[node_id])
                setattr(node, grp_ord_attr, node_group_orders[node_id])
            # for node_id in node_orders:
            #     print("{}\tlevel:{}\torder:{}".format(node_id,
            #           context[node_id].depth, context[node_id].depth_order))
        return focus_nodes

    def compute_group_width(self, node_levels):
        level_map = self.create_level_node_map(node_levels)
        return max( [len(level_map[l]) for l in level_map] )


    def create_level_node_map(self, node_levels, node_indices=None):
        # node_levels: a dictionary of node_index to levels (like a context)
        # node_list: a list of nodes to compute the level map for
        # return map: (level) -> [nidx_1, nidx_2, ...] (ordered list)
        level_map = {} # map: (level) -> [node1, node2, ...] (ordered list)
        if node_indices is None:
            node_indices = list(node_levels.keys())
        for node_id in node_indices:
            if node_id in node_levels:
                level = node_levels[node_id]
                if level not in level_map:
                    level_map[level] = []
                level_map[level].append(node_id)
        return level_map

    def compute_node_order(self, node_indices, level_type, context_map):

        node_levels = {i : None for i in node_indices }
        node_orders = {i : None for i in node_indices }
        for node_i in node_indices:
            node_levels[node_i] = getattr(context_map[node_i], level_type)
        # arbitrarily define an initial order
        level_map = self.create_level_node_map(node_levels)
        for level in level_map:
            for level_index, node_i in enumerate(level_map[level]):
                node_orders[node_i] = level_index
        if level_type == "height":
            reverse = True
        else:
            reverse = False
        self.hierarchical_reordering(node_orders, node_levels,
            relation = "parents", level_type = level_type,  reverse = reverse)
        self.hierarchical_reordering(node_orders, node_levels,
            relation = "children", level_type = level_type,  reverse = not reverse)

        return node_orders # , self.compute_group_width(node_levels)


    def hierarchical_reordering(self,
                                node_order,
                                node_levels,
                                relation = "parents",
                                level_type = "depth",
                                reverse = False):

        assert node_order.keys() == node_levels.keys(), "Nodes differ!"
        cntx = set(node_order) # context nodes

        # 1. re-sort the nodes by median parent position
        logger.debug("Generating median ordering...")
        level_map = self.create_level_node_map(node_levels)
        level_order = sorted(level_map.keys(), reverse=reverse)

        for i_level in range(len(level_order) - 1):
            curr_level = level_order[i_level]
            next_level = level_order[i_level + 1]
            logger.debug("Ordering level: {}".format(next_level))
            score = {} # score the nodes in the next level by median
            for node_i in level_map[next_level]:
                ns = self.find_neighbors(node_i, relation, restrict_set=cntx)

                neighbor_position = [node_order[n] for n in ns]
                # if the layer of the neighbor is really high then we want
                # to give this neighbor position a very high score

                if neighbor_position: # has neighbors
                    score[node_i] = np.mean(neighbor_position)
                else: # has no neighbors (make the score large!)
                    score[node_i] = len(node_order)

            # create a node ordering from the scoring
            sorted_node_id = sorted(score, key=score.get)
            for rank, node_id in enumerate(sorted_node_id):
                node_order[node_id] = rank


def jaccard_similarity(x, y):
    intersection_len = len(set.intersection(*[set(x), set(y)]))
    union_len = len(set.union(*[set(x), set(y)]))
    return intersection_len/float(union_len)


class OrderedContext():
    def __init__(self):
        # index all the nodes in a given context cntx_d.
        # cntx_id is a dictionary mapping full context node id to the node
        self.sorted_nodes = None
        self.sorted_index_map = None
        # fixed_groups: nodes organized in a particular fixed grouping
        # retrieve the maximum number of levels
        self.fixed_level_nodes = None

    def populate(self, cntx_d):
        # index all the nodes in a given context cntx_d.
        # cntx_id is a dictionary mapping full context node id to the node
        # in the ordered context, the nodes are
        # first sorted by their weight in desdending order
        # then they ties can be further ordered by ascending depth
        n_list = sorted(cntx_d.values(), key = lambda n: (-n.weight, n.depth))
        for cid, node in enumerate(n_list):
            node.cid = cid
        logger.debug("Sorted all context nodes, updated Node.cid for each node")
        self.sorted_nodes = n_list
        self.sorted_index_map = {n.id : n.cid for n in n_list}

        # fixed_groups: nodes organized in a particular fixed grouping
        # retrieve the maximum number of levels
        fixed_level_nodes = {}
        for view in ["depth", "height"]:
            n_levels = max([getattr(node, view) for node in n_list]) + 1
            fixed_level_nodes[view] = [ [] for i in range(n_levels) ]
        for cid, node in enumerate(n_list):
            for view in ["depth", "height"]:
                fixed_level_nodes[view][getattr(node, view)].append(cid)
        self.fixed_level_nodes = fixed_level_nodes

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
        snodes = self.sorted_nodes
        level_index = [None] * len(level_breaks)
        left = 0
        right = len(snodes) - 1
        for i, lev in enumerate(level_breaks):
            min_thresh = lev
            result = -1
            while (left <= right):
                mid = ( left + right ) // 2 # integer division
                if (snodes[mid].weight == min_thresh):
                    result = mid
                    left = mid + 1
                if (snodes[mid].weight < min_thresh):
                    right = mid - 1
                if (snodes[mid].weight > min_thresh):
                    left = mid + 1
            #     print(mid, left, right, result)
            # print("result: {}".format(result))
            # print("result for :", min_thresh, ":", result, data_array[result])
            left = result + 1
            right = len(snodes) - 1
            assert result >= 0, "Invalid boundary: {}".format(min_thresh)
            level_index[i] = result
        return level_index

    def generate_fixed_level_counts(self, lev_t):
        levelcnts = {}
        assert lev_t in ["depth", "height"], "level type error"
        for nid, cid in self.sorted_index_map.items():
            cnode = self.sorted_nodes[cid]
            level = getattr(cnode, lev_t)
            if level in levelcnts:
                levelcnts[level] += 1
            else:
                levelcnts[level] = 1
        # make the level maps into lists of values
        n_lev = max(levelcnts) + 1 # maximum level + 1
        logger.info("Genereated {} '{}' levels".format(n_lev, lev_t))
        new_list = [0] * n_lev
        for i_lev in range(n_lev):
            if i_lev in levelcnts:
                new_list[i_lev] = levelcnts[i_lev]
        assert sum(new_list) == len(self.sorted_nodes), "level count error"
        return new_list

    def bouyant_context_layout(self, focus_node_ids):

        cntx= {} # node id : Node in OrderedContext()
        for nid, cid in self.sorted_index_map.items():
            cntx[nid] = self.sorted_nodes[cid]

        n_levels = max([getattr(cntx[i], "flex") for i in focus_node_ids]) + 1
        n_focus = len(focus_node_ids)
        logger.debug("Generating focus-aware context info.")
        logger.debug("{}-level focus graph size: {}".format(n_levels, n_focus))
        logger.debug("Number of context nodes: {}" .format(len(cntx)))

        # iterate through the nodes and compute the maximum weight for each layer
        # compute the level breaks: [a, b, c], such that the counts would be
        # [|{x: x >= a}|, |{x: a >= x >= b}|, |{x: b >= x >= c}|]
        # therefore, we just need to compute the min weight on each layer
        level_breaks = [np.inf] * n_levels
        focus_level_counts = [0] * n_levels
        start_indices= [0] * n_levels
        for node_i in focus_node_ids:
            level = getattr(cntx[node_i], "flex")
            node_weight = cntx[node_i].weight
            focus_level_counts[level] += 1
            # level_breaks[level] = min(level_breaks[level], node_weight)
            if node_weight < level_breaks[level]:
                level_breaks[level] = node_weight
                start_indices[level] = cntx[node_i].cid
        assert np.any(np.array(focus_level_counts) > 0), "empty layer error"

        level_breaks[-1] = self.sorted_nodes[-1].weight
        start_indices[-1] = self.sorted_nodes[-1].cid
        logger.debug("Focus level counts: {}".format(focus_level_counts))
        logger.debug("Focus level min index: {}".format(start_indices))
        logger.debug("Level breaks: {}".format(level_breaks))

        # If there are duplicate level breaks, then we should handle here
        ## TODO: there is an issue with the binary search when duplicates exist
        #  def find_uniq_in_sort(arr):
        #      # assuming this list is sorted in descending order,
        #      # we want to keep the last occurance of duplicates
        #      unique_val = []
        #      unique_idx = []
        #      for idx in range(len(arr)):
        #          val = arr[idx]
        #          if idx < (len(arr) - 1):
        #              next_val = arr[idx+1]
        #              if val == next_val:
        #                  continue
        #          unique_val.append(val)
        #          unique_idx.append(idx)
        #      return unique_val, unique_idx

        #  uniq_val, uniq_idx = find_uniq_in_sort(level_breaks)
        #  # find the start indices in each layer
        #  # start_indices = self.boundary_histogram_search(level_breaks)
        #  uniq_start_indices = self.boundary_histogram_search(uniq_val)
        #  for i, lev_idx in enumerate(uniq_idx):
        #      start_indices[lev_idx] = uniq_start_indices[i]
        #  logger.info("Context level min index: {}".format(start_indices))

        # naive solution
        # iterate through each node in order and determine the largest
        # node index in each interval if there are ties, then we should
        # use the focus node breaks to fix the problem

        # assert 0, "STOP"
        # count the number of nodes in each layer
        level_summary = [0] * n_levels
        for i, end_lev_index in enumerate(start_indices):
            if i == 0:
                level_summary[i] = end_lev_index + 1
            else:
                level_summary[i] = end_lev_index - start_indices[i - 1]
        assert sum(level_summary) == len(cntx), "level sum error"
        logger.debug("Context level counts: {}".format(level_summary))

        # DONE: speed up! using option 3 now so no need for level nodes
        # option 1 (time intensive): iteratve through each node in context
        # option 2 (space intensive): directly use the hash-map of n_genes -> [n_terms_(in_context) with less than n_genes]
        # option 3 (bug prone :( ) : use binary interval search for histogram binning

        return {"level_counts": level_summary,
                "level_starts": start_indices,
                "level_breaks": level_breaks}

    def format_node_data(self, node):
        return {"cid": node.cid, # index in the particular context
                "full_cid": node.id, # the original id in the full context
                "name": node.name,
                "weight": node.weight,
                "height": node.height,
                "depth": node.depth}

    def output_lite_node_info(self):
        out_data = [self.format_node_data(n) for n in self.sorted_nodes]
        return out_data

    def output_plain_tested_graph(self):
        # this only outputs the plain graph structure
        # where only children nodes are listed
        # the output data is a list, where each element of this list is
        # a list of children node indices (0-indexed!)
        # THIS HAS BEEN TESTED AND CHECKED MANUALLY
        plain_graph_struct = [[] for i in range(len(self.sorted_nodes))]
        for cid, node in enumerate(self.sorted_nodes):
            children = [self.sorted_index_map[nid] for nid in node.children]
            plain_graph_struct[cid] = sorted(children)
        return plain_graph_struct

def diagnose_competitive_null(tab):
    print(tab)
    tab = np.round(np.array(tab))
    tot_genes = np.sum(tab)
    go_genes = np.sum(tab[:,0])
    report_genes = np.sum(tab[0,:])
    intersection = np.sum(tab[0,0])
    fisher_pval = stats.fisher_exact(tab)[1]
    hypergeom_pval = 1-stats.hypergeom.cdf(intersection-1, tot_genes, go_genes, report_genes)
    print("Fisher pval: {}; Hyergeometric pval: {}".format(fisher_pval,hypergeom_pval))
    print("")

class GOStat():
    def __init__(self):
        # contains the main information of the nodes to be tested
        # this could typically shared with the GODAGraph
        self.ordered_context = OrderedContext()
        self.init_params = {}
        self.oneway_params = {}
        self.go_gene_map = [] # integer -> list of gene ids
        self.gene_go_map = {} # set of gene ids -> list of integers
        # self.background_genes = []
        self.go_annotations = []
        self.gene_id_sym_map = {} # gene ids -> gene symbols
        self.gene_sym_id_map = {} # gene symbols -> ids
        self.name_id_map = {}
        # simulation-specific information:
        # (total genes is captured in gene_go_map)
        self.nonnull_nodes = {"self_nonnull": [], "comp_nonnull": []}
        self.nonnull_genes = set() # set of non-null genes (typically small)
        self.simulator = None
        # TODO: add these to params for temp loading in the future
        self.test_attr_names = ["nonnull_params",
                                "method_test",
                                "method_madj",
                                "method_alpha",
                                "report_metrics"]
        self.nonnull_params = {"self_nonnull": {},
                               "comp_nonnull": {"gs": 100,
                                                "ga": 0.001,
                                                "case": "average"}
                              }
        self.method_test = ["simes",
                            "binomial",
                            "hypergeometric.gs",
                            "hypergeometric.ga"]
        self.method_madj = ["Bonferroni", "BH"]
        self.method_alpha = [0.10]
        self.report_metrics = ["FDR", "Power", "NumRej"]

    def set_test_attr_from_dict(self, in_dict):
        for attr in self.test_attr_names:
            setattr(self, attr, in_dict[attr])

    def get_test_attr_as_dict(self):
        out_dict = {}
        for attr in self.test_attr_names:
            out_dict[attr] = getattr(self, attr)
        return out_dict

    def reverse_list_to_dict(self, in_list, do_sort = True):
        out_dict = {}
        for i, values in enumerate(in_list):
            for value in values:
                if value not in out_dict:
                    out_dict[value] = {}
                node_id = self.ordered_context.sorted_nodes[i].id
                out_dict[value][node_id] = len(values)
        # if do_sort:
        #     for key in out_dict:
        #         out_dict[key] = sorted(out_dict[key])
        return out_dict

    def populate(self,
                 context_params,
                 ordered_context,
                 go_gene_map, # includes only terms tested
                 gene_go_map, # may include more go terms
                 conv_map,
                 go_anns=None):
        self.context_params = context_params
        # populate the nodes
        # only create objects evolving genes that are relevent to testing
        self.ordered_context = ordered_context
        nodes = ordered_context.sorted_nodes
        self.go_gene_map = [sorted(list(go_gene_map[n.name])) for n in nodes]
        logger.info("Stat go->gene: {}".format(len(self.go_gene_map)))
        # ------------------------------
        # TODO: remove these perhaps
        # self.gene_go_map = gene_go_map # use all genes as measure

        self.gene_go_map = self.reverse_list_to_dict(self.go_gene_map)
        # TODO: make below more efficient if needed
        logger.info("Stat gene->go: {}".format(len(self.gene_go_map)))
        self.gene_id_sym_map = {g : conv_map[str(g)] for g in self.gene_go_map}
        self.gene_sym_id_map = {conv_map[str(g)] : g for g in self.gene_go_map}
        # ------------------------------
        logger.debug("Stat gene convers.: {}".format(len(self.gene_sym_id_map)))
        self.name_id_map = {n.name : i for i, n in enumerate(nodes)}
        if go_anns:
            self.go_annotations = [go_anns[n.name] for n in nodes]
            logger.debug("Go annotations: {}".format(len(self.go_annotations)))

    def setup_simulation_oneway(self, params):
        self.oneway_params = params
        self.simulator = OnewaySimulator(params["n_regimes"], params["n_reps"])

        if params["sweep_sample_size"]:
            # setup trials for sample sweeping
            self.simulator.setup_sample_size_sweep(params["min_n"],
                                                   params["max_n"],
                                                   len(self.gene_go_map),
                                                   len(self.nonnull_genes),
                                                   params["eff_size"])
        else:
            # setup trials for effect size sweeeping
            self.simulator.setup_general_params(params["n_controls"],
                                                params["n_cases"],
                                                len(self.gene_go_map),
                                                len(self.nonnull_genes),
                                                params["max_eff_size"])
            self.simulator.setup_trial_params()

    def get_simulation_gene_list(self):
        # return a list of genes (id used for mapping)
        # with nonnull genes front loaded and null genes later

        nonnull_genes = sorted(list(self.nonnull_genes))
        null_genes = sorted([g for g in self.gene_go_map
                                if g not in self.nonnull_genes])
        gene_list = nonnull_genes + null_genes
        logger.debug("Number of tested genes: {}".format(len(gene_list)))
        return gene_list

    def get_node_meta_dict(self):
        node_meta= {}
        node_meta["volume"] = []
        node_meta["self_nonnull"] = []
        node_meta["comp_nonnull"] = []
        for i, node in enumerate(self.ordered_context.sorted_nodes):
            node_meta["volume"].append(node.weight)
            for nonnull_type in ["self_nonnull", "comp_nonnull"]:
                if i in self.nonnull_nodes[nonnull_type]:
                    node_meta[nonnull_type].append(1)
                else:
                    node_meta[nonnull_type].append(0)
        return node_meta


    def evaluate_rejections(self, rej_list, nonnull_type):
        nonnull_set = set(self.nonnull_nodes[nonnull_type + "_nonnull"])
        reject_set = set(rej_list)
        n_true_pos = len(reject_set.intersection(nonnull_set))
        n_false_pos = len(reject_set - nonnull_set)
        out_dict = {}
        out_dict["FDR"] = 1.0 * n_false_pos / max(len(reject_set), 1)
        out_dict["Power"] = 1.0 * n_true_pos / max(len(nonnull_set), 1)
        out_dict["NumRej"] = len(reject_set)
        return out_dict

    def determine_non_null(self, gene_ids):
        # if gene_set_size:
        #     self.nonnull_params["comp_nonnull"]["gs"] = gene_set_size
        gene_set_size = self.nonnull_params["comp_nonnull"]["gs"]
        case = self.nonnull_params["comp_nonnull"]["case"]
        logger.info("determining nulls based on '{}'".format(case))

        self.nonnull_genes = set(gene_ids)
        for null_type in ["self_nonnull", "comp_nonnull"]:
            nonnull_go = []
            if len(gene_ids) > 0:
                # gene ids need to be convertd from gene symbols
                if null_type == "self_nonnull":
                    nonnull_go_set = set()
                    for ge in gene_ids:
                        for go in  self.gene_go_map[ge]:
                            valids = self.ordered_context.sorted_index_map
                            if go in valids:
                                gs_index = valids[go]
                                pass_check = gs_index < len(self.go_gene_map)
                                assert pass_check , "wrong indexing"
                                nonnull_go_set.add(gs_index)
                    nonnull_go = sorted(list(nonnull_go_set))
                    # go_set_list = [set(self.gene_go_map[g]) for g in gene_ids]
                    # nonnull_go = sorted(list(set.union(*go_set_list)))
                elif null_type == "comp_nonnull":
                    tot_num_g = len(self.gene_go_map)
                    sig_genes = set(gene_ids)
                    # TODO: could parallaize this in the future
                    for i in range(len(self.ordered_context.sorted_nodes)):
                        go_genes = set(self.go_gene_map[i])
                        go_size = len(go_genes)
                        sig_size = len(sig_genes)
                        sig_int_term = len(sig_genes & go_genes)
                        sig_minus_term = len(sig_genes - go_genes)
                        background_ratio = go_size / tot_num_g

                        if gene_set_size:
                            # adapt to fixed gene
                            if sig_size > gene_set_size :
                                # case 1: where too few genes are drawn
                                # allocate the signals propotionally
                                # round 'towards non-null'
                                size_ratio = 1.0 * gene_set_size / sig_size
                                # sig_int_term = ceil(sig_int_term * size_ratio)
                                # sig_minus_term = floor(sig_minus_term * size_ratio)
                                sig_int_term = (sig_int_term * size_ratio)
                                sig_minus_term = (sig_minus_term * size_ratio)
                            else:
                                # case 2: too many genes are drawn
                                # then the remaining would be split evenly
                                # between the remain terms
                                rem_terms = go_size - sig_int_term
                                rem_nonterms = tot_num_g - go_size - sig_minus_term

                                # extra non-signal genes to be drawn
                                remain_draw = gene_set_size - sig_size
                                # non-signal genes to draw from
                                remain_nonsig = tot_num_g - sig_size
                                size_ratio = 1.0 * remain_draw / remain_nonsig
                                # sig_int_term += ceil(rem_terms * size_ratio)
                                # sig_minus_term += floor(rem_nonterms * size_ratio)
                                sig_int_term += (rem_terms * size_ratio)
                                sig_minus_term += (rem_nonterms * size_ratio)

                                # go_ratio = remain_terms / (tot_num_g - sig_size )
                                # add_to_go = go_ratio * remaining_tot
                                # add_to_nongo = (1 - go_ratio) * remaining_tot
                                # TODO: fix later

                        # check if the ratio of genes is greater or notation
                        # old:
                        # background_ratio = 1.0 * len(go_genes) / tot_num_g
                        # signal_ratio = 1.0 * sig_int_term / len(sig_genes)
                        # old 2:
                        # lnumer = min(sig_int_term, gene_set_size)
                        # ldenom = len(sig_genes)
                        # rnumer = min(gene_set_size, len(go_genes))
                        # rdenom = tot_num_g
                        # signal_ratio= lnumer / ldenom # gene_set_size
                        # background_ratio = rnumer / rdenom

                            assert sig_int_term + sig_minus_term - gene_set_size < 13-5, \
                                "{} + {} != {}".format(sig_int_term, sig_minus_term, gene_set_size)
                            if case=="best":
                                numerator = gene_set_size - len(sig_genes - go_genes)
                            elif case == "worst":
                                numerator = len(sig_genes & go_genes)
                            else:
                                numerator = sig_int_term
                            signal_ratio = numerator / gene_set_size
                        else:
                            signal_ratio = sig_int_term / min(1, sig_size)
                        # if i == 0:
                        #     print(signal_ratio)
                        #     print(background_ratio)
                        #     print("Background: {} / {} = {}".format(go_size,
                        #                                 tot_num_g,
                        #                                 background_ratio))
                        #     print("Signal: {} / {} = {}".format(
                        #         numerator, gene_set_size, signal_ratio))
                        if signal_ratio - background_ratio > 1e-6:
                            nonnull_go.append(i)

                        # ---diagnosis---:
                        # TODO: remove below
#                         print_out = False
#                         # if i in [0, 1,3,5,131,139,151, 164, 167, 168]:
#                         if i in [1, 49, 116]:
#                             print_out = True
#                         a = sig_int_term
#                         b = sig_minus_term
#                         c = go_size - a
#                         d = tot_num_g - a - b - c
#                         contingency_mtx_1 = [[a, b], [c, d]]
#                         if signal_ratio - background_ratio >= -1e-6:
#                             nullornot1 = "nonnull"
#                         else:
#                             nullornot1 = "null"

#                         a = len(sig_genes & go_genes)
#                         b = len(sig_genes - go_genes)
#                         c = go_size - a
#                         d = tot_num_g - a - b - c
#                         contingency_mtx_2 = [[a, b], [c, d]]
#                         if (a/(a+b)) - (go_size / tot_num_g) >= -1e-6:
#                             nullornot2 = "nonnull"
#                         else:
#                             nullornot2 = "null"

#                         if nullornot1 != nullornot2:
#                             print_out = True

#                         if print_out:
#                             print("\nNode : {}".format(i))
#                             print(np.array(contingency_mtx_1))
#                             print("({:.1f}/{:.1f} >= {}/{}) ? => {}".format(sig_int_term, gene_set_size , go_size, tot_num_g, nullornot1))
#                             print(np.array(contingency_mtx_2))
#                             print("({:.1f}/{:.1f} >= {}/{}) ? => {}".format(a, a+b, go_size, tot_num_g, nullornot2))
                else:
                    assert 0, "null hyothesis type not recognized"
            self.nonnull_nodes[null_type] = nonnull_go
        return self.nonnull_nodes


    def independent_fisher_tests(self, study_genes, verbose=False):
        # study_genes: a set of genes that are already determined as significant
        # test the set of go terms indepdenently
        if verbose:
            print("Number of genes reported: {}".format(len(study_genes)))
            print("Intersection with the ({}) signal genes : {}".format(
                len(self.nonnull_genes),
                len(self.nonnull_genes.intersection(study_genes))))

        pop_n = len(self.gene_go_map)
        study_n = len(study_genes)
        test_p_values = []
        for term_i, term_genes in enumerate(self.go_gene_map):
            go_genes_study = set(term_genes).intersection(study_genes)
            study_count = len(go_genes_study)
            pop_count = len(term_genes)
            a = study_count
            b = study_n - study_count
            c = pop_count - study_count
            d = pop_n - pop_count - b
            # stats.fisher_exact returns oddsratio, pval_uncorrected

            contingency_mtx = [[a, b], [c, d]]
            # _, pvalue = stats.fisher_exact( contingency_mtx )
            if study_n == 0:
                # did not draw anything
                pvalue = 1.0
            else:
                # note: using Pr(x >= study_count) to compute pvalue
                pvalue = 1 - stats.hypergeom.cdf(study_count - 1,
                                                 pop_n,
                                                 pop_count,
                                                 study_n)
            test_p_values.append(pvalue)
            if verbose:
                if term_i in np.round(np.linspace(0,len(self.go_gene_map),10)):
                    if (term_i in self.nonnull_nodes["comp_nonnull"]):
                        print("\nNode {} (non-null):".format(term_i))
                    else:
                        print("\nNode {} (null):".format(term_i))
                    print("X ~ hypergeom({},{},{})\tPr(X >= {}) = {:.5f}".format(
                        pop_n, pop_count, study_n, study_count, pvalue))
#                     print("Data:")
#                     print(np.array(contingency_mtx).transpose())
#                     print("pvalue: {}".format(pvalue))
#                     nn_genes = self.nonnull_genes
#                     a = len(set(term_genes).intersection(nn_genes))
#                     b = len(nn_genes)- a
#                     c = pop_count - a
#                     d = pop_n - a - b - c
#                     contingency_mtx = [[a, b], [c, d]]
#                     if a == 0:
#                         print("Ground truth (NULL!):")
#                     else:
#                         print("Ground truth:")
#                     print(np.array(contingency_mtx).transpose())

        return test_p_values

    def independent_binomial_tests(self, study_genes, alpha, verbose=False):
        if verbose:
            print("Number of genes reported (level {}): {}".format(
                alpha,len(study_genes)))
            print("Intersection with the ({}) signal genes : {}".format(
                len(self.nonnull_genes),
                len(self.nonnull_genes.intersection(study_genes))))

        study_n = len(study_genes)
        test_p_values = []
        for term_i, term_genes in enumerate(self.go_gene_map):
            go_genes_study = set(term_genes).intersection(study_genes)
            # note: using Pr(x >= study_count) to compute pvalue
            pvalue = 1-stats.binom.cdf(len(go_genes_study) - 1,
                                       len(term_genes),
                                       alpha)
            test_p_values.append(pvalue)
            if verbose:
                if term_i in np.round(np.linspace(0,len(self.go_gene_map),10)):
                    if (term_i in self.nonnull_nodes["self_nonnull"]):
                        print("\nNode {} (non-null):".format(term_i))
                    else:
                        print("\nNode {} (null):".format(term_i))
                    print(" X ~ bin({},{})\tPr(X >= {}) = {:5f}".format(
                                                     len(term_genes),
                                                     alpha,
                                                     len(go_genes_study),
                                                     pvalue))

        return test_p_values

    def independent_global_tests(self, gene_pvalues, method="Simes"):
        test_p_values = []
        for term_i, term_genes in enumerate(self.go_gene_map):
            pvalues = [gene_pvalues[g] for g in term_genes]
            global_pvalue = global_test_pvalue(pvalues, method="Simes")
            test_p_values.append(global_pvalue)
        return test_p_values

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

        node_pvals = None

        if test == "simes":
            # compute the Sime's global p-value
            gene_pvals = dict(zip(genes, pvals))
            node_pvals = self.independent_global_tests(gene_pvals, method="Simes")

        if test == "hypergeometric":
            # create a gene set based on threshold cutoff and
            # apply Bonferroni on the pvalues so the FWER is controlled at `param`
            if cutoff=="fixed_threshold":
                param = self.nonnull_params["comp_nonnull"]["ga"]
                logger.debug("Hypergeometric will use fixed gene alpha" + \
                        "of size {}".format(param))
                # thres = 1.0 * param / len(pvals) # Bonforreni Correction
                thres = param
                gset = set([genes[i] for i, val in enumerate(pvals) if val < thres])
            else: # cutoff=="fixed_size"
                param = self.nonnull_params["comp_nonnull"]["gs"]
                logger.debug("Hypergeometric will use fixed gene sets" + \
                        "of size {}".format(param))
                n_genes = param # self.nonnull_params["comp_nonnull"]["gs"]
                min_pval_idx = np.argsort(pvals)[:n_genes]
                gset = set(genes[i] for i in min_pval_idx)
            node_pvals = self.independent_fisher_tests(gset, verbose=verbose)

        if test == "binomial":
            alpha = self.nonnull_params["comp_nonnull"]["ga"]
            gset = set([genes[i] for i, val in enumerate(pvals) if val < alpha])
            node_pvals = self.independent_binomial_tests(gset, alpha,
                                                         verbose=verbose)

        if node_pvals is None:
            assert 0, "Error in generating pvals for {}".format(test)

        return node_pvals


    def convert_gene_from_to(self, source, target, gene_list):
        if source == "id" and target == "sym":
            conversion = self.gene_id_sym_map
        elif source == "sym" and target == "id":
            conversion = self.gene_sym_id_map
        else:
            assert 0, "source and target not recognized"
        return [conversion[gene] for gene in gene_list]

    def output_ground_truth_info(self, output_graph=False):
        if output_graph:
            logger.info("Outputing the tested graph...")
        return self.nonnull_nodes



# inhereted class that handles Gene Ontology (GO)
class GODAGraph(DAGraph):

    def __init__(self,
                 cache_dir,
                 ontology,
                 species="human",
                 name=None):
        # super(DAGraph, self).__init__()
        DAGraph.__init__(self)
        # TODO: make sure that this code is used in future versions
        ontology_roots = {"cellular_component": "GO:0005575",
                          "biological_process": "GO:0008150",
                          "molecular_function": "GO:0003674"}
        assert ontology in ontology_roots , "ontology error"
        root = ontology_roots[ontology]

        self.ontology = ontology
        self.species = species
        self.name = name
        self.gohelper = GOHelper(cache_dir, species=species)

        # gene-related maps
        self.go_gene_map = {}
        self.gene_conversion_map = {}
        self.go_annotation = {}
        self.gene_go_map = {}

        # context graph
        self.context_graph = OrderedContext()
        self.context_params = {}
        # focus graph
        self.focus_graph = None
        self.focus_params = {}

        # TODO: remove this context
        self.stat_test_context_nodes = None
        self.main_test_context = OrderedContext()

        self.main_statistician = GOStat()
        self.context_map = {"full_context": {}, "test_context": {}}
        self.context_index_map = {"test_context": []}

        self.output_precomputed_data = {}
        self.root = root
        self.cache_dir = cache_dir
        if cache_dir:
            assert self.root, "to store a cache root cannot be empty"
            self.go_fname =  os.path.join(cache_dir,
                    "godag_{}_{}.pkl".format(ontology, species))

    def load_node_power_matrix(self, output_dir, test, multitest, nonnull_only=False):
        fname = "node_{}_{}.csv".format(test, multitest)
        node_df = pd.read_csv(os.path.join(output_dir, "summary", fname), index_col=0)
        if nonnull_only:
            if test in ["simes", "binomial"]:
                nn_type = "self"
            else:
                nn_type = "comp"
            fname = "meta_{}_nonnull_nodes.json".format(nn_type)
            with open(os.path.join(output_dir, fname)) as json_file:
                node_cids = sorted(json.load(json_file) )
            node_df = node_df.loc[node_cids]
        return node_df

    def output_node_power_matrix(self, output_dir, test, multitest):
        # load the node power matrix
        node_df = self.load_node_power_matrix(output_dir, test, multitest)
        colnames = list(node_df.columns.values)
        rownames = list(node_df.index.values)
        node_df.columns = range(len(colnames))
        node_df["row_id"] = range(len(rownames))
        node_df
        melt_df = pd.melt(node_df, id_vars=["row_id"], var_name=["col_id"])
        mtx_data = {
            "col_ann": colnames,
            "row_ann": [str(i) for i in rownames],
            "data":   list(melt_df.to_dict('records'))
        }
        return mtx_data

    def generate_node_power_matrix(self,
                                   output_dir,
                                   test,
                                   multitest):

        if test in ["simes", "binomial"]:
            nn_type = "self"
        else:
            nn_type = "comp"

        mstat = self.main_statistician
        simulator = self.main_statistician.simulator
        node_cids = list(range(len(mstat.ordered_context.sorted_nodes)))
        # print(len(node_cids))
        # print(node_cids)

        node_fracs = []
        for reg_i in range(simulator.n_regimes):
            nonnulls = {key: 0 for key in node_cids}
            node_df = pd.DataFrame(index = sorted(nonnulls.keys()))
            # compute the fraction of time the node is rejected and put as a matrix

            for rep_i in range(simulator.n_reps):
                _, rejects, _ = self.load_test_result(output_dir,
                                                     reg_i,
                                                     rep_i,
                                                     test,
                                                     eval_rej=False)
                for rej_j in rejects[multitest]:
                    if rej_j in nonnulls:
                        nonnulls[rej_j] += 1

            for node in nonnulls:
                nonnulls[node] = 1.0 * nonnulls[node] / simulator.n_reps
            node_fracs.append(nonnulls.copy())

        node_df = pd.DataFrame(node_fracs).transpose()
        # optional add column names
        node_df.columns = simulator.regime_names
        logger.info("{} - {} - {} - effect_{}".format(
            nn_type, test, multitest, simulator.general_params["eff_size"]))

        return node_df


    def summarize_trial_result(self, dat_dir, reg_i, rep_i):
        # create summary date frame with fields including fields:
        # 1. testing_method
        # 2. adjustment_method
        # 3. nonnull_type
        # 3. emperical_fdr
        # 4. emperical_power
        # 5. num_rejections
        # ----------------------
        # 6. regime_id
        # 7. repetition_id
        # 8. trial_id
        # ----------------------
        method_results = []
        simulator = self.main_statistician.simulator
        for test in self.main_statistician.method_test:
            if test in ["simes", "binomial"]:
                nn_type = "self"
            else:
                nn_type = "comp"

            _, _, sum_stat = self.load_test_result(dat_dir,
                                                      reg_i,
                                                      rep_i,
                                                      test,
                                                      eval_rej=True)

            case_summary = pd.DataFrame(sum_stat)
            case_summary = case_summary.transpose().reset_index(level=0)
            case_summary = case_summary.rename(index=str,
                               columns={"index": "adjustment_method",
                                        "FDR": "empirical_fdr",
                                        "Power": "empirical_power",
                                        "NumRej": "num_rejections"})
            case_summary["testing_method"] = test
            case_summary["nonnull_type"] = nn_type
            method_results.append(case_summary)
        method_results
        trial_methods = pd.concat(method_results, ignore_index=True)
        trial_methods["regime_id"] = reg_i
        trial_methods["repetition_id"] = rep_i
        trial_methods["trial_id"] = simulator.rrid_to_tid(reg_i, rep_i)
        return trial_methods

    def summarize_simulation_results(self, dat_dir):
        simulator = self.main_statistician.simulator
        sim_res = []
        for reg_i in range(simulator.n_regimes):
            reg_res = []
            for rep_i in range(simulator.n_reps):
                reg_res.append(self.summarize_trial_result(dat_dir, reg_i, rep_i))
            sim_res.append(pd.concat(reg_res, ignore_index=True))
        return pd.concat(sim_res, ignore_index=True)


    def launch_simulation_pipeline(self, cache_dir, cleanup=False):

        # step 0: output the simulation setup and ground truth
        self.store_test_meta_data(cache_dir, simulation=True)
        n_trials = self.main_statistician.simulator.n_trials
        logger.info("Number of trials to simulate: {}".format(n_trials))

        # TODO: multiprocessing does not bring much performance gain
        # pool = mp.Pool(processes=8)
        # step 1: generate the gene p-values (and x , y data)
        t0 = time.time()
        for t_id in range(n_trials):
            self.generate_trial_gene_stats(cache_dir,
                                           t_id,
                                           simulation=True,
                                           save_xy=False)
            # pool.apply(self.generate_trial_gene_stats,
            #                  args=(cache_dir, t_id))

        t1 = time.time()
        logger.info("Generated gene-pvals used time: {:.5f}".format(t1-t0))

        # step 2: generate the node p-values and reject significant nodes
        t0 = time.time()
        for t_id in range(n_trials):
            self.generate_trial_node_stats(cache_dir, t_id)
            # pool.apply(self.generate_trial_node_stats,
            #                  args=(cache_dir, t_id))
        t1 = time.time()
        logger.info("Generated nodes-pval used time: {:.5f}".format(t1-t0))

        # step 3: store the summary and clean up the folders
        # TODO: check flag in the future
        t0 = time.time()
        self.generate_summary_files(cache_dir)
        t1 = time.time()
        logger.info("Packaged up data used time: {:.5f}".format(t1-t0))
        if cleanup:
            cleanup_dir(cache_dir)

    def generate_summary_files(self,
                               data_dir):
        summary_dir = os.path.join(data_dir, "summary")
        if not os.path.exists(summary_dir):
            os.makedirs(summary_dir)
        sum_df = self.summarize_simulation_results(data_dir)
        fn = os.path.join(summary_dir, "trial_summary.csv")
        sum_df.to_csv(fn)
        logger.info("Saved: {}".format(fn))

        mstat = self.main_statistician
        for test_method in mstat.method_test:
            for adj_method in mstat.method_madj:
                node_df = self.generate_node_power_matrix(data_dir,
                                                          test_method,
                                                          adj_method)
                fn = os.path.join(summary_dir,
                    "node_{}_{}.csv".format(test_method, adj_method))
                node_df.to_csv(fn)
                logger.info("Saved: {}".format(fn))

    def set_gene_level_params(self, param_name, value):
        mstat = self.main_statistician
        if param_name == "gene_threshold":
            mstat.nonnull_params["comp_nonnull"]["ga"] = value
        if param_name == "gene_set_size":
            mstat.nonnull_params["comp_nonnull"]["gs"] = value


    def generate_trial_node_stats(self,
                                  data_dir,
                                  trial_id):
        trial_dir = os.path.join(data_dir, "trial_{}".format(trial_id))
        flag = "NODESTAT"
        # load or read the gene list (gene ids)
        # if flag_complete(data_dir, "check", "META"):
        #     # search for the right file name
        #     fpfx = "meta_gene_ids"
        #     gene_list = []
        #     for ftype in ["pkl", "json"]:
        #         fn =  "{}.{}".format(fpfx, ftype)
        #         logger.info("Searching for {} file".format(ftype))
        #         infname = os.path.join(data_dir, fn)
        #         if os.path.exists(infname):
        #             gene_list = load_data_from_file(infname, ftype)
        #             break
        #     assert gene_list, "Gene list cannot be loaded!"
        mstat = self.main_statistician
        gene_list = mstat.get_simulation_gene_list()
        gene_pvals = None
        if flag_complete(trial_dir, "check", "GENESTAT"):
            # search for the right file name
            fpfx = "gene_stats"
            for ftype in ["npy", "csv"]:
                fn =  "{}.{}".format(fpfx, ftype)
                logger.debug("Searching for {} file".format(ftype))
                infname = os.path.join(trial_dir, fn)
                if os.path.exists(infname):
                    gene_result = load_data_from_file(infname, ftype)
                    gene_pvals = gene_result[:, 1]
                    break
        else:
            msg = "Cannot find GENESTAT flag, re-run generate_trial_gene_stats"
            logger.error(msg)
        assert (gene_pvals is not None), "Failed to load gene pvalues!"

        node_test = mstat.method_test
        multitest_methods =  mstat.method_madj
        alpha = mstat.method_alpha[0]

        flag_complete(trial_dir, "remove", sufx=flag)
        for fd in node_test:
            logger.debug("----------------------------------------------")
            logger.debug("Testing each node by: {}".format(fd))
            if fd == "hypergeometric.gs":
                cutoff = "fixed_size"
                testname = "hypergeometric"
            elif fd == "hypergeometric.ga":
                cutoff = "fixed_threshold"
                testname = "hypergeometric"
            else:
                cutoff = None
                param = None
                testname = fd
            pvals = mstat.generate_node_pvals_from_gene_pvals(gene_list,
                                                     gene_pvals,
                                                     test=testname,
                                                     cutoff=cutoff)
            # store the pvalues for each test (the pvals is a list object)
            p_fn, p_ft = self.get_node_test_file_info("pvals", fd)
            p_fn = os.path.join(trial_dir, p_fn)
            save_data_to_file(pvals, p_fn, p_ft)

            # multiple testing correction
            for method in multitest_methods:
                # conduct different rejection techniques
                logger.debug("   Running {} correction...".format(method))
                r_fn, r_ft = self.get_node_test_file_info("rej",
                                                            fd,
                                                            mmeth=method,
                                                            alpha=alpha)
                r_fn = os.path.join(trial_dir, r_fn)
                rejection = multitest_rejections(pvals, alpha, method).tolist()
                logger.debug("  {}".format(rejection))
                save_data_to_file(rejection, r_fn, r_ft)

        flag_complete(trial_dir, "add", sufx=flag)
        if flag_complete(trial_dir, "check", sufx=flag):
            logger.debug("[{}] Saved all test data \n".format(flag))

    def generate_trial_gene_stats(self,
                                  data_dir,
                                  trial_id,
                                  simulation=True,
                                  save_xy=True):

        trial_dir = os.path.join(data_dir, "trial_{}".format(trial_id))
        flag = "GENESTAT"
        if not os.path.exists(trial_dir):
            os.makedirs(trial_dir)

        flag_complete(trial_dir, "remove", sufx=flag)
        if simulation:
            simulator = self.main_statistician.simulator
            params = simulator.trial_params[trial_id]
            logger.debug("Generating simulation data...")
            logger.debug("Params: {}".format(params))

            t0 = time.time()
            ydata, xdata = simulator.generate_single_trial_data(params)
            t1 = time.time()
            logger.debug("Generated (y, X) used time: {:.5f}".format(t1-t0))

            t0 = time.time()
            gene_test_result = simulator.get_diff_stats_pvals(ydata, xdata)
            gene_test_result = np.array(gene_test_result).transpose()
            t1 = time.time()
            logger.debug("Generated gene-pvals used time: {:.5f}".format(t1-t0))
        else:
            # TODO: load data from files or user inputs
            ydata = None
            xdata = None
            gene_test_result = None

        # store the raw data
        fdata = self.get_file_groups(flag)
        if simulation:
            fdata += self.get_file_groups(flag + "_SIM")
        if save_xy:
            fdata += self.get_file_groups(flag + "_ALL")
        for fd in fdata:
            if fd == "gene_stats":
                outdata  = gene_test_result
            elif fd == "xdata":
                outdata  = xdata
            elif fd == "ydata":
                outdata  = ydata
            elif fd == "params":
                outdata  = params
            else:
                assert 0, "{} not recognized".format(fd)
            fn, ft = self.get_file_info(fd)
            fn = os.path.join(trial_dir, fn)
            save_data_to_file(outdata, fn, ft)

        # mark completion
        flag_complete(trial_dir, "add", sufx=flag)
        if flag_complete(trial_dir, "check", sufx=flag):
            logger.debug("[{}] Saved all trial data \n".format(flag))

        return gene_test_result


    def load_full_test_summary(self, data_dir):
        t0 = time.time()
        mstat = self.main_statistician
        simulator = self.main_statistician.simulator
        all_full_summary = {}
        for test_name in mstat.method_test:
            test_result= {}
            for metric in mstat.report_metrics:
                metric_res = {}
                for madj in mstat.method_madj:
                    adj_result = {"mean": [], "err": []}
                    for reg_i in range(simulator.n_regimes):
                        reg_res = []
                        for rep_i in range(simulator.n_reps):
                            res_data = self.load_test_result(data_dir,
                                                             reg_i,
                                                             rep_i,
                                                             test_name)
                            eval_result = res_data[2]
                            reg_res.append(eval_result[madj][metric])
                        # -------------------------------------------------
                        # compute the mean and sd of the regime here
                        adj_result["mean"].append(np.mean(reg_res))
                        adj_result["err"].append(np.std(reg_res))
                        # -------------------------------------------------
                    metric_res[madj] = adj_result
                test_result[metric] = metric_res
            all_full_summary[test_name] = test_result
        t1 = time.time()
        logger.info("Loaded data used time: {:5f}s".format(t1-t0))

        return all_full_summary

    def load_regime_test_summary(self, data_dir):
        mstat = self.main_statistician
        simulator = self.main_statistician.simulator

        # average over each replicate
        all_full_summary = {}
        for test_name in mstat.method_test:
            full_summary = {}
            for reg_i in range(simulator.n_regimes):
                logger.debug("Regime: {}".format(reg_i))
                regime_result = {key: {} for key in mstat.report_metrics}
                for madj in mstat.method_madj:
                    for metric in regime_result:
                        regime_result[metric][madj] = []
                for rep_i in range(simulator.n_reps):
                    res_data = self.load_test_result(data_dir, reg_i, rep_i, test_name)
                    eval_result = res_data[2]
                    for madj in mstat.method_madj:
                        for metric in regime_result:
                             regime_result[metric][madj].append(eval_result[madj][metric])
                    logger.debug(eval_result)
                full_summary[reg_i] = regime_result

            # for each list of values of metrics, compute the mean and standard error instead of the actual values
            for reg_i in range(simulator.n_regimes):
                for madj in mstat.method_madj:
                    for metric in regime_result:
                        vals = full_summary[reg_i][metric][madj]
                        report = {"mean": np.mean(vals), "err": np.std(vals) / np.sqrt(len(vals))}
                        full_summary[reg_i][metric][madj] = report
            all_full_summary[test_name] = full_summary

        return all_full_summary

    def load_gene_pvals(self, data_dir, reg_i, rep_i):
        mstat = self.main_statistician
        simulator = mstat.simulator
        tid = simulator.rrid_to_tid(reg_i, rep_i)
        tdir = os.path.join(data_dir, "trial_{}".format(tid))

        # read the gene pvalues for this test
        p_fn, p_ft = self.get_file_info("gene_stats")
        p_fn = os.path.join(tdir, p_fn)
        g_pvals = load_data_from_file(p_fn, p_ft)

        p_fn, p_ft = self.get_file_info("meta_gene_ids")
        p_fn = os.path.join(data_dir, p_fn)
        g_ids = load_data_from_file(p_fn, p_ft)

        return g_ids, g_pvals

    def load_test_result(self,
                         data_dir,
                         reg_i,
                         rep_i,
                         test,
                         eval_rej=True):
        logger.debug("Loading result: reg-{} rep-{} test-{}".format(reg_i, rep_i, test))
        mstat = self.main_statistician
        simulator = mstat.simulator
        assert test in mstat.method_test, \
            "Test `{}` not recognized!".format(test)
        tid = simulator.rrid_to_tid(reg_i, rep_i)
        tdir = os.path.join(data_dir, "trial_{}".format(tid))

        # read the pvalues for this test
        p_fn, p_ft = self.get_node_test_file_info("pvals", test)
        p_fn = os.path.join(tdir, p_fn)
        pvals = load_data_from_file(p_fn, p_ft)

        # read the rejections for this test
        multitest_methods = mstat.method_madj
        alpha = mstat.method_alpha[0]
        rejections = {}
        evaluation = {}
        for method in multitest_methods:
            r_fn, r_ft = self.get_node_test_file_info("rej",
                                                      test,
                                                      mmeth=method,
                                                      alpha=alpha)
            r_fn = os.path.join(tdir, r_fn)
            rejection = load_data_from_file(r_fn, r_ft)
            rejections[method] = rejection

            if eval_rej:
                if test in ["simes", "binomial"]:
                    nn_type = "self"
                else:
                    nn_type = "comp"
                eval_r = mstat.evaluate_rejections(rejection, nn_type)
                evaluation[method] = eval_r
        logger.debug("Completed loading!")

        return pvals, rejections, evaluation

    def get_node_test_file_info(self,
                                rtype,
                                tmeth,
                                mode="Default",
                                mmeth=None,
                                alpha=None):
        if mode == "Default":
            ft = "json"
        if rtype == "pvals":
            fn = "node_{}_{}.{}".format(rtype, tmeth, ft)
        if rtype == "rej":
            fn = "node_{}_{}_{}_{}.{}".format(rtype, alpha, tmeth, mmeth, ft)
        return fn, ft

    def get_file_info(self, fd, mode="Default"):
        if fd in ["xdata", "ydata", "gene_stats"]:
            ft = "npy"
        else:
            ft = "json"
        fn = os.path.join("{}.{}".format(fd,ft))
        return fn, ft

    def get_file_groups(self, key):
        file_dict = {
            "META": ["meta_gene_ids",
                     "meta_gogene_map",
                     "meta_restore_params",
                     "meta_gochild_dag"],
            "META_SIM": ["meta_nonnull_gene_ids",
                         "meta_self_nonnull_nodes",
                         "meta_comp_nonnull_nodes"],
            "GENESTAT": ["gene_stats"],
            "GENESTAT_ALL": ["xdata",
                            "ydata"],
            "GENESTAT_SIM": ["params"]
        }
        return file_dict[key]

    def store_test_meta_data(self, data_dir, simulation=True):
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        mstat = self.main_statistician
        flag = "META"
        fdata = self.get_file_groups(flag)
        if simulation:
            fdata += self.get_file_groups(flag + "_SIM")

        # if flag exists in folder, remove it
        flag_complete(data_dir, "remove", sufx=flag)
        for fd in fdata:
            if fd == "meta_nonnull_gene_ids":
                outdata  = list(mstat.nonnull_genes)
            elif fd == "meta_gene_ids":
                outdata  = mstat.get_simulation_gene_list()
            elif fd == "meta_gogene_map":
                outdata  = mstat.go_gene_map
            elif fd == "meta_gochild_dag":
                outdata  = mstat.ordered_context.output_plain_tested_graph()
            elif fd == "meta_self_nonnull_nodes":
                outdata = mstat.nonnull_nodes["self_nonnull"]
            elif fd == "meta_comp_nonnull_nodes":
                outdata = mstat.nonnull_nodes["comp_nonnull"]
            elif fd == "meta_restore_params":
                outdata = {"context_params": mstat.context_params,
                           "test_params": mstat.get_test_attr_as_dict(),
                           "oneway_params": mstat.oneway_params
                          }
            else:
                assert 0, "{} not recognized".format(fd)
            fn, ft = self.get_file_info(fd)
            fn = os.path.join(data_dir, fn)
            save_data_to_file(outdata, fn, ft)

        # mark completion
        flag_complete(data_dir, "add", sufx=flag)
        if flag_complete(data_dir, "check", sufx=flag):
            logger.debug("Saved all meta information\n")

    def output_initialization_data(self):
        return {"root" : self.root,
                "min_w" : 1,
                "max_w" : len(self.gene_go_map)}


    def output_context_summary(self, slow_reachability=False):
        out_dict = {}
        for cntx_n in self.context_map:
            logger.info("Writing output context for {} ({} nodes) "
                .format(cntx_n, len(self.context_map[cntx_n])))
            out_dict[cntx_n] = {}
            cntx_o = out_dict[cntx_n]
            context = self.context_map[cntx_n]
            node_ids = sorted(context.keys())
            cntx_o["id"] = node_ids
            for rel in ["parents", "children"]:
                attr = "num_" + rel
                cntx_o[attr] =[len(getattr(context[i], rel)) for i in node_ids]
                if slow_reachability:
                    if rel == "parents":
                        attr = "num_ancestors"
                    if rel == "children":
                        attr = "num_descendents"
                    num_nodes = []
                    for node_i in node_ids:
                        rn = self.relation_search([node_i], rel, restrict_set=context)
                        num_nodes.append(len(rn) - 1)
                        if len(num_nodes) % 5000 == 0:
                            logger.info("Parsed {} nodes".format(len(num_nodes)))
                    cntx_o[attr] = num_nodes
            for view in ["depth", "height", "weight"]:
                cntx_o[view] = [getattr(context[i], view) for i in node_ids]
        return out_dict

    def output_non_null_go_terms(self, gene_symb_list):
        stat = self.main_statistician
        g_list = stat.convert_gene_from_to("sym", "id", gene_symb_list)
        stat.determine_non_null(g_list)
        return stat.output_ground_truth_info()

    def save_result(self, data, fname):
        pickle.dump( data, open( fname, "wb" ) )
        logger.info("Saved results to: {}".format(fname))

    def load_result(self, fname):
        assert os.path.exists(fname), "{} does not exist".format(fname)
        logger.debug("Loading results from: {}".format(fname))
        return pickle.load( open( fname, "rb" ) )


    def sample_genes(self, n_genes, go_term, exclude=False, seedn=0):
        """
            Sample gene sets based on GO term

            Sample genes that are inclusive or exclusive to a go term.

            Parameters
            ----------
            n_genes : int
                Number of genes to sample
            go_term : str
                The GO term to focus on
            exclude: bool, optional
                To exclude genes from this go-term (default: False: "include")
            seedn: int, optional
                The random seed to sample the genes (default: 0)

            Returns
            -------
            None

        """
        np.random.seed(seedn)
        query_set = self.go_gene_map[go_term]
        if exclude:
            gene_list = list(set(self.gene_go_map.keys()).difference(query_set))
        else:
            gene_list = sorted(list(query_set))
        gene_list = np.array(gene_list)
        if len(gene_list) < n_genes:
            logger.warning("Requested more genes than available, using all...")
            n_genes = len(gene_list)
        samp_idx = np.random.choice(len(gene_list), n_genes, replace=False)
        return set(gene_list[samp_idx])


    # maps supplied by gohelper
    def update_with_gene_annotations(self,
                                     propagate_to_parents=True,
                                     background_gene_set=None):
        # 1. create a map from genes to go and their parents
        gene2go = self.gohelper.create_gene_go_maps(
                                    query_go_terms = set(self.name_index_map))
        for gene in gene2go:
            if background_gene_set:
                if gene not in background_gene_set:
                    continue
            node_indices = [self.name_index_map[go] for go in gene2go[gene]]
            if propagate_to_parents:
                gene2go[gene] = self.relation_search(node_indices, "parents")
            else:
                gene2go[gene] = set(node_indices) # do not search for any parents
        self.gene_go_map = gene2go

        # 2. create a map from go terms to genes
        self.go_gene_map = {go_term: set() for go_term in self.name_index_map}
        for gene in gene2go:
            for node_index in gene2go[gene]:
                self.go_gene_map[self.nodes[node_index].name].add(gene)
        logger.info("Generated go-gene map from {} genes".format(len(gene2go)))

        # 3. calculate the node weights based on the go-terms
        for node in self.nodes:
            node.weight = len(self.go_gene_map[node.name])
        logger.info("Updated weights for each node by number of genes")

        # 4. retrieve gene conversion from go and store here
        self.gene_conversion_map = self.gohelper.gene_conversion_map

        # 5. retrieve the relevant go annotations
        self.go_annotation = self.gohelper.retrieve_relevant_annotations(
                                    self.name_index_map)

    def update_context_indices(self, context):
        # create a 0-based context and propagate the cid field of each node
        cid = 0
        for node_i in context:
            context[node_i].cid = cid
            cid += 1

    def setup_context_graph(self,
                            rule,
                            target_node_list,
                            min_w=1,
                            max_w=30000,
                            refine_graph=False,
                            store_context=True):
        """
        Create a context graph based on target nodes and rules

        Parameters
        ----------
        rule : obj: `str`
            Rule to build the context: "waypoint", "root" or "leaf"
        target_node_list: obj: `list`
            A list of node names (GO:..) that will be the target by the rule.
        min_w: obj: `int`
            The minimum number of genes that each node should have
        max_w: obj: `int`
            The maximum number of genes that each node should have
        refine_graph: obj: `bool`
            Whether or not to remove redundent GO terms

        Returns
        -------
        set
            dict of node indices mapped to their measure

        """
        rule_set = ["waypoint", "root", "leaf"]
        assert rule in rule_set, "rule must be in {}".format(rule_set)
        assert isinstance(target_node_list, list), "nodes should be list type"
        assert len(target_node_list) > 0, "node list cannot be empty"
        if refine_graph:
            assert min_w > 0, "minimum size must be >0 for refinement"
        for qid in target_node_list:
            assert qid in self.name_index_map, "Query: {} not found".format(qid)

        # 1. get all the candidate nodes
        node_ids = [self.name_index_map[n] for n in target_node_list]
        if rule == "root":
            subg = set(self.relation_search(node_ids, "children"))
            logger.info("Context graph rooted at {}: {} out of {} kept"
                .format(target_node_list, len(subg), len(self.nodes)))
        if rule == "waypoint":
            subg1 = set(self.relation_search(node_ids, "children"))
            subg2 = set(self.relation_search(node_ids, "parents"))
            subg = subg1 | subg2
            logger.info("Context graph anchored at {}: {} out of {} kept"
                .format(target_node_list, len(subg), len(self.nodes)))
        if rule == "leaf":
            subg = set(self.relation_search(node_ids, "parents"))
            logger.info("Context graph with leaves at {}: {} out of {} kept"
                .format(target_node_list, len(subg), len(self.nodes)))

        # 2. trim the graph based on the node sizes
        # Note: new_map are nodes that are context-specific
        # they techinically are not the same objects as those in self.nodes
        trim = set([i for i in subg if min_w <= self.nodes[i].weight <= max_w])
        new_map, new_roots = self.create_map_to_context_nodes(trim)
        logger.debug("Kept {} out of {} go terms in range [{}, {}]) "
            .format(len(trim), len(new_map), min_w, max_w))

        # 3. (optional) go-dag refinement
        if refine_graph:
            new_map = self.filter_redundant_nodes(node_map=new_map, roots=new_roots)
            logger.info("number of nodes after filtering: {}".format(len(new_map)))

        new_map = self.update_intrinsic_levels("depth", node_map = new_map)
        new_map = self.update_intrinsic_levels("height", node_map = new_map)
        # logger.info("Updated intrinsic levels: {}".format(len(new_map)))
        # find the roots and store them
        roots = self.find_nodes_in_context("root", set(new_map), new_map)
        roots = [self.nodes[r].name for r in roots]
        leaves = self.find_nodes_in_context("leaf", set(new_map), new_map)
        leaves = [self.nodes[r].name for r in leaves]

        # update the context specific parameters
        context_graph = OrderedContext()
        context_graph.populate(new_map)
        context_params = {
            "anchor_rule": rule,
            "anchors": sorted(target_node_list),
            "min_node_size": min_w,
            "max_node_size": max_w,
            "refine_graph": refine_graph,
            "roots": sorted(roots),
            "leaves": sorted(leaves),
        }

        if store_context:
            self.context_graph  = context_graph
            self.context_params = context_params

        self.main_statistician.populate( # TODO: MAKE MORE PRECISE LATER (THIS COULD CAUSE A BUG )
                    context_params,
                    context_graph,
                    self.go_gene_map,
                    self.gene_go_map,
                    self.gene_conversion_map,
                    self.go_annotation)

        return context_graph, context_params

    def select_focus_nodes(self,
                           query_set,
                           context_map,
                           params):
        # unpack parameters
        rule = params["rule"]
        max_descendents = params["max_descendents"]
        force_all_descendents = params["force_all_descendents"]

        rule_set = ["waypoint", "leaf"]
        assert rule in rule_set, "rule must be in {}".format(rule_set)

        subg = set()
        # maybe highlight node with  not all children (or parents) shown
        # for now only highlight lower nodes that have this property
        hidedown = set()
        if rule in ["waypoint", "leaf"]:
            # get all of the ancestors
            subg = subg | set(self.relation_search(query_set, "parents",
                                                   node_map=context_map))
            logger.info("Retrieved upper nodes ({})".format(len(subg)))
        if rule == "waypoint":
            # selectively choose which descendents to display
            subg_low = set()
            subg_children = set()
            if force_all_descendents:
                logger.info("Forcing all descendents")

            for single_query in query_set:
                q_desc = set(self.relation_search([single_query], "children",
                                                  node_map=context_map))
                if force_all_descendents:
                    subg_low = subg_low | q_desc
                    continue

                if len(q_desc) > max_descendents:
                    q_children= set(self.find_neighbors(single_query,
                                       "children", node_map=context_map))
                    logger.debug("{} has {} descendents (>{}), ".format(
                                 self.nodes[single_query].name,
                                 len(q_desc) - 1, max_descendents) +
                                 "using {} children instead".format(
                                 len(q_children)))
                    subg_children = subg_children | q_children
                    subg_low = subg_low | q_children
                else:
                    subg_low = subg_low | q_desc
            logger.info("Retrieved lower nodes ({})".format(len(subg_low)))
            subg = subg | subg_low
            # (optional) mark nodes that do not have all children displayed
            for node_id in  subg_children:
                num_child_in_context = len(self.find_neighbors(node_id,
                                       "children", node_map=context_map))
                num_child_in_focus = len(self.find_neighbors(node_id,
                                       "children", node_map=context_map,
                                       restrict_set=subg))
                if num_child_in_context > num_child_in_focus:
                    hidedown.add(node_id)
        # order the focus nodes based on the anchors in each context
        logger.info("Total nodes in focus graph: {}".format(len(subg)))
        logger.info("Desc nodes with hidden nodes: {}".format(len(hidedown)))

        return subg, hidedown

    def create_node_group_order(self,
                                focus_node_level,
                                groups,
                                level_type,
                                context_map):
        g_sizes = {i : 0 for i in range(len(groups))}
        g_widths = {i : 0 for i in range(len(groups))}
        for i_group, group in enumerate(groups):
            g_lev_map = self.create_level_node_map(focus_node_level,
                                                   node_indices=group)
            g_sizes[i_group] = sum([len(g_lev_map[l]) for l in g_lev_map])
            g_widths[i_group] = max([len(g_lev_map[l]) for l in g_lev_map])
        # pick the narrowest group as the starting point
        g_narrowest = 0
        min_width = len(focus_node_level)
        for i_group in g_widths.keys():
            width = g_widths[i_group]
            if width < min_width:
                min_width = width
                g_narrowest = i_group

        # key info to be updated for node group order and node ordering
        node_group_orders = {}
        node_orders = {}
        res_node_lev = focus_node_level.copy()
        curr_offset = 0
        while len(g_sizes) > 0:
            if len(g_sizes) == len(groups):
                include_group = g_narrowest # first iteration
            else: # pick the group with the smallest group size
                include_group = min(g_sizes, key = g_sizes.get)

            logger.debug("Including group: {}".format(include_group))

            old_group_node_ids =  groups[include_group]
            # move the nodes in the group into a new group
            n_to_order = []
            for node_id in old_group_node_ids:
                if node_id in res_node_lev:
                    res_node_lev.pop(node_id, None)
                    n_to_order.append(node_id)
            gnord = self.compute_node_order(n_to_order,
                                            level_type,
                                            context_map)
            node_group_orders.update(gnord)

            # remove this group and recompute size of the remaining groups
            g_sizes.pop(include_group, None)
            for i_group in g_sizes: # consider the remaining groups
                group = groups[i_group]
                # the residual node level will account for removed nodes
                g_lev_map = self.create_level_node_map(res_node_lev,
                                                       node_indices=group)
                g_sizes[i_group] = sum([len(g_lev_map[l]) for l in g_lev_map])
                g_widths[i_group] = max([len(g_lev_map[l]) for l in g_lev_map])

            # offset should be the size of the removed group plus old offset
            nord = { n : (gnord[n] + curr_offset) for n in gnord}
            curr_offset += g_widths[include_group]
            node_orders.update(nord)

        return node_group_orders, node_orders

    def create_focus_layout(self,
                            query_set,
                            fnode_set,
                            context_map,
                            params):

        # this modifies the nodes in the ordered context
        gap_break = params["gap_break"]
        grouped = params["grouped"]
        level_types = ["depth", "height", "flex"]

        # 1. group the focus nodes based on context queries
        if grouped:
            groups = self.create_node_grouping(query_set,
                                               context_map,
                                               restrict_set=fnode_set)
        else:
            groups = [fnode_set] # one group with everything
        assert len(set.union(*groups)) == len(fnode_set), "group node error"
        logger.info("Created {} groups in the focus graph - sizes: {}".format(
            len(groups), [len(g)  for g in groups]))
        for level_type in level_types:
            logger.info("Generating layout for '{}' levels".format(level_type))
            if level_type == "flex":
                # the depth and height level of each focus node is already
                # computed so here it will depend on whether the levels for
                # flex/bouyant mode needs to be recomputed based on focus
                self.compute_focus_flex_level(fnode_set, context_map,
                                              gap_break = gap_break)
            focus_node_level = {}
            for node_index in fnode_set:
                context_node = context_map[node_index] # retrieve the Node object
                focus_node_level[node_index] = getattr(context_node, level_type)

            node_group_orders, node_orders = self.create_node_group_order(
                    focus_node_level, groups, level_type, context_map)
            # TODO: maybe update later
            for node_id in node_orders:
                node = context_map[node_id]
                ord_attr = "{}_order".format(level_type)
                grp_ord_attr = "group_{}_order".format(level_type)
                setattr(node, ord_attr, node_orders[node_id])
                setattr(node, grp_ord_attr, node_group_orders[node_id])
            # for node_id in node_orders:
            #     print("{}\tlevel:{}\torder:{}".format(node_id,
            #           context[node_id].depth, context[node_id].depth_order))

    def setup_focus_graph(self,
                          query_go_ids,
                          ordered_context=None,
                          rule="waypoint",
                          max_descendents=10,
                          force_all_descendents=False,
                          gap_break=5000,
                          grouped=True,
                          ):

        # TODO: the context needs to be user-specific
        context_map = {} # node id : Node in OrderedContext()
        for nid, cid in ordered_context.sorted_index_map.items():
            context_map[nid] = ordered_context.sorted_nodes[cid]
        # OLD:
        # cnode_set = set(self.context_graph.sorted_index_map.keys())
        # parameters
        foc_sel_params = {
            "rule" : rule,
            "max_descendents": max_descendents,
            "force_all_descendents" : force_all_descendents
        }
        layout_params = {
            "gap_break" : gap_break,
            "grouped": grouped,
        }

        # 1. interpret the context query
        # ------------------------------------
        # convert the query from GO to internal indices
        assert isinstance(query_go_ids, list), "nodes should be list type"
        # assert len(query_go_ids) > 0, "node list cannot be empty"
        for qid in query_go_ids:
            assert qid in self.name_index_map, "Query: {} not found".format(qid)
        query_node_indices = [self.name_index_map[qn] for qn in query_go_ids]
        # only add nodes in the nodes if they are in the context
        context_query = set()
        for node_i in query_node_indices:
            if node_i not in self.context_graph.sorted_index_map:
                logger.warning("Node {} ({}) is not in the context".format(
                                  self.nodes[node_i].name, node_i))
            else:
                context_query.add(node_i)
        # handle the case where no valid anchors are used
        # if there are no valid context queries, use the root of the context
        if not context_query:
            for root in self.context_params["roots"]:
              context_query.add(self.name_index_map[root])
        logger.debug("Retrieving focus using targets: {}".format(context_query))

        # 2. select nodes to be in the focus
        # ------------------------------------
        fnode_set, hidedown_set = self.select_focus_nodes(context_query,
                                                          context_map,
                                                          foc_sel_params)
        # 3. focus node layout in context
        # ------------------------------------
        # create groups of focus queries - modifies the ordered_context input
        self.create_focus_layout(context_query,
                                 fnode_set,
                                 context_map,
                                 layout_params)

        # 4. context structure (for flex/bouyant mode)
        # ------------------------------------
        context_meta = {}
        flex_out = ordered_context.bouyant_context_layout(fnode_set)
        for level_info in ["level_counts", "level_breaks", "level_starts"]:
            context_meta[level_info] = {}
            context_meta[level_info] = {}
            context_meta[level_info]["flex"] = flex_out[level_info]
        # sort the index map based on the context ids
        # map from the node ids to the focus node ids
        # the context node ids are techinically supposed to sort how the
        # fnode_set should be
        cntx_id_map = ordered_context.sorted_index_map
        sorted_nodes = ordered_context.sorted_nodes
        cntx_ids = sorted([cntx_id_map[nid] for nid in fnode_set])
        idx_map = { sorted_nodes[cid].id : i for i, cid in enumerate(cntx_ids)}

        # get all focus node relatives and count how many nodes there are
        subg = set() # the set of *ids* that are relatives of the focus
        for relation in ["children", "parents"]:
            subg = subg | set(self.relation_search(context_query, relation,
                                                   node_map=context_map))
        # we want to make sure we are counting among the *cids*
        lev_cnt_rel = {}
        for view in ["depth", "height", "flex"]:
            if view == "flex":
                n_levs = len(context_meta["level_counts"]["flex"])
            else:
                n_levs = len(ordered_context.fixed_level_nodes[view])
            lev_cnt_rel[view] = []
            for i_lev in range(n_levs):
                lev_cnt_rel[view].append([])
        for nid in subg:
            # get the depth, height and flex level index of this node
            cid = cntx_id_map[nid]
            node = sorted_nodes[cid]
            for view in ["depth", "height"]:
                lev = getattr(node, view)
                lev_cnt_rel[view][lev].append(cid)
            # handle the buoyant search here
            for i, start in enumerate(context_meta["level_starts"]["flex"]):
                lev = i
                if cid <= start:
                    break
            lev_cnt_rel["flex"][lev].append(cid)
        context_meta["level_counts_focus_relatives"] = lev_cnt_rel

        focus_graph = self.prepare_focus_graph_output(context_query,
                                                      fnode_set,
                                                      idx_map,
                                                      context = context_map)
        focus_max_range = self.get_focus_graph_max_range(focus_graph)
        idx_map = ordered_context.sorted_index_map
        anchor_go_ids = {self.nodes[i].name:idx_map[i] for i in context_query}
        prolif_go_ids = {self.nodes[i].name:idx_map[i] for i in hidedown_set}
        return {"focus_info": {"graph": focus_graph,
                                "meta": {
                                    "max_range": focus_max_range,
                                    "anchors": anchor_go_ids,
                                    "prolifs": prolif_go_ids,
                                    }},
                "context_info": {"graph": {},
                                 "meta": context_meta},
               }

    def get_focus_graph_max_range(self, indexed_focus_nodes):
        # position information
        max_range = {}
        for view_t in indexed_focus_nodes[0]["pos_info"]:
            max_range[view_t] = {"x": 0, "y": 0}
        # print(max_range)
        for node in indexed_focus_nodes:
            for view_t in node["pos_info"]:
                for axis in ["x", "y"]:
                    max_range[view_t][axis] = max(max_range[view_t][axis],
                                                  node["pos_info"][view_t][axis])

        return max_range

    # def setup_stat_test_framework(self,
    #                               root="",
    #                               min_w = 1,
    #                               max_w = 30000):

    #     # the hypotheses to be tested needs to be reasonable
    #     # e.g. it should have at least one gene, and one may exclude
    #     # hypotheses that are too general with too many genes here

    #     # trim = self.trim_dag_by_weight(min_w = min_w, max_w = max_w)

    #     if root:
    #         root_idx = self.name_index_map[root]
    #         subg = set(self.relation_search([root_idx], "children"))
    #         logger.info("Using subgraph rooted at {}: {} out of {} kept) "
    #             .format(root, len(subg), len(self.nodes)))
    #     else:
    #         subg = range(len(self.nodes))
    #     # self.contexts["stat_test"] = len(trim)

    #     trim = set([i for i in subg if min_w <= self.nodes[i].weight <= max_w])
    #     logger.info("Kept {} out of {} go terms in range [{}, {}]) "
    #         .format(len(trim), len(subg), min_w, max_w))

    #     # map from orig_i -> new Node (updated depths, heights, parents, children)
    #     # in this map, Node relation holds strongly (no )
    #     new_map, new_roots = self.create_map_to_context_nodes(trim)
    #     # process the map for further node removal / updates here
    #     new_map = self.filter_redundant_nodes(node_map=new_map, roots=new_roots)
    #     logger.info("# of nodes after filtering: {}".format(len(new_map)))
    #     new_map = self.update_intrinsic_levels("depth", node_map = new_map)
    #     new_map = self.update_intrinsic_levels("height", node_map = new_map)
    #     logger.info("Updated intrinsic levels: {}".format(len(new_map)))
    #     self.context_map["full_context"] = {i: n for i, n in enumerate(self.nodes)}
    #     self.context_map["test_context"] = new_map
    #     self.update_context_indices(new_map)

    #     # update the context specific parameters
    #     self.main_test_context = OrderedContext()
    #     self.main_test_context.populate(new_map)
    #     self.main_statistician = GOStat()
    #     self.main_statistician.populate(
    #         {"root": root, "min_w": min_w, "max_w": max_w},
    #         self.main_test_context,
    #         self.go_gene_map,
    #         self.gene_go_map,
    #         self.gene_conversion_map,
    #         self.go_annotation)

    #     # TODO: remove in the future
    #     self.stat_test_context_nodes = new_map

    # def store_gene_conversion_map(self, gene_conversion_map):
    #     self.gene_conversion_map = gene_conversion_map
    def setup_full_dag(self, use_cache=True):
        """
        Integrates annotaiton information to the GO DAG

        This steps includes reading the annotation files for a particular
        root DAG and a particular species, and creating the core structure
        for context and focus selection, as well as statistical testing.
        The parameters (root, species and etc.) were determined when the
        GODAGraph object is created.

        Parameters
        ----------
        use_cache : :obj:`bool`
            Whether or not to store/use a cached version of the DAG

        Returns
        -------
        dict
            a dictionary mapping from node indices to context Node objects

        """
        if use_cache and os.path.exists(self.go_fname):
            self.load_from_file()
            return

        # Global variables: the full go graph
        self.gohelper.get_all_annotation(download=False)
        if self.ontology == "biological_process" :
            logger.info("Using is_a only for {}".format(self.ontology))
            is_a_only = True
        else:
            is_a_only = False

        self.create_graph_from_root(is_a_only = is_a_only)
        self.update_with_gene_annotations()
        self.save_to_file() # save information to file

    def restore_testing_configuration(self, data_dir):
        logger.info("Restoring testing configuration from {}".format(data_dir))
        p_fn, p_ft = self.get_file_info("meta_restore_params")
        p_fn = os.path.join(data_dir, p_fn)
        all_params = load_data_from_file(p_fn, p_ft)
        context_params = all_params["context_params"]
        test_params = all_params["test_params"]
        sim_params = all_params["oneway_params"]
        # restore the testing context
        self.setup_context_graph(
            context_params["anchor_rule"], context_params["anchors"],
            min_w = int(context_params["min_node_size"]), # int
            max_w = int(context_params["max_node_size"]), # int
            refine_graph = context_params["refine_graph"], # boolean
            store_context=True
            )
        mstat = self.main_statistician
        mstat.set_test_attr_from_dict(test_params)
        # restore the signal genes
        g_fn, g_ft = self.get_file_info("meta_nonnull_gene_ids")
        g_fn = os.path.join(data_dir, g_fn)
        gene_list = load_data_from_file(g_fn, g_ft)
        mstat.determine_non_null(gene_list)
        # restore the simulation setup
        mstat.setup_simulation_oneway(sim_params)
        logger.info("Finished restoration!")

    # def restore_stat_test(self, data_dir):
    #     logger.info("Restoring simulation from {}".format(data_dir))
    #     # load the paramter files
    #     p_fn, p_ft = self.get_file_info("meta_restore_params")
    #     p_fn = os.path.join(data_dir, p_fn)
    #     all_params = load_data_from_file(p_fn, p_ft)
    #     init_params = all_params["init_params"]
    #     test_params = all_params["test_params"]
    #     sim_params = all_params["oneway_params"]
    #     # load the nonnull genes
    #     g_fn, g_ft = self.get_file_info("meta_nonnull_gene_ids")
    #     g_fn = os.path.join(data_dir, g_fn)
    #     gene_list = load_data_from_file(g_fn, g_ft)
    #     # restore the pipeline
    #     self.setup_stat_test_framework(root=init_params["root"],
    #                                    min_w=init_params["min_w"],
    #                                    max_w=init_params["max_w"])

    #     mstat = self.main_statistician
    #     mstat.set_test_attr_from_dict(test_params)
    #     mstat.determine_non_null(gene_list)
    #     # test_attr = mstat.get_test_attr_as_dict()
    #     mstat.setup_simulation_oneway(sim_params)
    #     logger.info("Finished restoration!")

    # caching to save-load dag
    def save_to_file(self):
        # save the node list with parent-children indices to list
        logger.warning("GO and simulation helpers will not be stored")
        fname = self.go_fname
        out_data =  self.__dict__
        out_data.pop("gohelper", None)
        out_data.pop("simhelper", None)
        pickle.dump(out_data, open(fname, "wb"))
        logger.info("Saved DAG to file: {}".format(fname))

    def load_from_file(self):
        fname = self.go_fname
        logger.info("Loading DAG from file: {}".format(fname))
        self.__dict__ = pickle.load(open(fname, "rb"))
        logger.warning("GO and Simulation helpers will not be loaded")

    def generate_level_cnt_maps(self):

        levelcnt_map = {}
        # append the test_in_full mode
        tf_cnxt = "test_in_full"
        levelcnt_map[tf_cnxt] = {}
        for lev_t in ["depth", "height"]:
            levelcnt_map[tf_cnxt][lev_t] = {}
        # the test and full modes
        for cxt_t in self.context_map:
            levelcnt_map[cxt_t] = {}
            for lev_t in ["depth", "height"]:
                levelcnt_map[cxt_t][lev_t] = {}
        for go in self.go_gene_map:
            node_i = self.name_index_map[go]
            for cxt_t in self.context_map:
                if node_i in self.context_map[cxt_t]: # within context
                    cnode = self.context_map[cxt_t][node_i]
                    for lev_t in ["depth", "height"]:
                        level = getattr(cnode, lev_t)
                        if level in levelcnt_map[cxt_t][lev_t]:
                            levelcnt_map[cxt_t][lev_t][level] += 1
                        else:
                            levelcnt_map[cxt_t][lev_t][level] = 1
                        if (cxt_t == "full_context"):
                            if node_i in self.context_map["test_context"]:
                                if level in levelcnt_map[tf_cnxt][lev_t]:
                                    levelcnt_map[tf_cnxt][lev_t][level] += 1
                                else:
                                    levelcnt_map[tf_cnxt][lev_t][level] = 1
        # make the level maps into lists of values
        for cxt_t in (list(self.context_map.keys()) + ["test_in_full"]):
            for lev_t in ["depth", "height"]:
                old_dict = levelcnt_map[cxt_t][lev_t]
                n_lev = max(old_dict) + 1 # maximum level + 1
                new_list = [0] * n_lev
                for i_lev in range(n_lev):
                    if i_lev in old_dict:
                        new_list[i_lev] = levelcnt_map[cxt_t][lev_t][i_lev]
                levelcnt_map[cxt_t][lev_t] = new_list
        return levelcnt_map

    def output_general_info(self):
        """
        Function to output general data (pre-context) for front-end
        """
        logger.info("Outputing data for {}, root: {}, species: {}".format(
            self.ontology, self.root, self.species))
        # prepare the dictionary search map {"GO_NAME [GO_ID]" : "GO_ID"}
        # prepare the annotation count map {"GO_ID": number_of_genes}
        # search_dict = {}
        go_gene_cnt = {}
        for term_id in self.go_annotation:
            # term_name = self.go_annotation[term_id]
            num_genes = len(self.go_gene_map[term_id])
            # search_str = "{} [{}]".format(term_name, term_id)
            #  search_dict[search_str] = term_id
            go_gene_cnt[term_id] = num_genes

        return {
            "search_dict" : self.go_annotation,
            "go_gene_cnt" : go_gene_cnt,
            "ontology_root_id": self.root,
        }

    def output_context_info(self, c_graph):
        """
        Function to output data for front-end
        """

        # node information
        node_data = c_graph.output_lite_node_info()
        nodes = c_graph.sorted_nodes
        name_id_map = {n.name : i for i, n in enumerate(nodes)}

        # fixed level information
        fixed_level_nodes = c_graph.fixed_level_nodes
        fixed_lev_cnts = {}
        max_level = {}
        for lev_t in ["depth", "height"]:
            fix_cnts = c_graph.generate_fixed_level_counts(lev_t)
            fixed_lev_cnts[lev_t] = fix_cnts
            max_level[lev_t] = len(fix_cnts) - 1

        # handle annotations here
        go_gene_map = [sorted(list(self.go_gene_map[n.name])) for n in nodes]
        logger.info("Stat go->gene: {}".format(len(go_gene_map)))
        gene_go_map = self.gene_conversion_map
        logger.info("Stat gene->go: {}".format(len(self.gene_go_map)))
        conv_map = self.gene_conversion_map
        gene_id_sym_map = {g : conv_map[str(g)] for g in gene_go_map}
        gene_sym_id_map = {conv_map[str(g)] : g for g in gene_go_map}
        logger.info("Stat gene convers.: {}".format(len(gene_sym_id_map)))
        go_annotations = [self.go_annotation[n.name] for n in nodes]
        logger.info("Go annotations: {}".format(len(go_annotations)))

        output_data = {
            "node_data": node_data,
            "level_counts" : fixed_lev_cnts,
            "name_id_map": name_id_map,
            "fixed_level_nodes": fixed_level_nodes,
            "go_gene_map": go_gene_map,
            "gene_go_map": gene_go_map,
            "go_anns": go_annotations, # TODO: remove
            "gene_id_sym_map": gene_id_sym_map,
            "gene_sym_id_map": gene_sym_id_map,
            "max_level": max_level
        }
        return output_data

    def output_excluded_info(self, verbose = False):
        full_cntx = self.context_map["full_context"]
        test_cntx = self.context_map["test_context"]
        go_gene_map = self.go_gene_map
        go_annotation = self.go_annotation
        out_info = []
        for node_i in full_cntx:
            if node_i not in test_cntx:
                term = full_cntx[node_i].name
                if verbose:
                    gene_info = list(go_gene_map[term])
                else:
                    gene_info = len(go_gene_map[term])
                out_info.append([term,
                                 go_annotation[term],
                                 gene_info])
        logger.info("Excluded: {} terms".format(len(out_info)))
        return out_info


    # def prepare_index_mapping(self, small_set, large_set):
    #     assert isinstance(small_set, set), "Type-error of node_set"
    #     assert isinstance(large_set, set), "Type-error of node_set"
    #     # reserve mapping in the small set first and then the remains of largest
    #     ordering = list(small_set) + list(large_set - small_set)
    #     rev_map = {orig_i : i for i, orig_i in enumerate(ordering)}
    #     return rev_map

    def prepare_focus_graph_output(self,
                                   query_set,
                                   node_set,
                                   index_map,
                                   context = None):
        assert isinstance(node_set, set), "Type-error of node_set"
        if not context: # flexible type
            context = self.nodes
        # list of nodes to be displayed (they should already be processed)
        # the Node attribute will be parsed and re-indexed for the front-end
        include_nodes = [None] * len(node_set)
        # index_map = {n.id : i for i, n in enumerate(include_nodes)}
        # primary attribute setup
        for node_i in node_set:
            node = context[node_i]
            pos_info = node.get_position_info()
            # print(node.children)
            # update with only the primary information
            updates_children = [index_map[idx] for idx in node.children
                                 if idx in node_set]
            updates_parents = [index_map[idx] for idx in node.parents
                                 if idx in node_set]
            include_nodes[index_map[node_i]] = {
                "id" : index_map[node.id],
                "cid": node.cid,
                "name": node.name,
                "parents": updates_parents,
                "children": updates_children,
                "pos_info": pos_info,
                "queried": node_i in query_set
            }
        return include_nodes

    # initilialization to propagate node information
    def create_graph_from_root(self, is_a_only=False):
        """
        This function utilizes gohelper and goatools to parse the obo file
        The parsed file will be cached techinically, so this technically
        needs to run only once. Note it is slower, so it makes sense to use
        our more efficient GODAGraph Object.

        is_a_only: it will only include is_a; otherwise it will include
                   all the related nodes (is_a and others)
                   (as of goatools version 0.8.4)
        """
        root = self.root
        logger.info("Root: {}".format(root))
        goadag = self.gohelper.info
        logger.debug(goadag[root])
        # first pass, go through layers to extract the root information
        node_count = 0
        curr_depth = 0
        queue = deque([root])
        while (queue): # non-empty queue
            logger.info("Current depth: {}".format(curr_depth))
            curr_cnt = len(queue)
            while (curr_cnt > 0):
                curr_name = queue.popleft()
                # this following is due to goatools's api
                if is_a_only:
                    parents = goadag[curr_name].parents
                    children = goadag[curr_name].children
                else:
                    parents = goadag[curr_name].get_goterms_upper()
                    children = goadag[curr_name].get_goterms_lower()
                # add this node to the graph (if it is newly seen)
                if curr_name not in self.name_index_map:
                    self.name_index_map[curr_name] = node_count
                    node = Node(id=node_count, name=curr_name)
                    node.root_distance = curr_depth # shortest path from root
                    if len(parents) == 0 or curr_name == root :
                        node.root = True
                        self.roots.append(node.id)
                    if len(children) == 0:
                        node.leaf = True
                        self.leaves.append(node.id)
                    self.nodes.append(node)
                    node_count += 1
                # store the longest path to root
                self.nodes[self.name_index_map[curr_name]].depth = curr_depth
                # search for new nodes based on children
                for name in children:
                    queue.append(name.id)
                curr_cnt -= 1
            curr_depth += 1
        logger.info("Number of nodes :\t{}".format(len(self.nodes)))

        # second pass, parse through all links
        for node_idx, node in enumerate(self.nodes):
            if is_a_only:
                parents = goadag[node.name].parents
                children = goadag[node.name].children
            else:
                parents = goadag[node.name].get_goterms_upper()
                children = goadag[node.name].get_goterms_lower()
            for parent_name in parents:
                if parent_name.id in self.name_index_map:
                    parent_idx = self.name_index_map[parent_name.id]
                    self.nodes[node_idx].parents.append(parent_idx)
            for child_name in children:
                if child_name.id in self.name_index_map:
                    child_idx = self.name_index_map[child_name.id]
                    self.nodes[node_idx].children.append(child_idx)
                    # only include links here
                    link = Link(child_idx, node_idx)
                    self.links.append(link)

        logger.info("Number of links :\t{}".format(len(self.links)))
        logger.info("Number of roots :\t{}".format(len(self.roots)))
        logger.info("Number of leaves :\t{}".format(len(self.leaves)))

        # third pass, recompute the heights from the leaves
        logger.info("Computing heights for each node...")
        height_dict = self.relation_search(self.leaves, 'parents')
        for node_index in height_dict:
            self.nodes[node_index].height = height_dict[node_index]


    def generate_random_pvalues(self):
        n_pvals = len(self.context_map["test_context"])
        return np.random.rand(n_pvals).tolist()


    def get_example_gene_set(self, example_i):
        random_gene_mito = ["Snx9", "Iqgap3", "Bin3", "Pds5a",
                     "Kif14", "Nae1", "Zwilch", "Kif2c",
                     "Tubgcp5", "Wnt9a", "Ints3", "Blm",
                     "Chek2", "Golga2", "Arhgef10",
                     "Pml", "Ush1c", "Nek11", "Eps8", "Ndel1",
                     "Aurkc", "Fanci", "Rab11a", "Rb1", "Cdc23"]
        all_mito_checkpoint = ["Blm", "Brca1", "Ccng1", "Cdk1", "Hus1",
                     "Ier3", "Mbd4", "Mre11a", "Rad17", "Nbn",
                     "Foxo4", "Donson", "Zfp830", "Mrnip", "Nop53",
                     "Syf2", "D7Ertd443e", "Mus81", "Oraov1", "Ticrr",
                     "Cdk5rap3", "Fanci", "Hus1b", "Nae1", "Topbp1", "Clspn",
                     "Taok3"]
        ground_truths = [random_gene_mito,
                         all_mito_checkpoint,
                         random_gene_mito[1:3]]
        return ground_truths[example_i]

    def get_example_params(self):
        params = {"n_regimes": 10,
                  "n_reps" : 10,
                  "n_controls" : 20,
                  "n_cases": 20,
                  "max_eff_size": 5.0,
                 }
        return params

    def example_simulation(self, fixed_size=True, use_cache=False):

        output_pfx = "mitotic_example"
        params = self.get_example_params()

        self.setup_stat_test_framework(root="GO:0022402")
        mstat = self.main_statistician
        n_examples = 3
        output_results = [{} for g in range(n_examples)]
        for i in range(n_examples):
            signal_genes = self.get_example_gene_set(i)
            dirname = "mitotic_example_{}_{}_terms".format(i, len(mstat.go_gene_map))
            result_dir = os.path.join(self.cache_dir, dirname)
            if not os.path.exists(result_dir):
                os.makedirs(result_dir)
                logger.info("Created folder: {}".format(result_dir))
            # self.output_non_null_go_terms(signal_genes)
            g_list = mstat.convert_gene_from_to("sym", "id", signal_genes)
            mstat.determine_non_null(g_list)
            mstat.setup_simulation_oneway(params)
            # save the simulation information to file
            store_params ={}
            for key in mstat.simulator.__dict__:
                if key in ["trial_params", "trial_summary"]:
                    continue
                store_params[key] = mstat.simulator.__dict__[key]
            fname = "simulation_parameters"
            result_dict = {"nonnull_nodes": mstat.nonnull_nodes.copy(),
                           "nonnull_genes": mstat.nonnull_genes.copy()}
            if use_cache:
                result_types = [
                        "node_meta",
                        "trial_node_pvalues",
                        "trial_node_rejects",
                        "trial_sum_stat"]
                for result in result_types:
                    fname = os.path.join(result_dir, result+".pkl")
                    result_dict[result] = pickle.load(open(fname, "rb"))
                    logger.info("Loaded: {}".format(fname))
            else:
                result_data = mstat.run_simulation_pipeline(fixed_size=fixed_size)
                # maybe use h5 in the future for the data?
                for key in result_data:
                    # store node_pvalues
                    # store rejections
                    # store summary statistics
                    result_dict[key] = result_data[key]
                    fname = os.path.join(result_dir, key+".pkl")
                    pickle.dump(result_dict, open(fname, "wb"))
                    logger.info("Saved data to file: {}".format(fname))

            output_results[i] = result_dict
        return output_results

    def plot_full_result(self, data_dir):
        full_res = self.load_full_test_summary(data_dir)
        method_test = self.main_statistician.method_test[::-1]
        method_madj = self.main_statistician.method_madj
        metrics = self.main_statistician.report_metrics
        alpha = self.main_statistician.method_alpha[0]
        method_cols = ["#0020AE", "#FFA200"]
        fig, axes = plt.subplots(nrows=len(metrics),
                                 ncols=len(method_test),
                                 sharey="row",
                                 sharex="col",
                                 figsize = (14,8))

        for i_row in range(len(metrics)):
            for i_col in range(len(method_test)):
                ax = axes[i_row][i_col]
                method = method_test[i_col]
                metric = metrics[i_row]
                plot_group_bars(full_res[method][metric],
                                method_madj,
                                method_cols,
                                ax=ax)

                if i_col == 0:
                    ax.set_ylabel(metric)
                if i_row == axes.shape[0] - 1:
                    ax.set_xlabel("Regime")
                if metrics[i_row] == "FDR":
                    ax.set_ylim(0,1)
                    ax.axhline(y=alpha, color='k', linestyle='--', linewidth=1)
                if metrics[i_row] == "Power":
                    ax.set_ylim(0,1)
                if i_col == 0 and i_row == 0:
                    pass
                else:
                    ax.legend_.remove()
        for ax, col in zip(axes[0], method_test):
            ax.set_title(col)
        plt.tight_layout()
