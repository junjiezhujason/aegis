
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


Here is an example of the workflow:
    
    cd ${LOCALPATH}
    wget http://stanford.edu/~jjzhu/fileshare/aegis/local_20180710.tar.gz
    tar -xvzf local_20180710.tar.gz

Make sure to expand the file in the `${LOCALPATH}` so that the folder includes
files of the following form

    ${LOCALPATH}/local/godag_*.pkl

Because the current software includes these light-weight pickle objects
that is automatically pre-loaded from the cache.  
Once the cache is stored once, most features can be performed locally
without internet connection for ontology or data download.

### Launching the local server

To launch the server, simply just run `app.py` with Python3:

    python3 app.py --port 5000 --folder ${LOCALPATH}

You can modify the port as well. 
Note that both the port and the folder options are required.

If this is your first time running AEGIS and you did not download our cached
files, AEGIS will automatically download the latest gene and go annotations. 
This may take a while, and the following files will be automatically generated
inside the local directory:

    ${LOCALPATH}/local/gene2go
    ${LOCALPATH}/local/go-basic.obo
    ${LOCALPATH}/local/geneid2sym_human.json
    ${LOCALPATH}/local/geneid2sym_mouse.json

and later, the program will also generate the cached files 

    ${LOCALPATH}/local/godag_*.pkl

By default, AEGIS  will continue this version if the same ${LOCALPATH} is 
specified. To update the version, simply create a new local path to repeat
the analysis above. 

Finally, open your local browser with

    http://localhost:5000/


## Other Vignettes

![Single Cell RNA-seq Application](aegis_single_cell_example.html)
![Benchmark for DAG-based Testing: Part I](aegis_benchmark_part1.html)
![Benchmark for DAG-based Testing: Part II](aegis_benchmark_part2.html)

