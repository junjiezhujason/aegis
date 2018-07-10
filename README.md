
# Exploratory Gene Ontology Analysis with Interactive Visualization 

## Installation

*Important Requirement*: Python3 (and virtual environment recommended)

See the following links for more information:

    http://docs.python-guide.org/en/latest/
    https://virtualenv.pypa.io/en/stable/

To install dependencies, simply use:

    pip3 install -r requirements.txt

## Getting started with AEGIS 

AEGIS requires specification of a folder: `${LOCALPATH}` to store the 
cached files. This is mainly for performance and version control. For typical 
analysis (excluding simulation outputs), the files typically will typically 
include no more than 250M of disk space. 

### (Optional) downloading cached files
You can download the light cache files (<50M) of (version-controlled) 
species/ontologies from [here] and unpack to the directory `${LOCALPATH}`, e.g.,

    local_${VERSION}.tar.gz

Make sure to expand the file in the `${LOCALPATH}` so that the folder includes
files of the following form

    ${LOCALPATH}/local/godag_*.pkl

### Launching the local server

To launch the server, simply just run `app.py` with Python3:

    python3 app.py --port 5000 --folder ${LOCALPATH}


The current version only supports human and mouse annotations. 
However, the source code can be easily be  modified to include other species.

If this is your first time running AEGIS, it might take a while to download
the gene and go annotations, mainly the following files:

    ${LOCALPATH}/local/gene2go
    ${LOCALPATH}/local/go-basic.obo
    ${LOCALPATH}/local/geneid2sym_human.json
    ${LOCALPATH}/local/geneid2sym_mouse.json

When running 

The current software includes the light-weight locally-stored DAG pickle object 
that is automatically pre-loaded from the cache.  
Once the cache is stored once, most features can be performed locally
without internet connection for ontology or data download.

Finally, open your local browser with

    http://localhost:5000/



