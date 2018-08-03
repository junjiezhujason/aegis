
# Exploratory Gene Ontology Analysis with Interactive Visualization 

## Program Documentation 

See the project site: http://jasonjunjiezhu.com/aegis for instructions on
installation, api, and notebook tutorials.

## Project Management 

### Launching the local server

To launch full version of AEGIS locally, run:

    python3 main.py --port 5000 --folder $maindir

where the `$maindir` will be where the project is cached. 
The port number 5000 can be changed.

### Development

For development of versions either the full or lite version, run:

   python3 main.py --debug $mode --port 5000 --folder $maindir

where `$version` could be either `core` or `lite`. 
Again, the port number can be changed.  

For convenience, there is an equivalent bash script wrapper that launches this
python command:

    bash run_app.sh $ipnport $version $runmode $maindir

where `$version` could be either `core` or `lite`, 
and `$runmode` could be either `debug` or `deploy`.

All of these options launched the server locally. 

### Deploying the Documentation

To create the documenation at http://jasonjunjiezhu.com/aegis/ for AEGIS, run

    mkdocs gh-deploy

The configuration information can be found in in `mkdocs.yml`.

###  Deploying the lite web server 

To create the lite version of the web app at http://aegis-viz.appspot.com/, run

    gcloud app deploy

The configuration information can be found in in `app.yml`.


