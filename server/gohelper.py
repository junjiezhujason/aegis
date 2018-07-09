#!/usr/bin/env python3
#title           :gohelper.py
#description     :helper functions to work with gene ontology data
#author          :Junjie Zhu
#date            :20171128
#version         :0.1
#usage           :
#notes           :
#python_version  :3.6.0
#==============================================================================

# source: http://nbviewer.jupyter.org/urls/dessimozlab.github.io/go-handbook
# source: http://gohandbook.org/doku.php

import logging
import os
import wget
import optparse
import Bio.UniProt.GOA as GOA
import mygene
from goatools import obo_parser
from goatools.base import gzip_open_to
from goatools.associations import read_ncbi_gene2go
import json

logger = logging.getLogger(__name__)
# logging.basicConfig(format='[%(asctime)s %(name)s %(levelname)s] %(message)s',
#                             datefmt='%I:%M:%S', level=logging.DEBUG)

class GOHelper(object):

    def __init__(self, local_dir, species):
        self.local_dir = local_dir
        self.obo_path = os.path.join(self.local_dir, 'go-basic.obo')
        self.gene2go_path = os.path.join(self.local_dir, 'gene2go')
        self.info = None # general

        taxid_map = {"mouse": [10090], "human": [9606]}
        assert species in taxid_map,"Species: {} not defined!".format(species)
        self.species = species
        self.taxids = taxid_map[species]
        self.geneid2sym_path = os.path.join(self.local_dir,
            'geneid2sym_{}.json'.format(self.species))

        # query-specifid information
        # self.query_go_terms = {}
        # self.query_genes = {}
        # self.gene2go_dict = {}
        # self.go2gene_dict = {}
        self.gene_conversion_map = {}

        self.go_obo_url = "http://purl.obolibrary.org/obo/go/go-basic.obo"
        self.gene2go_url = "ftp://ftp.ncbi.nlm.nih.gov/gene/DATA/gene2go.gz"

        # setup the goa paths to be downloaded
        goa_db = "ftp://ftp.ebi.ac.uk/pub/databases/GO/goa/"
        f_name = 'goa_{}.gaf.gz'.format(species) # file name
        self.goa_path = os.path.join(self.local_dir, f_name)
        if species == "mouse":
            self.goa_url = goa_db + "MOUSE/" + f_name
        elif species == "human":
            self.goa_url = goa_db + "HUMAN/" + f_name
        else:
            logger.error("Species: {} not found".format(species))

        # create the local data directory if it does not exsist
        if not os.path.isfile(local_dir):
            try:
                os.mkdir(local_dir)
            except OSError as e:
                if(e.errno != 17):
                    raise e

    def download_goa(self):
        goa = wget.download(self.goa_url, self.goa_path)
        logger.info("Downloaded: {}".format(goa))

    def download_go_obo(self):
        go_obo = wget.download(self.go_obo_url, self.obo_path)
        logger.info("Downloaded: {}".format(go_obo))

    def parse_go_obo(self):
        # load the entire go dag
        self.info = obo_parser.GODag(self.obo_path,
                        optional_attrs=["relationship"] )
        logger.info("Finished parsing: {}".format(self.obo_path))

    def download_gene2go(self):
        gene2go = wget.download(self.gene2go_url, self.gene2go_path + ".gz")
        logger.info("Downloaded associations: {}".format(gene2go))
        gzip_open_to(self.gene2go_path + ".gz", self.gene2go_path)
        logger.info("Unzipped to : {}".format(self.gene2go_path))

    def retrieve_relevant_annotations(self, go_ids):
        go_info = {}
        for term in go_ids:
            go_term = self.info[term]
            go_info[go_term.id] = go_term.name
        return go_info

    def save_relevant_go_annotations(self, term_dict, go_fname):
        node_ann = self.retrieve_relevant_annotations(term_dict)
        with open(go_fname, 'w') as fp:
            json.dump(node_ann, fp)
            logger.info("Saved go annotations to: {}".format(go_fname))
        return node_ann

    def load_relevant_go_annotations(self, go_fname):
        with open(go_fname, 'r') as fp:
            node_ann = json.load(fp)
            logger.info("Loaded go annotations from: {}".format(go_fname))
        return node_ann

    def parse_gene2go_info(self, taxids):
        full_gene2go_dict = read_ncbi_gene2go(self.gene2go_path, taxids=taxids)
        return full_gene2go_dict

    def download_geneid2sym_map(self):
        taxids = self.taxids
        g_list = list(self.parse_gene2go_info(taxids).keys())
        mg = mygene.MyGeneInfo()
        output = mg.querymany(g_list, scopes='entrezgene', species=self.species)
        output_dict = {};
        for entry in output:
            output_dict[int(entry['query'])] = entry['symbol'];
        with open(self.geneid2sym_path, 'w') as fp:
            json.dump(output_dict, fp)
            logger.info("Downloaded map to: {}".format(self.geneid2sym_path))

    # def retrieve_gene_converions(self, download=True):
    #     if download: self.download_geneid2sym_map()
    #     with open(self.geneid2sym_path, 'r') as fp:
    #         self.gene_conversion_map = json.load(fp)
    #         logger.info("Loaded mapping from: {}".format(self.geneid2sym_path))

    def create_gene_go_maps(self, query_go_terms={}, query_genes={}):
        # self.query_go_terms = query_go_terms
        # self.query_genes = query_genes
        taxids = self.taxids
        gene2go = self.parse_gene2go_info(taxids)
        # search for "GO:0061804"
        for gene in gene2go:
            if "GO:0061804" in gene2go[gene]:
                print(gene)
                print(gene2go[gene])

        gene2go_dict = {}
        if query_genes:
            # narrow down the gene2go dictionary map
            gene2go = {g : gene2go[g]  for g in gene2go if g in query_genes}

        if query_go_terms:
            logger.info("Using {} GO terms".format(len(query_go_terms)))
            for gene in gene2go:
                new_term_set = set()
                for term in gene2go[gene]:
                    if term in query_go_terms:
                        new_term_set.add(term)
                gene2go_dict[gene] = new_term_set
        else:
            logger.warning("Using all available GO terms in gene2go")
            gene2go_dict = gene2go

        logger.info("Created mappings for GO terms and genes")
        logger.info("Number of genes: {}".format(len(gene2go_dict)))

        return gene2go_dict

    def get_all_annotation(self, download=True):
        """ Load the gene ontology from cache or download
        """
        # the go obo information
        if download:
            self.download_go_obo() # the ontology structure
            self.download_gene2go() # gene -> annotation
            self.download_geneid2sym_map() # gene id, gene symbol, ...

        # download if file does not exisit
        if not os.path.isfile(self.obo_path):
            self.download_go_obo()
        if not os.path.isfile(self.gene2go_path):
            self.download_gene2go()
        if not os.path.isfile(self.geneid2sym_path):
            self.download_geneid2sym_map()

        assert os.path.isfile(self.obo_path), "obo file does not exist!"
        assert os.path.isfile(self.gene2go_path), "gene2go file does not exist!"
        assert os.path.isfile(self.geneid2sym_path), "gene id file does not exist!"

        # parse the ontology
        self.parse_go_obo()
        # the gene id to symbol file
        with open(self.geneid2sym_path, 'r') as fp:
            self.gene_conversion_map = json.load(fp)
            logger.info("Loaded mapping from: {}".format(self.geneid2sym_path))

    # def get_gene_info(self, download=True):
    #     if download: self.download_gene2go()
    #     assert os.path.isfile(self.gene2go_path), "gene2go file does not exist!"
    #     logger.info("Parsing for {} genes...".format(self.species))

if __name__ == '__main__':

    # basic setup for python
    logging.getLogger().setLevel(logging.INFO)
    parser = optparse.OptionParser()
    parser.add_option(
        '-d', '--debug',
        help='enable debug mode',
        action='store_true', default=False)
    parser.add_option(
        '-r', '--root',
        help='which port to serve content on',
        type='str', default='')
    parser.add_option(
        '-w', '--wget',
        help='download the obo file from go',
        action='store_true', default=False)
    opts, args = parser.parse_args()

    if opts.debug:
        print(opts)
