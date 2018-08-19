
# Welcome!

This is the documentation webpage for AEGIS. AEGIS is an open-source software with an interactive information-retrieval framework that enables an investigator to navigate through the entire Gene Ontology (GO) graph (with tens of thousands of nodes) and focus on fine-grained details without losing the context. It features interpretable visualization of GO terms reported from studies, flexible exploratory analysis of the GO DAG, as well as principled power analysis that is biologically relevant.

<img src="../static/img/aegis_painting.jpg" width="200px"/>

## Instructions to Run the Full Version

AEGIS is an open-source software, and the back-end and front-end implementations in Python and Javscript are available under the MIT License.


### Install dependencies

*Prerequisites*: [Python3](http://docs.python-guide.org/en/latest/) (required),
[virtualenv](https://virtualenv.pypa.io/en/stable/) or other package managements (recommended).

Installing of dependencies only requires one line:

    pip3 install -r requirements.txt

AEGIS also requires specification of a folder: `${LOCALPATH}` to store the
cached files. This is mainly for version control and speed performance.
For most of the analyses (excluding simulation outputs), the files will typically
require no more than 250M of disk space.

*Note*: If this is the first time that you are running AEGIS locally, Internet connection
will be required to download data (or our cached files below) from the online databases.

### Download Cached Files (Optional)

You can manually pre-propagate some local files in `${LOCALPATH}` to reduce setup time.
Once the cache is stored, most features of AEGIS can be performed locally
without Internet connection for ontology or data download.

Simply download the light cache files of (version-controlled)
species/ontologies [here](http://stanford.edu/~jjzhu/fileshare/aegis)
and unpack to the directory `${LOCALPATH}`, e.g., `local_${VERSION}.tar.gz`
Make sure to expand the files in the `${LOCALPATH}` so that the folder includes
them in the following format: `${LOCALPATH}/local/godag_*.pkl`

Here is an example of the command line workflow:

    cd ${LOCALPATH}
    wget http://stanford.edu/~jjzhu/fileshare/aegis/local_20180710.tar.gz
    tar -xvzf local_20180710.tar.gz


*Note*: If you skip this step, the latest version of the GO and annotation files will be downloaded,
and the total setup time will take longer.

### Launch the Local Server

To launch the server, run:

    python3 main.py --port 5000 --folder ${LOCALPATH}

*Note*: both the port number and the local path options are required.

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
the analysis above. Finally, open your local browser with

    http://localhost:5000/




