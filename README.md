
# AEGIS

The following are development and deployment instructions.
For the installation instructions, manuals, tutorials, code documentation, and contact information, please visit our
 project site: http://aegis.stanford.edu for all the details.

```
Usage: main.py [options]

Options:
  -h, --help            show this help message and exit
  -d, --debug           enable debug mode
  -p PORT, --port=PORT  which port to serve content on
  -f FOLDER, --folder=FOLDER
                        folder to store temporary data
  -l, --lite            enforcing light mode
```


## Launching the local server

To launch full version of AEGIS locally (without debug mode), run:

    python3 main.py --port 5000 --folder $maindir

The `$maindir` is a local directory where the project will be cached.
The port number 5000 can be changed.

## Development

For the development of either the full version, run:

    python3 main.py --debug --lite --port 5000 --folder ./data

or for the lite version, run:

    python3 main.py --debug --port 5000 --folder $maindir

For convenience, there is an equivalent bash script wrapper that launches this
python command:

    bash run_app.sh $ipnport $version $runmode $maindir

where `$version` could be either `core` or `lite`,
and `$runmode` could be either `debug` or `deploy`.

## Deploying the Documentation

To create the documenation with [MkDocs](https://www.mkdocs.org/) for AEGIS, run

    mkdocs gh-deploy

The configuration information can be found in in `mkdocs.yml`.

##  Deploying the lite web server

To create the lite version of the web app at http://aegis-viz.appspot.com/, run

    gcloud app deploy

The configuration information can be found in in `app.yml`.

### License

This project is licensed under the terms of the MIT license.
