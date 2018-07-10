
# Exploratory Gene Ontology Analysis with Interactive Visualization 

## Installation

*Important Requirement*: Python3 (and virtual environment recommended)

See the following links for more information:

    http://docs.python-guide.org/en/latest/
    https://virtualenv.pypa.io/en/stable/

To install dependencies, simply use:

    pip3 install -r requirements.txt


## Running the program: AEGIS 

To launch the server, simply just run `app.py` with Python3:

    python3 app.py --port 5000 --folder [LOCALPATH]

where `[LOCALPATH]` is a folder for local cached files and temporary data.

The current software includes the light-weight locally-stored DAG pickle object 
that is automatically pre-loaded from the cache.  
Once the cache is stored once, most features can be performed locally
without internet connection for ontology or data download.

Finally, open your local browser with

    http://localhost:5000/



