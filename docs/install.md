
AEGIS is an open-source software, and the back-end and front-end implementations in Python and Javscript are available under the MIT License. The following instructions are used to install the *full* version of AEGIs, which includes all of its functionalities including power calculation.

## Install Dependencies

*Prerequisites*: [Python3.6](http://docs.python-guide.org/en/latest/) (required),
[virtualenv](https://virtualenv.pypa.io/en/stable/) or other package managements (recommended).

!!! note
    The current version of AEGIS has only been tested on Linux and MacOS environments.
    There might be backward compatibility issues with Python3.7, so virtual environments
    are highly recommended.


The code is available on github, so you can directly clone the repository to your local:

    git clone https://github.com/junjiezhujason/aegis.git

Installing of dependencies only requires one line:

    pip3 install -r requirements.txt

AEGIS also requires specification of a folder: `${PROJECT_PATH}` to store the
cached files. This is mainly for version control and speed performance.
For most of the analyses (excluding simulation outputs), the files will typically
require no more than 250M of disk space.

!!! note
    If this is the first time that you are running AEGIS locally, Internet connection
    will be required to download data (or our cached files below) from the online databases.


## Launch the Lite Version Locally

All the data files required to launch the lite version (for testing or simple demonstration)
are stored in the repo under `./data`. So once all the Python dependencies are installed,
simply run:

    python3 main.py --lite --port 5001 --folder ./data

within the cloned repo directory.

!!! note
    You can change the port number (`--port`) if the current one is being used.

Now you will see the lite version when you open your local browser with

    http://localhost:5001/

## Launch the Full Version Locally

### Download Caches (Optional)

You can manually pre-propagate some local files in `${PROJECT_PATH}` to reduce setup time.
Once the cache is stored, most features of AEGIS can be performed locally
without Internet connection for ontology or data download.

Simply download the light cache files of (time-stamped)
species/ontologies [here](http://stanford.edu/~jjzhu/fileshare/aegis)
and unpack to the directory `${PROJECT_PATH}`, e.g., `local_${VERSION}.tar.gz`
Make sure to expand the files in the `${PROJECT_PATH}` so that the folder includes
them in the following format: `${PROJECT_PATH}/local/godag_*.pkl`

Here is an example of the command line workflow:

    cd ${PROJECT_PATH}
    wget http://stanford.edu/~jjzhu/fileshare/aegis/local_20180719.tar.gz
    tar -xvzf local_20180719.tar.gz

!!! note
    Make sure the local directory should have the following structure before you launch:

        ${PROJECT_PATH}/local/godag-biological_process-human-20180719.pkl
        ${PROJECT_PATH}/local/godag-biological_process-mouse-20180719.pkl
        ${PROJECT_PATH}/local/godag-cellular_component-human-20180719.pkl
        ${PROJECT_PATH}/local/godag-cellular_component-mouse-20180719.pkl
        ${PROJECT_PATH}/local/godag-molecular_function-human-20180719.pkl
        ${PROJECT_PATH}/local/godag-molecular_function-mouse-20180719.pkl

    Here `20180719` represents the version number of the ontology paired with the annotation.
    It is highly useful for reproducing any results from the GO as well as AEGIS.
    If you skip this step, the latest version of the GO and annotation files will be downloaded,
    and the total setup time will take longer.

### Run Python in the Command

To launch the server, run:

    python3 main.py --port 5002 --folder ${PROJECT_PATH}


!!! note
    Both the port number and the local path options are required.

    If this is your first time running AEGIS and you did not download our cached
    files, AEGIS will automatically download the latest gene and go annotations.
    This may take a while, and the following *extra* files will be automatically generated
    inside the local directory:

        ${PROJECT_PATH}/local/gene2go
        ${PROJECT_PATH}/local/go-basic.obo
        ${PROJECT_PATH}/local/geneid2sym_human.json
        ${PROJECT_PATH}/local/geneid2sym_mouse.json

    and later, the program will also generate the cached files

        ${PROJECT_PATH}/local/godag-*-*-*.pkl

    The version number will be based on the date the files are downloaded and when the`.pkl` file is created.

    By default, AEGIS  will continue with this version if the same ${PROJECT_PATH} is
    specified. To update the version, simply create a new local path to repeat
    the analysis above.

Finally, open your local browser with

    http://localhost:5002/


