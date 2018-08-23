import os
import pandas as pd
import numpy as np
import logging
logger = logging.getLogger(__name__)


def get_default_params(param_type):
    if (param_type == "test_params"):
        params = {
            'method_alpha': [0.1],
            'method_madj': ['Bonferroni', 'BH'],
            'method_test': ['simes','hypergeometric.ga'],
            'nonnull_params': {
                'comp_nonnull': {'case': 'average', 'ga': 1e-05, 'gs': 100},
                'self_nonnull': {}
                },
            'report_metrics': ['FDR', 'Power', 'NumRej']
            }
    if (param_type == "sim_params_sweep_sample"):
        params = {
            "n_regimes": 5,
            "n_reps" : 10,
            "min_n" : 10,
            "max_n": 130,
            "eff_size": 0.5,
            "sweep_sample_size": True
            }
    if (param_type == "sim_params_sweep_effect"):
        params = {
            "n_regimes": 10,
            "n_reps" : 10,
            "n_controls" : 10,
            "n_cases": 10,
            "max_eff_size": 1.5,
            'sweep_sample_size': False
            }
    return(params)


def setup_random_graph_example():
    ontology_parmams = {
        "ontology": "biological_process",
        "species": "human"
    }
    context_params = {
        'anchor_rule': 'root',
        'refine_graph': True,
        'min_node_size': '1',
        'max_node_size': '17439'
    }

    graph_params = {
        "n_graphs": 200,
        "min_root_size": 500,
        "max_root_size": 10000,
        "min_graph_size": 100,
        "max_signal_genes": 5,
        "signal_type": "single_leaf",
    }
    sim_params = get_default_params("sim_params_sweep_sample")
    sim_params["n_reps"] = 100

    # output summary
    logger.info("Generating {} graphs:".format(graph_params["n_graphs"]))
    logger.info("  random root nodes in range {}-{}".format(
        graph_params["min_root_size"], graph_params["max_root_size"]))
    logger.info("  random signal anchor ({} with max {} genes sampled)".format(
        graph_params["signal_type"], graph_params["max_signal_genes"]))
    logger.info("  minimum graph size {}".format(graph_params["min_graph_size"]))
    logger.info("Universal simulation parameters:")
    logger.info("  signal gene effect size: {}".format(sim_params["eff_size"]))
    logger.info("  sample size range {}-{} ({} regimes, {} repetitions)".format(
        sim_params["min_n"], sim_params["max_n"],
        sim_params["n_regimes"], sim_params["n_reps"]))

    return {
        "ontology_params": ontology_parmams,
        "graph_params": graph_params,
        "context_params": context_params,
        "sim_params": sim_params,
    }

def load_chipseq_example(data_dir):
    # load the significant go terms from the chip-seq study by Valouev et al.
    fn = os.path.join(data_dir, "great_srf_example.tsv" )
    df = pd.read_table(fn, skiprows=1, index_col=False)
    ddict = dict(zip(df[" Term ID "], df["# Term Name "]))
    return ddict

def load_gwas_example(data_dir):
    # load the signifcant go terms from the gwas study by Hysi et al.
    fn = os.path.join(data_dir, "hysi_gwas_example.tsv" )
    df = pd.read_table(fn, header=None)
    ddict = dict(zip(df[0], df[1]))
    # update keys
    old_keys = list(ddict.keys())
    for old_key in old_keys:
        # https://www.ebi.ac.uk/QuickGO/GTerm?id=GO:0006350
        if old_key == "GO:0006350":  # this is a secondary ID
            ddict["GO:0006351"] = ddict.pop(old_key)
        # https://www.ebi.ac.uk/QuickGO/term/GO:0045893
        if old_key == "GO:0045941": # this is a secondary ID
            ddict["GO:0045893"] = ddict.pop(old_key)
        # https://www.ebi.ac.uk/QuickGO/term/GO:0006355
        if old_key == "GO:0045449": # this is a secondary ID
            ddict["GO:0006355"] = ddict.pop(old_key)
    return ddict

def setup_power_example(tissue="heart"):
    # create the configurations of the power analysis examples
    # these examples are based on real analysis of the GTEx data set
    # tissue - "heart": feiglin et al. 2017
    # tissue - "adipose": consortium 2015

    assert tissue in ["heart", "adipose"], "tissue type error"

    ontology_parmams = {"ontology": "biological_process",
                        "species": "human",
                        "version": "20180719"}

    sweep_sample_size = True
    if sweep_sample_size:
        sim_params = get_default_params("sim_params_sweep_sample")
    else:
        sim_params = get_default_params("sim_params_sweep_effect")

    if (tissue == "heart"):
        # GO:0007507 heart development (198 genes)
        # its parent is GO:0048513 animal organ development (1221 genes)
        # but we're interested in GO:0007512 adult heart development (15 genes)
        # to generate the gene set
        context_params = {
            'anchors': ['GO:0048513'],
            'anchor_rule': 'root',
            'refine_graph': True,
            'min_node_size': '1',
            'max_node_size': '17439'
            }
        signal_genes = ['ADRA1A', 'APLNR', 'NKX2-5', 'GJA1', 'MEF2D', 'MNAT1', 'MYH6', 'MYH7', 'MYH10', 'TCAP', 'HAND2', 'BMP10', 'CHD7', 'SCUBE1', 'APELA']
        if sweep_sample_size:
            sim_params["n_regimes"] = 12
            sim_params["n_reps"] = 100
            sim_params["min_n"] = 10
            sim_params["max_n"] = 120
            sim_params["eff_size"] = 0.5
        else:
            sim_params["n_regimes"] = 10

    if (tissue == "adipose"):
        # GO:0035337: fatty-acyl-CoA metabolic process (40 genes)
        # we drew 10 out of 40 genes such that the number of
        # self-contained non-null is less than 300 (e.g., 296)
        # gene_draw_params = { 'terms': ["GO:0035337"],  'num_genes': 10 }
        context_params = {'anchors': ['GO:0008150'], 'anchor_rule': 'root', 'refine_graph': True, 'min_node_size': '1', 'max_node_size': '17439'}
        signal_genes = ['THEM5', 'CBR4', 'ELOVL3', 'ELOVL5', 'TECR', 'PPT2', 'ELOVL7', 'ACSL6', 'ACSBG2', 'ACOT7']
        if sweep_sample_size:
            sim_params["n_regimes"] = 10
            sim_params["n_reps"] = 10
            sim_params["min_n"] = 10
            sim_params["max_n"] = 100
            sim_params["eff_size"] = 0.8
        else:
            sim_params["n_regimes"] = 10

    if sweep_sample_size:
        job_id = "20180823_{}-effect_{}".format(tissue, sim_params["eff_size"])
    else:
        job_id = "20180823_{}-sample_{}".format(tissue, sim_params["n_cases"])

    test_params  = get_default_params("test_params")
    if (tissue == "heart"):
        test_params['nonnull_params']['comp_nonnull']['ga'] = 1e-05
    else:
        test_params['nonnull_params']['comp_nonnull']['ga'] = 1e-06

    return {
        "ontology_params": ontology_parmams,
        "test_params": test_params,
        "context_params": context_params,
        "signal_genes": signal_genes,
        "sim_params": sim_params,
        "job_id": job_id,
    }
