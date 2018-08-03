
# Welcome! 

## Installation

*Important Requirement*: Python3 (and virtual environment recommended)

See the following links for more information:

    http://docs.python-guide.org/en/latest/
    https://virtualenv.pypa.io/en/stable/

To install dependencies, simply use:

    pip3 install -r requirements.txt

## How to Setup Locally

AEGIS requires specification of a folder: `${LOCALPATH}` to store the 
cached files. This is mainly for performance and version control. For typical 
analysis (excluding simulation outputs), the files typically will typically 
include no more than 250M of disk space. 

### (Optional) Download Cached Files

You can pre-propagate some local files in `${LOCALPATH}` to reduce setup time. 
Otherwise, the latest version of the GO and annotation files will be downloaded.

You can download the light cache files of (version-controlled) 
species/ontologies [here](http://stanford.edu/~jjzhu/fileshare/aegis) 
and unpack to the directory `${LOCALPATH}`, e.g.,

    local_${VERSION}.tar.gz

Or here is an example of the workflow:
    
    cd ${LOCALPATH}
    wget http://stanford.edu/~jjzhu/fileshare/aegis/local_20180710.tar.gz
    tar -xvzf local_20180710.tar.gz

Make sure to expand the file in the `${LOCALPATH}` so that the folder includes
files of the following form

    ${LOCALPATH}/local/godag_*.pkl

Once the cache is stored once, most features can be performed locally
without internet connection for ontology or data download.

### Launch the Local Server

To launch the server, run: 

    python3 main.py --port 5000 --folder ${LOCALPATH}

Note that both the port and the local path options are required.

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




