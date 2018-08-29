function move_to_next_section(curr_panel, curr_div, next_panel, next_div) {
  $(curr_panel).addClass("collapsed");
  $(curr_panel).attr("aria-expanded", "false");
  $(curr_div).attr("aria-expanded", "false");
  $(curr_div).removeClass("in");
  $(next_panel).removeClass("collapsed");
  $(next_panel).attr("aria-expanded", "true");
  $(next_div).attr("aria-expanded", "true");
  $(next_div).addClass("in");
  $(next_div).css("height", "");
  var $panel = $(next_div).closest('.panel');
    $('html,body').animate({
        scrollTop: $panel.offset().top
    }, 500);
}

function button_div_hide_show(button_id, div_id) {
  $(button_id).click(function() {
    let span_id = button_id + " span";
    let display = $(div_id).css('display');
    if (display === "none") {
      $(span_id).switchClass("glyphicon-plus", "glyphicon-minus");
       $(div_id).css('display', "block");
    } else {
      $(span_id).switchClass("glyphicon-minus", "glyphicon-plus");
       $(div_id).css('display', "none");
    }
  });
}

// gene ontology navigation setup
// -----------------------------------------------------------------------------

function button_icon_change(button_id, status) {
  let span_id = button_id + " span";
  if (status == "complete") {
    $(button_id).prop("disabled", true);
    $(button_id).switchClass("btn-primary", "btn-success");
    $(span_id).switchClass("glyphicon-refresh", "glyphicon-ok");
  }
  if (status == "change") {
    $(button_id).prop("disabled", false);
    $(button_id).switchClass("btn-success", "btn-primary");
    $(span_id).switchClass("glyphicon-ok", "glyphicon-refresh");
  }
}

function open_context_focus_image(graph_data, conf) {
  let svg_id = "#full_mirror_viewer";
  update_svg_dimension(svg_id, conf);
  update_grid_display(svg_id, graph_data, conf);
  update_focus_display(svg_id, graph_data, conf);
  update_context_display(svg_id, graph_data, conf);
  $("#graph_dialog").dialog({
    autoOpen : false,
    modal : true,
    show : "blind",
    hide : "blind",
    // height: "60%",
    width: "80%",
    // maxWidth: "500px", // This does not work!
    resizable: false,
  });
  $("#graph_dialog").dialog("open");
}

function get_valid_queries(query_list, search_dict, class_name) {
  // query_list: list of GO ids
  // search_dict: map from GO ids to GO term names
  let query_dict = {};
  let unidentified = [];
  query_list.forEach(term => {
    if (term in search_dict) {
      query_dict[term] = search_dict[term];
    } else {
      unidentified.push(term);
    }
  });
  let message;
  if (unidentified.length > 0) {
    if (query_list.length == unidentified.length) {
      message = "None of the " +
                class_name +
                " were identified in the current ontology. " +
                "Perhaps the wrong ontology was selected";
    } else {
      message = "Unidentified " +
                 class_name +
                 " terms in the current ontology:\n";
      unidentified.forEach(term => {
        message += (term + ", ");
      });
      message += "\nThese terms will be ignored."
    }

  } else {
    message = "Successfully loaded all " + class_name + " terms";
  }
  alert(message);
  return(query_dict);
}

function update_query_input_box(input_id, id_term_map) {
  let list = "";
  for (let id in id_term_map) {
    list += ( id + " - " + id_term_map[id] + "\n");
  }
  $(input_id).val(list);
}

function add_searched_genes() {
  append_search("#gene_query_list", "#gene_tagsinput")
  let genes_requested = $("#gene_tagsinput").val().split(",");
  request_ground_truth_data(genes_requested);
}

function initialize_gene_tagit() {
  $("#go_gene_tag_it").tagit({});
  $("#go_select_tag_it").tagit({});
  // specific to simulation setup
  $("#gene_copy").click(function() {
    let curr_genes = $("#go_gene_tag_it").tagit("assignedTags");
    let copy_text = "";
    for (let i in curr_genes){
      copy_text += "'" + curr_genes[i] + "',",
      copy_text += "\n"
    }
    /* Copy the text inside the text field */
    $("#hidden_copy_text").val(copy_text);
    $("#hidden_copy_text").select();
    document.execCommand("copy");
    /* Alert the copied text */
    alert("Copied the selected genes to clipboard");
  });

  $("#go_copy").click(function() {
    let curr_focus_anchors = $("#go_focus_tag_it").tagit("assignedTags");
    for (let i in curr_focus_anchors){
      $("#go_select_tag_it").tagit("createTag", curr_focus_anchors[i]);
    }
  });
  $(".hidden-textbox").hide();
}

function setup_simulation_highlight_options() {
  let hypo_type = ["self-contained non-null",
                   "competitive non-null"];
  let hypo_alias = {"self-contained non-null": "self_nonnull",
                   "competitive non-null":  "comp_nonnull"};
  $.each(hypo_type, function (i, item) {
    $("#highlight_node_select").append($('<option>', {
      value: hypo_alias[item],
      text : item,
    }));
  });
}

function get_candidate_nodes_per_level(graph_data, main_config) {
  let view = main_config.curr_state.View;
  let htype =  main_config.curr_state.Highlight;
  let full_level_cnt = graph_data.context_info.meta.level_counts[view];
  // initialize empty levels
  let level_nodes = [];
  for (let level_i in full_level_cnt) {
    level_nodes.push([]);
  }
  // if the data falls into context highlights, then only the
  // highlighted nodes can be considered as candiates

  if (htype in main_config.context_highlights) {
    if (htype == "focus_relatives") {
      level_nodes = graph_data.context_info.meta.level_counts_focus_relatives[view];
    } else {
      let node_data = graph_data.context_info.graph.node_data;
      let highlight_list;
      // 1. get the list of nodes ot be highlighed
      if (htype in {"self_nonnull":null, "comp_nonnull":null}) {
        highlight_list = full_data.ground_truth_info[htype];
      }
      if (htype =="query_data" ) {
        nid_map = full_data.context_data.name_id_map;
        highlight_list = [];
        for (let name in full_data.general_data.query_data){
          highlight_list.push(nid_map[name]);
        }
      }
      // 2. if the view is depth of height, then push the nodes to list
      if (view == "depth" || view == "height") {
        highlight_list.forEach( (d) => {
          let level = node_data[d][view];
          level_nodes[level].push(d);
        });
      }
      if (view == "flex") {
        let lev_idx = graph_data.context_info.meta.level_starts.flex;
        // TODO: one could speed up
        for (let i = 0; i < lev_idx.length; i ++ ) {
          let min_val, max_val;
          if ( i == 0 ) {
            min_val = 0;
          } else {
            min_val = lev_idx[i-1] + 1;
          }
          max_val = lev_idx[i];
          highlight_list.forEach( (d) => {
            if ( (d >= min_val) & (d <= max_val)) {
              level_nodes[i].push(d);
            }
          });
        }
      }
    }
  }
  return level_nodes;
}

function find_related_nodes(fg_in_cntx, node_ids, relation) {
  // e.g. data.focus_data.grpah.test_context or data.focus_data.grpah.full_context
  let queue = node_ids; // should be an array of ids
  let curr_len;
  let curr_node_i;
  let node_dist = {};
  let curr_lev = 0
  while (queue.length > 0) {
    curr_len = queue.length;
    while ( curr_len > 0 ) {
      curr_node_i = queue.shift();
      fg_in_cntx[curr_node_i][relation].forEach( function(node_i){
        queue.push(node_i)
        node_dist[node_i] = curr_lev;
      })
      curr_len --;
    }
    curr_lev ++;
  }
  return node_dist;
}

function find_outer_nodes(fg_in_cntx, node_ids) {
  // node_dict is a map of nodes
  let outer_nodes = {};
  // console.log(node_ids);
  node_ids.forEach(function(q_id){
    // desc is a dict from node ids to levels
    let desc= find_related_nodes(fg_in_cntx,[q_id],"children");
    delete desc[q_id]; // delete the node itself
    // console.log("Current node: " + q_id);
    // console.log("Ancestors:");
    // console.log(ancestors);
    let cover_others = 0;
    node_ids.forEach(function(a_id) {
      if (a_id in desc) {
        cover_others += 1;
        // console.log("Found covering node: " + a_id);
      }
    });
    if (cover_others == 0) {
      outer_nodes[q_id] = null;
    }
  });
  return outer_nodes;
}

function get_outer_node_names(focus_info) {
  let query_ids = [];
  for (let q_name in focus_info.meta.anchors) {
    query_ids.push(focus_info.meta.name_rev_map[q_name]);
  }
  let outer_ids_map = find_outer_nodes(focus_info.graph, query_ids);
  let outer_names = {};
  for (let outer_id in outer_ids_map) {
    let outer_name = focus_info.graph[outer_id].name;
    outer_names[outer_name] = outer_ids_map[outer_id];
  }
  return outer_names;
}

function append_search(input_id, tag_id) {
  // parse the comma-deliminted input fields, typically
  // there is an empty string after the last comma
  let val = $(input_id).val().split(", ");
  val = val.slice(0,val.length-1);
  append_tags(tag_id, val);
  // clear the field
  $(input_id).val("");
}

function append_go_search() {
  // add the go terms to the candidate list
  append_search("#query_list", "#go_tagsinput")
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}


// tag inputs and autocomplete: uses the tag-it jquery api
// source: https://github.com/aehlke/tag-it
// ------------------------------------------------------------
function monkeyPatchAutocomplete() {
  // source: https://stackoverflow.com/questions/9167106
  // this function is used for autocomplete in the tag-it object
  // it highlights the matches in the data
  // http://jsbin.com/qixaxinuhe/3/edit?html,css,js,output
  // Don't really need to save the old fn,
  // but I could chain if I wanted to
  var oldFn = $.ui.autocomplete.prototype._renderItem;

  $.ui.autocomplete.prototype._renderItem = function( ul, item) {
      var re = new RegExp(this.term, "i") ;
      var t = item.label.replace(re,
            "<span style='font-weight:bold;color:Blue;'>" +
            this.term + "</span>");
      return $( "<li></li>" )
          .data( "item.autocomplete", item )
          .append( "<a>" + t + "</a>" )
          .appendTo( ul );
  };
}

function initialize_autocomplete(search_dict,
                                 element_id,
                                 container_id, // e.g., .$(".context-block .tagit").remove()
                                 limit_scope=null) {

  // $(container_id + " .tagit").empty(); // clear up everything
  console.log("Initializing autocomplete for " + element_id);
  monkeyPatchAutocomplete()
  // parameters
  let max_res_len = 10;
  // create the search_list and reverse_map
  let search_labs = Object.keys(search_dict);
  let search_list = [];
  let rev_search_map = {};
  let search_item;
  for (let lab in search_dict) {
    search_item = search_dict[lab] + " - " + lab;
    rev_search_map[search_item] = lab;
    if (limit_scope === null) {
      search_list.push(search_item);
    } else {
      if ($.inArray(lab, limit_scope) > -1) {
        // only add the searchable elements
        search_list.push(search_item);
      }
    }
  }
  let source_function = (function() {
    var autocomplete_list = search_list;
    return function(request, response) {
      // source: https://stackoverflow.com/questions/7617373
      // source: https://www.w3schools.com/js/js_function_closures.asp
      // see link above on how to limit search result
      // see link above closure (not necessary but we used it here)
      var results = $.ui.autocomplete.filter(autocomplete_list, request.term);
      response(results.slice(0, max_res_len));
    }
  })();
  let autocomplete_dict = {
    delay: 0,
    minLength: 3, // minimum length of the match displayed
    source: source_function,
  };
  let tag_args = {
    allowSpaces: true,
    autocomplete: autocomplete_dict,
    preprocessTag: function(val) {
      if (!val) {
          return '';
      }
      // if ($.inArray(val, search_labs) != -1) {
      if (val in search_dict) { // if the user specifies the ID
        return val;
      }
      return rev_search_map[val];
    },
    beforeTagAdded: function(event, ui) {
      // the tags added must be consistent with the go id format
      // if ($.inArray(ui.tagLabel, search_labs) == -1) {
      if (!(limit_scope === null)) {
        if ($.inArray(ui.tagLabel, limit_scope) == -1) {
          return false;
        }
      }
      if (!(ui.tagLabel in search_dict)) {
        return false;
      }
    },
    afterTagAdded: null,
    beforeTagRemoved: null,
  };

  $(element_id).tagit("destroy"); // destroy the previous attributes
  $(element_id).tagit(tag_args);  // update the correct attributes
  $(element_id).tagit("removeAll"); // clear every tag input
}

function append_random_genes(add_type) {
  let go_terms = $("#go_select_tag_it").tagit("assignedTags");

  // let go_terms = $("#go_tagsinput").val().split(",");
  let num_add = $("#spinner_num_genes").val();
  let perc_add = $("#spinner_prop_genes").val();
  // use the reverse mapping to retrieve the genes
  let go_gene_map = full_data.context_data.go_gene_map; // idx -> g_id
  let name_id_map = full_data.context_data.name_id_map; // go -> idx
  let gene_id_sym_map = full_data.context_data.gene_id_sym_map;
  let total_genes = {};
  go_terms.forEach( (d) => {
    let gene_ids = go_gene_map[name_id_map[d]];
    console.log(d + ": " + gene_ids.length + " genes")
    gene_ids.forEach( (g) => {
      total_genes[gene_id_sym_map[g]] = null;
    })
  });
  total_genes = Object.keys(total_genes);
  let new_gene;
  let new_genes = [];

  let n_add;
  let skip_draw = false;
  if (add_type == "num_genes") {
    n_add = num_add;
    if (n_add >= total_genes.length) {
      skip_draw = true;
    }
  } else { // "prop_genes"
    n_add = Math.round(perc_add * total_genes.length / 100);
    if (perc_add == 100) {
      skip_draw = true;
    }
  }
  if (skip_draw) {
    new_genes = total_genes;
    console.log("Using all genes!");
  } else {
    while (n_add > 0) {
      // console.log("added new gene")
      new_gene = total_genes[getRandomInt(total_genes.length)];
      if (!(new_genes.includes(new_gene))) {
        new_genes.push(new_gene)
        n_add -= 1;
      }
    }
  }
  for (let foc_i=0; foc_i<new_genes.length; foc_i++) {
    let gene = new_genes[foc_i];
    $("#go_gene_tag_it").tagit("createTag", gene);
  }
  // let genes_requested = $("#gene_tagsinput").val().split(",");
}
function reformat_context_data(in_data) {
  let go_info = {};
  // include go terms in the test_context
  in_data.node_data.forEach((d) => {
    go_info[d.name] = {
      "ann": in_data.go_anns[d.cid],
      "genes": in_data.go_gene_map[d.cid],
      "ngenes": in_data.go_gene_map[d.cid].length,
    };
  });
  let out_data = in_data;
  out_data.go_info = go_info;
  // out_data.gene_list = Object.keys(out_data.gene_id_sym_map);
  // out_data.go_awesomplete =init_go_awesomplete(in_data);
  return out_data;
}

function reformat_focus_data(in_data, cntx_data, general_data) {
  // modify the graph data using inputs from both context and focus queries
  // console.log(cntx_data.level_counts)
  let out_data = in_data;
  let cntx_info = out_data.context_info;
  let fcs_info = out_data.focus_info;
  // retrieve the counts on each level for different views
  for (let lev_t in cntx_data.level_counts) {
    cntx_info.meta.level_counts[lev_t] = cntx_data.level_counts[lev_t];
  }
  // get the actual nodes in each layer based on view
  cntx_info.graph.level_nodes = {}
  for (let lev_t in cntx_data.fixed_level_nodes) {
    cntx_info.graph.level_nodes[lev_t] = cntx_data.fixed_level_nodes[lev_t];
  }
  // include the maximum range
  for (let lev_t in cntx_data.max_level) {
    fcs_info.meta.max_range[lev_t].y = cntx_data.max_level[lev_t];
  }

  let simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }));
  out_data.focus_info.meta.simulation = simulation;
  out_data.context_info.graph.go_info = cntx_data.go_info;
  out_data.context_info.graph.node_data= cntx_data.node_data;
  // include the reverse map of the node information
  let rev_map = {};
  in_data.focus_info.graph.forEach(function(node) {
    rev_map[node.name] = node.id;
  });
  out_data.focus_info.meta.name_rev_map = rev_map;
  out_data.focus_info.meta.outers = get_outer_node_names(out_data.focus_info);
  out_data.focus_info.meta.queries = general_data.query_data;
  return out_data;
}


function get_data_dependent_dim(main_config, fixed_dim) {
  let curr_view = main_config.curr_state.View;
  let max_lev =  main_config.graph.max_range[curr_view].y;
  let max_width = main_config.graph.max_range[curr_view].x;
  return(get_full_canvas_config(max_width, max_lev, fixed_dim));
}

function update_svg_dimension(svg_id, confg, fixed_dim=false) {
  let viewer_svg = d3.select(svg_id);
  let fm = get_data_dependent_dim(confg, fixed_dim=fixed_dim);
  viewer_svg
    .attr("height", fm.svg_background.height)
    .attr("width",  fm.svg_background.width)
    ;
  let x_pos = fm.split.left_ann + fm.split.graph;
  viewer_svg.select(".mid-ann")
    .attr("transform", "translate(" + x_pos + ", 0)");
  viewer_svg.select(".mid-ann").select(".yaxis")
    .attr("transform", "translate(" + fm.split.mid_ann + ", 0)");
  viewer_svg.select(".bar-layer").select(".legend-box")
    .attr("transform", "translate("+
    (fm.svg.width * fm.legend.rel_x)+","+
    (fm.svg.height * fm.legend.rel_y) + ")")
    ;
}

function setup_graph_updates(graph_data, confg) {
  // this is where all possible ways to update the graph should be specified
  update_config_from_graph(graph_data, confg);
  update_all_graphs(graph_data, confg);

  $("#view_select").off().on("change", function() {
    if (this.value == "flex")  {
      $("#full_go_dag").css("display", "none")
      confg.curr_state.Context = "test_context";
    } else {
      $("#full_go_dag").css("display", "flex")
    }
    confg.curr_state.View = this.value;
    update_all_graphs(graph_data, confg);
  })

   $("#highlight_node_select").off().on("change", function() {
     // confg.curr_state.Htype = this.value;
     confg.curr_state.Highlight = this.value;
     update_all_graphs(graph_data, confg);
   })
  // functions and interactions specific to simulation setup
  function gene_tagit_remove_update(event, ui) {
    request_ground_truth_data();
  }
  $("#go_gene_tag_it").tagit({
    afterTagRemoved: gene_tagit_remove_update,
  })
  if (confg.main_mode == "lite") {
    $("#gene_reset_button").off().on('click', function() {
      $("#go_gene_tag_it").tagit("removeAll");
    });
    $("#add_random_num_genes").off().on('click', function() {
      append_random_genes("num_genes")
    });
    $("#add_random_prop_genes").off().on('click', function() {
      append_random_genes("prop_genes")
    });
  }
  if (confg.main_mode == "simulation_setup") {
    $("#gene_reset_button").off().on('click', function() {
      $("#go_gene_tag_it").tagit({
        afterTagRemoved: null,
      })
      $("#go_gene_tag_it").tagit("removeAll");
      // request simulation data
      // update_all_graphs(graph_data, confg);
      $("#go_gene_tag_it").tagit({
        afterTagRemoved: gene_tagit_remove_update,
      })
      request_ground_truth_data();
    });
    $("#add_random_num_genes").off().on('click', function() {
      // request simulfation data
      // update_all_graphs(graph_data, confg);
      append_random_genes("num_genes")
      request_ground_truth_data();
    });
    $("#add_random_prop_genes").off().on('click', function() {
      // request simulation data
      // update_all_graphs(graph_data, confg);
      append_random_genes("prop_genes")
      request_ground_truth_data();
    });
  }
}

function update_config_from_graph(graph_data, conf) {
  let focus_info = graph_data.focus_info;
  let level_types = ["depth", "height", "flex"];
  for (let i = 0 ; i < level_types.length; i ++ ) {
    let lev_t = level_types[i];
    // console.log(data.focus_data.meta[cntx_t].max_range)
    conf.graph.max_range[lev_t] = focus_info.meta.max_range[lev_t];
  }
  // if (cntx_t  == "text_context"){
  //   conf.curr_state.Mode = "stat_reject";
  // }
  // if (cntx_t  == "full_context"){
  //   conf.curr_state.Mode = "initial";
  // }
  for (let view in conf.level_breaks) {
    if (view == "flex") {
      let cntx_meta = graph_data.context_info.meta;
      conf.level_breaks[view] = cntx_meta.level_breaks[view];
    }
  }
  // console.log(conf);
  return conf;
}

function update_all_graphs(graph_data, conf) {
  graph_data.curr_lev_nodes =  get_candidate_nodes_per_level(graph_data, conf);
  let svg_id = "#full_mirror_display";
  let fixed_dim = true;
  update_svg_dimension(svg_id, conf, fixed_dim=fixed_dim);
  update_grid_display(svg_id, graph_data, conf, fixed_dim=fixed_dim);
  update_focus_display(svg_id, graph_data, conf, fixed_dim=fixed_dim);
  update_context_display(svg_id, graph_data, conf, fixed_dim=fixed_dim);
}

function update_binder_plot(container, full_data, ss_manhattan_config) {
  let cntx_data = full_data.graph_data.context_info;
  let c_grp_data = cntx_data.meta.level_starts.flex;
  let n_nodes = cntx_data.graph.node_data.length;

  let f_nodes = full_data.graph_data.focus_info.graph;
  let n_groups = c_grp_data.length;
  let f_group_ordering = [];
  for (let i = 0; i < n_groups; i ++) {
    // i is the current level
    f_group_ordering.push([]);
  }
  f_nodes.forEach(d => {
    f_group_ordering[d.pos_info.flex.y].push(d.cid);
    d.full_name = full_data.general_data.search_dict[d.name];
  })
  let node_values = [];
  let c_group_data = null;
  for (let i =0; i < n_nodes; i++) {
    node_values.push(0);
  }
  if (full_data.general_data.simulation !== null) {
    node_values = full_data.general_data.simulation["matrix"];
    c_group_data = c_grp_data;
  }
  update_ssm_plot(container,
                  node_values,
                  f_nodes,
                  f_group_ordering,
                  c_grp_data,
                  ss_manhattan_config,
                  "light");

}

function test_ssm_data() {
      // ---------------------------------------------------------
    // TEST CASE: COPY SOMEWHERE
    // TODO: replace dummy with real values:
    let c_group_ordering = [[0],[1,2],[3,4,5,6],[7,8],[9]];
    let f_group_ordering = [[0],[2],[3,4],[7],[]];
    let f_nodes = [{"id": 0, "children": [1,2]},
                   {"id": 1, "children": [3]},
                   {"id": 2, "children": []},
                   {"id": 3, "children": [4]},
                   {"id": 4, "children": []}]
    let n_values = [];
    // dummy variable setups
    focus_node_indices = [];
    for (let i = 0; i < f_group_ordering.length; i++ ) {
      for (let j = 0; j < f_group_ordering[i].length; j++) {
        focus_node_indices.push(f_group_ordering[i][j]);
      }
    }
    for (let i = 0; i < focus_node_indices.length; i++ ) {
      f_nodes[i].cid = focus_node_indices[i];
      f_nodes[i].name = "GO:" + focus_node_indices[i];
    }
    for (let i = 0; i < 10; i++) {
      n_values.push(Math.random());
    }
    // ---------------------------------------------------------
}

