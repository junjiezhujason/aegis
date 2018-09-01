# algorithms.py
import numpy as np
from collections import deque


def count_inverions(A):
    count = 0
    for j in range(1, len(A)):
        for i in range(j):
            if (A[i] > A[j]):
                count += 1
    return count

def inverse_cumsum(z):
    sorted_z = sorted(enumerate(z), key = lambda x: x[1])
    sorted_os = [0] + np.cumsum(np.sort(z))[:(len(z)-1)].tolist()
    # logger.debug(sorted_z)
    # logger.debug(sorted_os)
    offset = [None] * len(z)
    for i, sz in enumerate(sorted_z):
        offset[sz[0]] = sorted_os[i]
    return offset

def bubble_float_algo(nodes,
                      node_weights,
                      node_depths,
                      node_parents,
                      node_order=None,
                      gap_break=3,
                      block_merge=False):
    # heuristic: larger gap break when there are fewer nodes, smaller when larger
    #     node_ids : list of node identifiers
    #     weights : list of topology-preserving weight values
    #     parents : list of list of parent nodes for each node
    #
    node_parents = [set(parents) for parents in node_parents]
    node_data = list(zip(nodes, node_weights, node_parents, node_depths))
    # sort by weight and then by reverse depth
    if node_order:
        node_data = [node_data[i_order] for i_order in node_order]
    else:
        node_data.sort(key= lambda x: (x[1], -x[3]), reverse=True)
    layer_list = [deque([node]) for node in node_data]
    # curr_layer = len(layer_list) - 1
    # print(layer_list)
    curr_l = len(layer_list) - 1
    while (curr_l > 0):
        assert len(layer_list[curr_l-1]) ==1, "Next layer should always be length 1"
        curr_queue = layer_list[curr_l]
        next_l = curr_l - 1
        next_l_node = layer_list[next_l][0]

        # print("------")
        # print("Comparing to next level node: {}".format(next_l_node))
        # print("Layer-{} nodes: {}".format(curr_l, curr_queue))
        if block_merge:
            do_merge = True
            # if the next level node is the parent of this node
            if next_l_node[1] - curr_queue[0][1] > gap_break:
                do_merge = False
            else:
                curr_cnt = 0
                while curr_cnt < len(curr_queue):
                    if next_l_node[0] in curr_queue[curr_cnt][2]:
                        do_merge = False
                        break
                    curr_cnt += 1
            if do_merge: # merge all the queue values
                layer_list[next_l].extend(curr_queue)
                layer_list[curr_l].clear()
        else:
            # must be greater than low_threshold to float
            # low_threshold is the weight of the max-weight node that is
            # a child of the singleton node in the next level
            # this is to handle ties, if one of the nodes in the tie
            # cannot move up, then none of the nodes in the tie can move up
            low_threshold = 0
            for node in curr_queue:
                if next_l_node[0] in node[2]:
                    low_threshold = node[1]
                    break

            while (len(curr_queue) > 0):
                # ties should stay in the same level (always)
                # gap_break (cannot move the layer up up-to this point)
                if curr_queue[0][1] < next_l_node[1] - gap_break:
                    break
                # parent break (determined by low_threshold)
                if curr_queue[0][1] == low_threshold:
                    break
                # and appended to the end of the queue on the next level
                layer_list[next_l].append(curr_queue.popleft())
        curr_l -= 1
        # print("Next layer-{} nodes: {}".format(curr_l, layer_list[curr_l]))
    # print(layer_list)
    layer_list = [layer for layer in layer_list if len(layer) > 0 ] # remove empty layers
    # print("Number of layers after bubble float: {}".format(len(layer_list)))
    # print(layer_list)
    output_list = [None]* len(layer_list)
    for layer_i, layer in enumerate(layer_list):
        output_list[layer_i] = [node[0] for node in layer]
    return(output_list)
