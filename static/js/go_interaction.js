// global variables
let tag_update_queue = [];
let full_data = {
  // "summary_info": null,
  "general_data": {
    "uploaded_anchors": {"focus": [], "context": []},
    "query_data": {},
    "go_gene_cnt": null,
    "ontology_root_id": null,
    "search_dict": null,
    "simulation": null
  },
  "context_data": null,
  "graph_data": null,
  "ground_truth_info": {"self_nonnull":[], "comp_nonnull":[]},
};

Math.seedrandom('hello.');

$(function(){
  $('[data-toggle="tooltip"]').tooltip();
  $(".jquery_ui_spinner" ).spinner();
});

function setup_request_main_ontology(onclick_only=false) {
  if (!onclick_only) {
    request_main_ontology();
  }
  $("#request_ontology_button").off().on('click', function() {
    // show the other components of the view

    // $(".view-block").hide();
    // $(".focus-block").hide();
    request_main_ontology();
  });
}

function get_context_params() {
  return {
    "root": $("#context_root").val(),
    "min_w": $("#spinner_min_genes_cntx").val(),
    "max_w": $("#spinner_max_genes_cntx").val()
   };
}

function populate_params_from_init(init_data) {
  $("#context_root").val(init_data.root);
  $("#spinner_min_genes_cntx").val(init_data.min_w);
  $("#spinner_max_genes_cntx").val(init_data.max_w);
}

function request_ground_truth_data() {
  // communication with python to retrieve layout, interaction data
  let request = $("#go_gene_tag_it").tagit("assignedTags");
  $.ajax({
    url: "/get_ground_truth_data",
    timeout: 10000,
    type: "POST",
    data: JSON.stringify({"signal_genes": request}),
    contentType: "application/json",
    success: function(ground_truth_info) {
      // console.log("Request result:")
      // console.log(ground_truth_info)
      full_data.ground_truth_info = ground_truth_info;
      // request_ground_truth_data(genes_requested);
      update_all_graphs("#full_mirror_display", full_data.graph_data, config);

    },
    failure: function() {
      console.log("Server error.");
    },
    error: function ( jqXHR, textStatus, errorThrown) {
      console.log("errorThrown: " + errorThrown
      + " textStatus:" + textStatus);
    }
  })
}

function restricted_tag_update(tag_id, all_curr_tags, max_tags) {
  // if we exceed the maximum number of anchors allowed,
  // then we remove some nodes from the front
  if (all_curr_tags.length > max_tags){
    let n_removal = all_curr_tags.length - max_tags;
    let keep_tags = [];
    for (let foc_i=0; foc_i<all_curr_tags.length; foc_i++) {
      if (foc_i >= n_removal) {
        keep_tags.push(all_curr_tags[foc_i])
      } else {
        // remove the tag from tag-it
        $(tag_id).tagit("removeTagByLabel", all_curr_tags[foc_i]);
      }
    }
    all_curr_tags = keep_tags;
  }
  return all_curr_tags;
}

function update_focus_graph_from_anchors(focus_anchors) {
  if (tag_update_queue.length > 0) {
    // something is happening now
    tag_update_queue.push(focus_anchors);
  } else {
    // nothing is currently happening
    tag_update_queue.push(focus_anchors);
    recursive_request_focus_data();
  }
}

function recursive_request_focus_data() {
  if (tag_update_queue.length > 0) {
    let curr_list = tag_update_queue[0];
    request_focus_data(curr_list);
    // something is being processed right now
  } else {
    console.log("The current queue is empty!");
  }
}

function request_focus_data(request) {
  console.log("Requesting Focus Graph...");
  // collect parameters
  let params = {
    "rule": $("#focus_anchor_type").val(),
    "max_descendents":  $("#spinner_desc_size").val(),
    "gap_break": $("#spinner_foc_gap_break").val(),
    "grouped":  $("#check_group_focus").is(":checked"),
    "access_dag": config.access_dag
  }
  $.ajax({
    url: "/dag_setup_focus",
    timeout: 10000,
    type: "POST",
    data: JSON.stringify({"req_go_names": request, "params": params}),
    contentType: "application/json",
    success: function(focus_data) {
      // console.log("Focus load success!")
      // extract the context information and populate context data
      // let flex_info= in_data.context_info.meta.flex;
      // full_data.context_data.level_counts.flex = flex_info.level_counts;
      let context_data = full_data.context_data;
      let general_data = full_data.general_data;
      full_data.graph_data = reformat_focus_data(focus_data,
                                                 context_data,
                                                 general_data);
      setup_graph_updates(full_data.graph_data, config);
      $("#open_graph_viewer").off().on("click", function() {
        open_context_focus_image("foc_con");
      });
      if (config.main_mode == "visualizer") {
        $("#expand_binder_summary").off().on("click", function() {
          open_context_focus_image("ssm");
        });
      }
      if (config.main_mode == "simulation_result") {
        request_simulation_details();
        $("#result_test_method").off().on("change", function() {
          request_simulation_details();
        });
      }
    },
    failure: function() {
      console.log("Server error.");
    },
    error: function ( jqXHR, textStatus, errorThrown) {
      console.log("errorThrown: " + errorThrown
      + " textStatus:" + textStatus);
    }
  })
}

function tag_group_update(tag_id, remove_tags=[], add_tags=[]) {
  // remove tags and then add tags, and then update focus graph in batch
  function tagit_add_update(event, ui) {
    // NEW: handle maximum number of tags
    // console.log("ADD");
    // console.log(ui);
    let rm_tags = get_tags_to_remove();
    for (let i in rm_tags) {
      $(tag_id).tagit("removeTagByLabel", rm_tags[i]);
    }
    let all_curr_tags = $(tag_id).tagit("assignedTags");
    update_focus_graph_from_anchors(all_curr_tags);
  }
  function tagit_remove_update(event, ui) {
    // remove any tag from the current list and update focus graph
    let all_curr_tags = $(tag_id).tagit("assignedTags");
    // console.log("REMOVING: " + ui.tagLabel);
    // console.log(all_curr_tags);
    let update_tags = [];
    all_curr_tags.forEach( tag => {
      if (tag != ui.tagLabel) { update_tags.push(tag); }
    })
    // console.log(update_tags);
    update_focus_graph_from_anchors(update_tags);
  }
  // --------------------------------------------------------------------
  // console.log("START OF GROUP REMOVAL");
  $(tag_id).tagit({
    afterTagAdded: null, // NOTE: could be asynchronous with the next update
    beforeTagRemoved: null,
  })
  // must always first remove and then add
  remove_tags.forEach( tag => $(tag_id).tagit("removeTagByLabel", tag))
  add_tags.forEach( tag => $(tag_id).tagit("createTag", tag))
  $(tag_id).tagit({
    afterTagAdded: tagit_add_update, // may be asynchronous with the prevoius
    beforeTagRemoved: tagit_remove_update,
  })
  // console.log("END OF GROUP REMOVAL");
  // --------------------------------------------------------------------
  let all_curr_tags = $(tag_id).tagit("assignedTags");
  update_focus_graph_from_anchors(all_curr_tags);
}

function get_tags_to_remove() {
  let curr_val = $("#spinner_max_num_foc_anchors").val();
  // do not do anything if there is only one tag left
  if (curr_val < 1) {
    return [];
  }
  let all_curr_tags = $("#go_focus_tag_it").tagit("assignedTags");
  if (all_curr_tags.length > curr_val) {
    return all_curr_tags.slice(0, all_curr_tags.length - curr_val);
  } else {
    return [];
  }
}

function tag_based_focus_update(go_terms) {
  let tag_id = "#go_focus_tag_it";
  let max_tags = $("#spinner_max_num_foc_anchors").val();
  console.log(go_terms);
  let init_go_terms = go_terms.slice(-max_tags); // slide from end
  // config.curr_state.MaxFocusAnc = max_tags;
  tag_group_update(tag_id,
                   remove_tags=$(tag_id).tagit("assignedTags"),
                   add_tags=init_go_terms);
  // reset button updates the focus graph
  $("#go_focus_reset_button").off().on("click", function() {
    let max_tags = $("#spinner_max_num_foc_anchors").val();
    init_go_terms = init_go_terms.slice(0, max_tags);
    // config.curr_state.MaxFocusAnc = max_tags;
    tag_group_update(tag_id,
                     remove_tags=$(tag_id).tagit("assignedTags"),
                     add_tags=init_go_terms);
  });
}

function setup_focus_request() {
  let context_data = full_data.context_data;
  if (config.main_mode == "simulation_result") {
    context_data.init_focus_anchor = [];
    // update the focus (set the non-null nodes in the focus graph)
    // TODO: perhaps use outernodes in the future
    $("#focus_anchor_type").val("leaf");
    // console.log(full_data.ground_truth_info.self_nonnull);
    // debugger;
    full_data.ground_truth_info.self_nonnull.forEach(anchor => {
      let term = full_data.context_data.node_data[anchor].name;
      context_data.init_focus_anchor.push(term);
    })
  }

  // ----------------------------------------------------------------
  // focus node search setup
  // ----------------------------------------------------------------
  // filter down the search dictoinary based on the node data
  let focus_search_dict = {};
  let context_search_dict = full_data.general_data.search_dict;
  let node_name;
  for (let node_i=0; node_i<context_data.node_data.length; node_i++) {
    node_name = context_data.node_data[node_i].name;
    focus_search_dict[node_name] = context_search_dict[node_name]
  }
  initialize_autocomplete(focus_search_dict, "#go_focus_tag_it", ".focus-block");
  // set context anchors as initial focus anchors
  // which is subject to maximum number of anchors constraint

  if (config.main_mode == "simulation_setup" |
      config.main_mode == "lite") {
    initialize_autocomplete(focus_search_dict,
                            "#go_select_tag_it",
                            ".go-sel-for-gene-block");
    let tmp_gene_map = full_data.context_data.gene_sym_id_map;
    initialize_autocomplete(tmp_gene_map,
                            "#go_gene_tag_it",
                            ".gene-sel-block");
  }

  let init_go_terms = context_data.init_focus_anchor;
  if (config.main_mode == "visualizer") {
    let uploaded_ancs =  full_data.general_data.uploaded_anchors;
    if (uploaded_ancs.focus.length > 0) {
      let valid_ids = [];
      uploaded_ancs.focus.forEach(term_id => {
        if (term_id in focus_search_dict) {
          valid_ids.push(term_id);
        }
      });
      if (valid_ids.length > 0) {
        init_go_terms = valid_ids;
      }
    }
  }
  let max_tags = $("#spinner_max_num_foc_anchors").val();
  init_go_terms = init_go_terms.slice(0, max_tags);
  tag_based_focus_update(init_go_terms);
  // ----------------------------------------------------------------
  // this enables changes in the tag instantaneously update the focus
  // ----------------------------------------------------------------
  $("#focus_option_update").off().on("click", function() {
    tag_based_focus_update($("#go_focus_tag_it").tagit("assignedTags"));
  });
  $("#focus_option_2_update").off().on("click", function() {
    tag_based_focus_update($("#go_focus_tag_it").tagit("assignedTags"));
  });
}

function request_context_data() {
  // retreive the context request parameters from input fields
  let context_request = get_current_context_setup();
  console.log("Requesting Context Graph...");
  // console.log(context_request);
  $.ajax({
    url: "/dag_setup_context",
    timeout: 100000,
    type: "POST",
    data: JSON.stringify(context_request),
    contentType: "application/json",
    success: function(context_data) {
      context_data = reformat_context_data(context_data);
      context_data.init_focus_anchor = context_request.anchors;
      full_data.context_data = context_data;
      setup_focus_request()
    },
    failure: function() {
      console.log("Server error.");
    },
    error: function ( jqXHR, textStatus, errorThrown) {
      console.log("errorThrown: " + errorThrown
        + " textStatus:" + textStatus);
    },
    beforeSend: function() {
      // console.log("ajax modal start");
      $("#go_ajax_modal").css("display", "block");
    },
    complete: function() {
      // console.log("ajax modal end");
      $("#go_ajax_modal").css("display", "none");
    },
  })
}

function set_context_options(node_size_params, anchor_rule, refine) {
  $("#context_anchor_type").val(anchor_rule);
  $("#check_refine_context").prop("checked", refine);
  for (let ns_param in node_size_params) {
    // spinner update: http://api.jqueryui.com/spinner/
    let spinner_id = "#spinner_" + ns_param;
    $(spinner_id).spinner("value", node_size_params[ns_param]);
  }
}

// function anchor_alias(root_in) {
//   // TODO: maybe move to configs later?
//   let alias = {
//     "root": "root",
//     "waypoint": "anchor",
//     "leaf": "leaf",
//   };
//   return alias[root_in];
// }

function get_current_context_setup() {
  // function to retrieve all the context parameters needed at the server
  // the parameter names are core to the interface between teh server
  let output= {};
  output["anchors"] = $("#go_context_tag_it").tagit("assignedTags");
  output["anchor_rule"] = $("#context_anchor_type").val();
  output["refine_graph"] = $("#check_refine_context").is(":checked");
  let size_params = ["min_node_size", "max_node_size"];
  for (let i in size_params) {
    // spinner update: http://api.jqueryui.com/spinner/
    let ns_param = size_params[i];
    let spinner_id = "#spinner_" + ns_param;
    output[ns_param] = $(spinner_id).val();
  }
  return output;
}

function get_current_ontology_setup() {
  // function to retrieve all the context parameters needed at the server
  // the parameter names are core to the interface between teh server
  let output= {};
  output["ontology"] = $("#ontology_selection").val();
  output["species"] = $("#species_selection").val();
  return output;
}

function request_main_ontology() {
  // core adjax call to request ontology data
  console.log("Requesting Ontology...");
  let ontology_request = get_current_ontology_setup();
  $.ajax({
    url: "/dag_setup_ontology",
    timeout: 100000,
    type: "POST",
    data: JSON.stringify({"params": ontology_request}),
    contentType: "application/json",
    success: function(general_data) {
      // console.log(general_data);
      // once the data is loaded successfully
      // propagate the autocomplete for context search
      // unpack the data here
      full_data.general_data.go_gene_cnt = general_data.go_gene_cnt;
      full_data.general_data.ontology_root_id = general_data.ontology_root_id;
      full_data.general_data.search_dict = general_data.search_dict;
      let halted = false;
      // setup the auto complete function
      // --------------------------------
      let tag_id = "#go_context_tag_it";
      initialize_autocomplete(general_data.search_dict, tag_id, ".context-block");
      $("#go_context_reset_button").off().on('click', function() {
        $(tag_id).tagit("removeAll");
      });
      // initialize the context request to be the root
      // unless there is data specifiec for particular views
      // default settings is to use the roots of the full ontology (typicall small)
      // if it is data-driven, then one can use the queries as context anchors
      // some defaults
      let default_root = general_data.ontology_root_id;
      let anchor_rule = "root";
      let refine = false;
      let node_sizes = Object.values(general_data.go_gene_cnt);
      let node_size_params = {"min_node_size": 1,
                              "max_node_size": Math.max(...node_sizes)}

      if (config.main_mode == "simulation_setup") {
        refine = true;
      }

      if (config.main_mode == "visualizer") {
        let uploaded_ancs =  full_data.general_data.uploaded_anchors;
        let uploaded_con_ancs = uploaded_ancs.context.length > 0;
        let uploaded_foc_ancs = uploaded_ancs.focus.length > 0;
        // update the context information
        $("#query_data_summary").hide();
        if (uploaded_con_ancs) {
          let val_queries = get_valid_queries(uploaded_ancs.context,
                                              general_data.search_dict,
                                              "context anchors");
          if (Object.keys(val_queries).length == 0) {
            halted = true;
            query_change_detected();
            full_data.general_data.query_data = {};
          } else {
            $("#query_data_summary").show();
            $("#focus_anchor_type").val("leaf");
            $("#highlight_node_select").val("query_data");
            $("#spinner_max_num_foc_anchors").val(9);
            $("#spinner_foc_gap_break").val(20000);
            for (let term_id in val_queries) {
              $(tag_id).tagit("createTag", term_id);
            }
            anchor_rule = "waypoint";
            full_data.general_data.query_data = val_queries;
          }
        } else {
          $(tag_id).tagit("createTag", default_root);
        }
        if (uploaded_foc_ancs) {
          let val_queries = get_valid_queries(uploaded_ancs.focus,
                                              general_data.search_dict,
                                              "focus anchors");
          // note: uploaded focus anchors rules over context
          // so we check context anchors first anchors as query data
          if (Object.keys(val_queries).length == 0) {
            halted = true;
            query_change_detected();
            full_data.general_data.query_data = {};
          } else {
            $("#query_data_summary").show();
            $("#focus_anchor_type").val("leaf");
            $("#spinner_max_num_foc_anchors").val(100);
            $("#spinner_foc_gap_break").val(20000);
            $("#highlight_node_select").val("focus_relatives");
            full_data.general_data.query_data = val_queries;
          }
        }
        update_query_input_box("#query_list", full_data.general_data.query_data);
      } else if (config.main_mode == "simulation_result") {
        // restore the context parameters from the simulation meta data
        let context_params = full_data.general_data.simulation.context_params;
        ["min_node_size", "max_node_size"].forEach(p => {
          node_size_params[p] = context_params[p];
        });
        refine = context_params.refine_graph;
        anchor_rule = context_params.anchor_rule;
        context_params.anchors.forEach(anchor => {
          $(tag_id).tagit("createTag", anchor);
        })
      } else {
        $(tag_id).tagit("createTag", default_root);
      }
      config.curr_state.Highlight =$("#highlight_node_select").val();
      if (halted) {
        $(".context-block").hide();
        $(".view-block").hide();
        $(".focus-block").hide();
      } else {
        $(".context-block").show();
        $(".view-block").show();
        $(".focus-block").show();
        set_context_options(node_size_params, anchor_rule, refine);
        setup_context_request();
      }
    },
    failure: function() {
        console.log("Server error.");
    },
    error: function ( jqXHR, textStatus, errorThrown) {
        console.log("errorThrown: " + errorThrown
        + " textStatus:" + textStatus);
    }
  })
}

function setup_context_request() {
  request_context_data();
  // set the context option inputs
  // request the context data
  // option to request update context data
  $("#go_context_update_button").off().on('click', function() {
    request_context_data();
  })
}

function setup_full_go_canvas(confg) {
  // propagate the default parameters from confg to the numbers
  for (let element in confg.init_options) {
    if (element == "#check_group_focus" ) {
      $(element).prop("checked", confg.init_options[element]);
    } else {
      $(element).val(confg.init_options[element]);
    }
  }
  // generate tag-it autocomplete objects
  $("#go_context_tag_it").tagit({});
  $("#go_focus_tag_it").tagit({});

  // create the svg elements needed for graph display
  create_all_groups("#full_mirror_display", confg);
  create_all_groups("#viewer_foc_con_png", config);
  create_all_groups("#viewer_foc_con_svg", config);
}

function create_all_groups(svg_id, confg) {
  let svg = d3.select(svg_id);
  svg.call(create_background, confg);
  svg.call(create_mid_ann, confg); // specify transform
  svg.call(create_graph_group, confg);
  svg.call(create_bar_group, confg); // specify transform
}

function create_graph_group(svg, confg) {
  let graph_g = svg.append("g").attr("class", "graph-layer");
  graph_g.append("g").attr("class","links");
  graph_g.append("g").attr("class","nodes");
}

function create_bar_group(svg, confg) {
  let bar_g = svg.append("g").attr("class", "bar-layer");
  bar_g.append("g").attr("class", "xaxis");
  bar_g.append("g").attr("class", "group-bars");
  bar_g.append("g").attr("class", "group-text");
  bar_g.append("g").attr("class", "group-triang");
  bar_g.append("g").attr("class", "group-triang-text");
  legend_g = bar_g.append("g").attr("class", "legend-box");
  legend_g.append("g").attr("class", "legend-symb");
  legend_g.append("g").attr("class", "legend-text");
}

function create_background(svg, confg) {
  let background_layer = svg.append("g").attr("class", "background-layer");
  background_layer.append("g").attr("class", "grid-layer");
  background_layer.append("g").attr("class", "grid-break");
}

function create_mid_ann(svg, confg) {
  let mid_ann = svg.append("g").attr("class", "mid-ann");
  mid_ann.append("g").attr("class", "yaxis");
  mid_ann.append("g").attr("class", "new-node-buttons");
}

function append_tear_add_button(d3_g) {
  let bttn = d3_g.append("g")
    .style("transform", "rotate(90deg) scale(0.7)")
    ;
  bttn.append("path")
    .attr("class", "tear-symbol")
    .attr("d", "M15 6 Q 15 6, 25 18 A 12.8 12.8 0 1 1 5 18 Q 15 6 15 6z" )
    .attr("transform", "translate(-15, -26)")
    // .style("fill", "Grey")
    // .style("stroke", "Grey")
    .style("stroke-width", "3px")
    ;
  bttn.append("circle")
    .attr("r", 10)
    // .style("fill", "White")
    ;
  let symbol = d3.symbol().size(150).type(d3.symbolCross);
  bttn.append("path")
    .attr("class", "add-symbol")
    .attr("d", symbol())
    // .style("fill", "Grey")
    .attr("transform", "translate(0, 0)")
    ;
  // update_tear_color(bttn, "Grey");
}


function draw_term_from_level(in_data, curr_list, view, level_n) {
  let context_graph = in_data.context_info.graph;
  let allowable = [];
  let random_cid;
  let no_new_in_level = true;
  if (view == "flex") {
    let level_idx = in_data.context_info.meta.level_starts.flex;
    let level_range, len_range;
    if (level_n == 0) {
      level_range = [0,  level_idx[level_n]];
    } else {
      level_range = [level_idx[level_n-1] +1,  level_idx[level_n]] // inclusive
    }
    for (let i = 0; i < (level_range[1] - level_range[0]); i ++) {
      let cid = level_range[0] + i;
      // if (!(context_graph.node_data[cid].name in curr_dict)) {
      if ($.inArray(context_graph.node_data[cid].name, curr_list) == -1) {
        allowable.push(cid);
      }
    }
  } else { // depth or height are in fixed view
    let level_cids = context_graph.level_nodes[view][level_n];
    level_cids.forEach( (cid) => {
      if ($.inArray(context_graph.node_data[cid].name, curr_list) == -1) {
        allowable.push(cid);
      }
    });
  }
  if (allowable.length == 0) {
    return null;
  } else {
    random_cid = allowable[getRandomInt(allowable.length)];
  }
  return  context_graph.node_data[random_cid].name;
}


function append_by_dblclick(d) {
  // used in node updates in graph_utils.js render_node_link_interaction()
  let tag_id = "#go_focus_tag_it";
  $(tag_id).tagit("createTag", d.name);

  // let curr_list = $(tag_id).tagit("assignedTags");
  // if (curr_list.includes(d.name)) {
  //   $(tag_id).tagit("removeTagByLabel", d.name);
  // } else {
  //   $(tag_id).tagit("createTag", d.name);
  // }

}

function append_random_level_go(level_n, graph_data) {
  let tag_id = "#go_focus_tag_it";
  // console.log("Adding random go term at level " + level_n)
  if (config.curr_state.Context != "test_context") {
    throw "Only allowed to add random term in the testing context";
  }
  let curr_list = $(tag_id).tagit("assignedTags");
  let new_go = draw_term_from_level(graph_data,
                                    curr_list,
                                    config.curr_state.View,
                                    level_n);
  if (new_go == null) {
    console.log("Warning: level is exhausted");
  } else {
    $(tag_id).tagit("createTag", new_go);
  }
}

function draw_level_go_terms(level_n, graph_data, main_config) {

  let tag_id = "#go_focus_tag_it";
  let curr_list = $(tag_id).tagit("assignedTags");
  let htype =  main_config.curr_state.Highlight;
  // intersection of terms
  if (htype in main_config.context_highlights) {
    // just keep drawing from
    let context_graph = graph_data.context_info.graph;
    let node_ids = graph_data.curr_lev_nodes[level_n];
    let nodes = [];
    for (let i in node_ids) {
      let cid = node_ids[i];
      nodes.push(context_graph.node_data[cid].name);
    }

    let candidates = [];
    for (let i in nodes) {
      if (!(curr_list.includes(nodes[i]))) {
        candidates.push(nodes[i]);
      }
    }
    if (candidates.length == 0) {
      alert("Level is exhausted");
    } else {
      let new_go = candidates[getRandomInt(candidates.length)];
      $(tag_id).tagit("createTag", new_go);
    }
  } else {
    let new_go = draw_term_from_level(graph_data,
                                      curr_list,
                                      config.curr_state.View,
                                      level_n);
    if (new_go == null) {
      alert("Level is exhausted");
    } else {
      $(tag_id).tagit("createTag", new_go);
    }
  }
}

function update_grid_display(svg_id, graph_data, main_config, fixed_dim=false) {
  // let container = ".grid-display";
  let curr_view = main_config.curr_state.View;
  let n_layers = main_config.graph.max_range[curr_view].y + 1;
  let xy_scales = graph_scale_setup(main_config, fixed_dim=fixed_dim);
  let x_scale = xy_scales.x;
  let y_scale = xy_scales.y;
  let fm = get_data_dependent_dim(main_config, fixed_dim=fixed_dim);

  function customYAxis(g, tick_range, tick_names=[], major=true) {
    let y_multi_axes = function(tick_range, major) {
      let format_func = function(d, i) {
          if (tick_names.length == 0) {
            return "";
          } else {
            let s = tick_names[i];
            return this.parentNode.nextSibling
              ? ">= " + s
              : ">= " + s + " genes";
          }
      }
      let d3_axis = d3.axisRight(y_scale)
        .tickSize(fm.svg_background.width)
        .tickValues(tick_range)
        .tickFormat(format_func)
        ;
      return d3_axis
    }
    g.call(y_multi_axes(tick_range));
    g.select(".domain").remove();
    if (major) {
      g.selectAll(".tick line")
        .attr("stroke", "#B8B8B8")
        ;
      g.selectAll(".tick text").attr("x", 4).attr("dy", -4);
    } else {
      g.selectAll(".tick line")
        .attr("stroke", "#BEBEBE")
        .attr("stroke-dasharray", "2,2")
        ;
      g.selectAll(".tick text").text("");
    }
  }

  d3.select(svg_id)
    .select(".background-layer")
    .select(".grid-break")
    .call(customYAxis,
          d3.range(0.5, n_layers+0.5, 1),
          tick_names=main_config.level_breaks[curr_view],
          major=true);
  d3.select(svg_id)
    .select(".background-layer")
    .select(".grid-layer")
    .call(customYAxis,
          d3.range(0, n_layers),
          tick_names=[],
          major=false);

  let yAxis = d3.axisLeft()
      .scale(y_scale)
      .ticks(n_layers)
      .tickPadding(main_config.bar.left_tick_padding)
      ;
  d3.select(svg_id)
    .select(".mid-ann")
    .select(".yaxis")
    .call(yAxis)
    ;
  let tear_add_bttns = d3.select(svg_id)
    .select(".mid-ann")
    .select(".new-node-buttons")
    .selectAll(".tear-add-button")
    .data(d3.range(0, n_layers, 1))
  ;
  tear_add_bttns.exit().remove()
  for (let i=0; i < 2; i ++) {
    let update_obj;
    if (i == 0) {
      update_obj = tear_add_bttns.enter()
        .append("g")
        .attr("class", "tear-add-button")
        .call(append_tear_add_button)
        ;
    } else {
      update_obj = tear_add_bttns;
    }
    update_obj
      .attr("transform", d => "translate(0, " + y_scale(d) + ")")
      .on("dblclick", d => draw_level_go_terms(d, graph_data, main_config))
      .on("mouseover", function(d) {
        let tear_add_sel = d3.select(this).style("cursor", "pointer");
        // update_tear_color(tear_add_sel, "Black");
      })
      .on("mouseout", function(d) {
        let tear_add_sel = d3.select(this).style("cursor", "default");
        let col = determine_level_color(d, graph_data, main_config);
        update_tear_color(tear_add_sel, col);
      })
      .each(function(d) {
        let tear_add_sel = d3.select(this);
        let col = determine_level_color(d, graph_data, main_config);
        update_tear_color(tear_add_sel, col)
      })
      ;
  }
}

function determine_level_color(d, graph_data, main_config) {
  let htype =  main_config.curr_state.Highlight;
  if (htype in main_config.context_highlights) {
    // limit the search space
    let num_nodes = graph_data.curr_lev_nodes[d].length;
    if (num_nodes > 0) {
      return main_config.colors.highlights[htype]; //
    } else {
      return main_config.colors.highlights["hide"]; // not selectable colors
    }
  } else {
    return main_config.colors.highlights["hide"];
  }
}

function update_tear_color(tear_add_sel, sym_color) {
  // update the color of a tear drop in a layer
  // the input is the layer number and we generally need to infer
  // whether or not there are adddable nodes in this layer.

  tear_add_sel
    .select(".tear-symbol")
    .style("fill", sym_color)
    .style("stroke", sym_color)
    ;
  tear_add_sel
    .select("circle")
    .style("fill", "White")
    ;
  tear_add_sel
    .select(".add-symbol")
    .style("fill", sym_color)
    ;
}





