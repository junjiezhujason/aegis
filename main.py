#!/usr/bin/env python3
#title           :app.py
#description     :creates a flask application for web interface
#author          :Junjie Zhu
#date            :20171128
#version         :0.1
#usage           :
#notes           :
#python_version  :3.6.0
#==============================================================================

import os
import time
import datetime
import logging
import flask
import werkzeug
import optparse
import tornado.wsgi
import tornado.httpserver
import json

from server.dagraph import GODAGraph
from server.examples import load_chipseq_example, load_gwas_example, setup_power_example

# global variables
logger = logging.getLogger(__name__)
logging.basicConfig(format='[%(asctime)s %(name)s %(levelname)s] %(message)s',
                            datefmt='%I:%M:%S', level=logging.INFO)

global DAG_DICT
global dag
global MAIN_FOLDER
app = flask.Flask(__name__, static_url_path='/static')
app.config["LITEVIEW"] = False

# Set the secret key to some random bytes. Keep this really secret!
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'

def report_disabled():
    return("Error: function disabled in this mode")

def get_core_sublist():
    pages = ["view_go", "sim_setup", "sim_result"]
    text_map = {
        "view_go": "Visualizer",
        "sim_setup": "Simulation Setup",
        "sim_result": "Simulation Result"
    }
    sublist = []
    for example in pages:
        sublist.append({
            "id": example,
            "caption": text_map[example],
        })
    return(sublist)

def get_lite_sublist(example_only=True):
    ont_names = ["biological_process",
                 "cellular_compnent",
                 "molecular_function"]
    spe_names = ["human", "mouse"]
    text_map = {
     "biological_process": "Biological Process and Human Genes",
     "cellular_compnent": "Cellular Compnent",
     "molecular_function": "Molecular Function",
     "human": "Human",
     "mouse": "Mouse",
     "exp_chip": "Example from ChIP-seq Study",
     "exp_gwas": "Example from Genome-wide Association Study"
     # "exp_chip": "Example from CHIP-seq (Human)",
     # "exp_gwas": "Example from CHIP-seq (Human)"
    }
    sublist = []
    if example_only:
        ont_names = [ont_names[0]]
        spe_names = [spe_names[0]]
    for ont in ont_names:
        for spe in spe_names:
            sublist.append({
              "id": ont + "_" + spe,
              "caption": text_map[ont],  # + " (" + text_map[spe] + ")",
              # "caption": text_map[ont] + " (" + text_map[spe] + ")",
              "ontology": ont,
              "species": spe,
              "anchor_t": "root",
            })

    for example in ["exp_chip", "exp_gwas"]:
        if example == "exp_chip":
            ont = "cellular_component"
            spe = "human"
        if example == "exp_gwas":
            ont = "biological_process"
            spe = "human"
        sublist.append({
            "id": example,
            "caption": text_map[example],
            "ontology": ont,
            "species": spe,
            "anchor_t": "waypoint",
        })
    return sublist

def create_lite_dag_dict():
    global DAG_DICT
    DAG_DICT = {}
    cache_dir = os.path.join(MAIN_FOLDER, "local")
    upload_dir = os.path.join(MAIN_FOLDER, "tmp")
    lite_list = get_lite_sublist()
    for item in lite_list:
        dag = GODAGraph(cache_dir,
                        ontology=item["ontology"],
                        species=item["species"],
                        name=item["id"])
        dag.setup_full_dag(use_cache=True)

        if item["id"]  in ["exp_chip", "exp_gwas"]:
            # load the context information
            if item["id"] == "exp_chip":
                anchors = list(load_chipseq_example(upload_dir).keys())
            elif item["id"] == "exp_gwas":
                anchors = list(load_gwas_example(upload_dir).keys())
            else:
                anchors = []
            _, c_params = dag.setup_context_graph(item["anchor_t"], anchors)
        else:
            _, c_params = dag.setup_context_graph(item["anchor_t"], [dag.root])
        DAG_DICT[item["id"]] = {}
        DAG_DICT[item["id"]]["dag"] = dag
        DAG_DICT[item["id"]]["context_params"] = c_params

# setup the about page
@app.route('/')
def about():
    logger.debug("Calling about")
    if app.config["LITEVIEW"]:
        mode = "lite_mode"
        sublist = get_lite_sublist()
    else:
        mode = "full_mode"
        sublist = get_core_sublist()
    return flask.render_template('about.html',
                                 task="about",
                                 mode=mode,
                                 sublist=sublist)

# setup the pages for the complete version
@app.route('/core/<page>')
def core(page):
    if app.config["LITEVIEW"]:
        return report_disabled()
    logger.info("Calling core functionality: {}".format(page))
    return flask.render_template('{}.html'.format(page),
                                 task=page,
                                 mode="full_mode",
                                 sublist=get_core_sublist())

# setup the pages for the light version
@app.route('/lite/<page>')
def lite(page):
    if not app.config["LITEVIEW"]:
        return report_disabled()
    sublists = get_lite_sublist()
    options = [item["id"] for item in sublists]
    assert page in options, "The url for lite/ is not recognized!"
    # general_info, context_info are output here
    return flask.render_template('lite.html',
                                 task="lite",
                                 mode="lite_mode",
                                 sublist=get_lite_sublist())


@app.route('/lite/request_general_and_context_info', methods=['POST'])
def request_general_and_context_info():
    if not app.config["LITEVIEW"]:
        return report_disabled()
    upload_dir = os.path.join(MAIN_FOLDER, "tmp")
    page = flask.request.get_json()["page_id"]
    sublists = get_lite_sublist()
    for item in sublists:
        if item["id"] == page:
            summary_info = item
    exp_dag = DAG_DICT[page]["dag"]
    general_info = exp_dag.output_general_info()
    if page == "exp_chip":
        term_id_name_map = load_chipseq_example(upload_dir)
    elif page == "exp_gwas":
        term_id_name_map = load_gwas_example(upload_dir)
    else:
        term_id_name_map = {}
    general_info["query_data"] = term_id_name_map
    context_info = exp_dag.output_context_info(exp_dag.context_graph)
    context_params = DAG_DICT[page]["context_params"]
    for key in context_params:
        context_info[key] = context_params[key]
    context_info["init_focus_anchor"] = context_params["anchors"];
    all_info = {
        "general_info": general_info,
        "context_info": context_info,
        "summary_info": summary_info,
    }
    # general_info, context_info are output here
    response = app.response_class(
        response=flask.json.dumps(all_info),
        status=200,
        mimetype='application/json'
    )
    return response

# pages for functional uses
@app.route('/dag_setup_ontology', methods=['POST'])
def dag_setup_ontology():
    assert MAIN_FOLDER, "a local cache folder needs to be specified"
    cache_dir = os.path.join(MAIN_FOLDER, "local")
    assert os.path.exists(cache_dir), "{} does not exist".format(cache_dir)

    params = flask.request.get_json()["params"]
    print(params)
    # this rewrites the global variable dag
    global dag
    dag = GODAGraph(cache_dir,
                    ontology=params["ontology"],
                    species=params["species"],
                    name="go_dag")
    dag.setup_full_dag(use_cache=True)
    general_info = dag.output_general_info()
    logger.info("Number of terms: {}".format(len(general_info["search_dict"])))
    response = app.response_class(
        response=flask.json.dumps(general_info),
        status=200,
        mimetype='application/json'
    )
    return response

@app.route('/dag_setup_context', methods=['POST'])
def dag_setup_context():
    anchors= flask.request.get_json()["anchors"] # list of str
    rule = flask.request.get_json()["anchor_rule"] # str
    min_w = int(flask.request.get_json()["min_node_size"]) # int
    max_w = int(flask.request.get_json()["max_node_size"]) # int
    refine_graph = flask.request.get_json()["refine_graph"] # boolean

    c_graph, c_params = dag.setup_context_graph(rule,
                                                anchors,
                                                min_w=min_w,
                                                max_w=max_w,
                                                refine_graph=refine_graph,
                                                store_context=True)
    context_info = dag.output_context_info(c_graph)
    for key in c_params:
        context_info[key] = c_params[key]

    response = app.response_class(
        response=flask.json.dumps(context_info),
        status=200,
        mimetype='application/json'
    )
    return response

@app.route('/dag_setup_focus', methods=['POST'])
def dag_setup_focus():
    query_list = flask.request.get_json()['req_go_names']
    params = flask.request.get_json()['params']

    access = params['access_dag']
    if access:
        exp_dag = DAG_DICT[access]["dag"]
    else:
        exp_dag = dag

    context_graph = exp_dag.context_graph
    data = exp_dag.setup_focus_graph(
        query_list,
        ordered_context=context_graph,
        rule = params["rule"],
        max_descendents = int(params["max_descendents"]),
        gap_break = int(params["gap_break"]),
        grouped = params["grouped"]
    )
    # retrieve relevant annotations
    response = app.response_class(
        response=flask.json.dumps(data),
        status=200,
        mimetype='application/json'
    )
    return response

@app.route('/get_simulation_data', methods=['POST'])
def get_simulation_data():
    # data = {"fake_simulation_data": dag.generate_random_pvalues()};
    sim_id = flask.request.get_json()["sim_id"]
    test_method = flask.request.get_json()["test_method"] # "simes"
    adjust_method = flask.request.get_json()["adjust_method"] # "BH"

    dat_dir = os.path.join(MAIN_FOLDER, "sim", sim_id)
    cache_dir = os.path.join(MAIN_FOLDER, "local")

    # TODO: find a way to save the ontology and species info
    tissue = sim_id.split("-")[0].split("_")[1]
    out_data = setup_power_example(tissue=tissue)
    ontology = out_data["ontology_params"]["ontology"]
    species = out_data["ontology_params"]["species"]

    # create the appropriate ontology
    dag = GODAGraph(cache_dir,
                    ontology=ontology,
                    species=species,
                    name="simulation")
    dag.setup_full_dag(use_cache=True)
    dag.restore_testing_configuration(dat_dir);

    logger.info("Restored the simulation results to context!")
    nonnulls = dag.output_non_null_go_terms(out_data["signal_genes"]);
    matrix_data = dag.output_node_power_matrix(dat_dir,
                                               test_method,
                                               adjust_method)
    out_data["nonnulls"] = nonnulls
    out_data["matrix"] = matrix_data

    response = app.response_class(
        response=flask.json.dumps(out_data),
        status=200,
        mimetype='application/json'
    )
    return response


@app.route('/get_example_query_data', methods=['POST'])
def get_example_query_data():
    # data = {"fake_simulation_data": dag.generate_random_pvalues()};
    example_id = flask.request.get_json()["example_id"]
    upload_dir = os.path.join(MAIN_FOLDER, "tmp")
    assert example_id in ["example1", "example2"], "example_id error"
    if example_id == "example1":
        term_id_name_map = load_chipseq_example(upload_dir)
        # query_list = list(term_id_name_map.keys())
        ontology = "cellular_component"
        species = "human"
    if example_id == "example2":
        term_id_name_map = load_gwas_example(upload_dir)
        # query_list = list(term_id_name_map.keys())
        ontology = "biological_process"
        species = "human"

    data = {"query_term_dict": term_id_name_map,
            "ontology": ontology,
            "species": species}
    response = app.response_class(
        response=flask.json.dumps(data),
        status=200,
        mimetype='application/json'
    )
    return response

@app.route('/get_ground_truth_data', methods=['POST'])
def get_ground_truth_data():
    genes = flask.request.get_json()['signal_genes']
    if len(genes) == 1 and genes[0] == '':
        genes = []
    print(genes)
    # logger.info("Requested genes names: {}".format(genes))
    # retrive graph data
    data = dag.output_non_null_go_terms(genes)
    # retrieve relevant annotations
    response = app.response_class(
        response=flask.json.dumps(data),
        status=200,
        mimetype='application/json'
    )
    return response

# TODO: update in the future
num_cases = 10;
def launch_single_simulation_case(i):
    logger.info("Launching simulation {}".format(i))
    time.sleep(0.1*i)
    logger.info("Completed simulation {}".format(i))
@app.route('/progress')
def progress():
    def generate():
        x = 0
        while x <= num_cases:
            prog = round(100.0 * x / num_cases)
            # the following yields the format that jquery can
            # recognise. it currently just transfers the progress
            # in terms of percentage (see function )
            yield "data:" + str(prog) + "\n\n"
            # This computes a simulation for a case and updates
            # when it is complete. Currently, each single case
            # creates a single file that can be used as cache
            # this allows for more flexiblity
            launch_single_simulation_case(x)
            x = x + 1
    return flask.Response(generate(), mimetype= 'text/event-stream')

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in allowed_extensions

@app.route('/upload_view_file', methods = ['GET', 'POST'])
def upload_view_file():
    # this is a file upload handler for lists (csv, txt)
    # it handles uploading files to CACHE_DIR/tmp
    # which may be destroyed after action is taken
    upload_dir = os.path.join(MAIN_FOLDER, "tmp")
    launch_single_simulation_case(10)
    format_sfx = ["csv", "txt", "tsv"]
    if flask.request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in flask.request.files:
            # flask.flash('No file part')
            logger.info("No file uploaded")
            print(flask.request.url)
            assert 0, "STOP"
            # return flask.redirect(flask.request.url)
        f = flask.request.files['file']
        if f.filename == '':
            # flask.flash('No selected file')
            assert 0, "STOP"
            return flask.redirect(flask.request.url)
        logger.info("Uploading file: {}".format(f.filename))
        if f and allowed_file(f.filename, format_sfx):
            fn = werkzeug.secure_filename(f.filename)
            f.save(os.path.join(upload_dir, fn))
            # return flask.redirect(flask.url_for('uploaded_file', filename=fn))
        else:
            logger.warning("File suffix must be in: {}".format(format_sfx))
            # return flask.redirect(flask.request.url)
        # response = app.response_class(
        #     response=flask.json.dumps("Upload successful"),
        #     status=200,
        #     mimetype='application/json'
        #     )
        # return response
        # return flask.render_template('view_go.html', task="view_go")
        response = app.response_class(
            response=flask.json.dumps("UPDATED DATA"),
            status=200,
            mimetype='application/json'
        )
        return response

def start_tornado(app, port=5005):
    http_server = tornado.httpserver.HTTPServer(
        tornado.wsgi.WSGIContainer(app))
    http_server.listen(port)
    print('Tornado server starting on port {}'.format(port))
    tornado.ioloop.IOLoop.instance().start()

def start_from_terminal(app):
    """
    Parse command line options and start the server.
    """
    parser = optparse.OptionParser()
    parser.add_option(
        '-d', '--debug',
        help='enable debug mode',
        action='store_true', default=False)
    parser.add_option(
        '-p', '--port',
        help='which port to serve content on',
        type='int', default=5000)
    parser.add_option(
        '-f', '--folder',
        help="folder to store temporary data",
        default="")
    parser.add_option(
        '-l', '--lite',
        help='enforcing light mode',
        action='store_true', default=False)

    opts, args = parser.parse_args()

    assert opts.folder, "a local cache folder needs to be specified"
    global MAIN_FOLDER
    global LITE_VIEW
    MAIN_FOLDER = opts.folder

    port = opts.port
    logger.info("Running on port: {}".format(port))
    logger.info("Local folder : {}".format(MAIN_FOLDER))

    if opts.lite:
        create_lite_dag_dict()
    app.config["LITEVIEW"] = opts.lite

    if opts.debug:
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        logger.setLevel(logging.INFO)
        start_tornado(app, port)
        # app.run(debug=False, host='0.0.0.0', port=port)

    UPLOAD_FOLDER = os.path.join(MAIN_FOLDER, "tmp")

if __name__ == '__main__':
    start_from_terminal(app)
