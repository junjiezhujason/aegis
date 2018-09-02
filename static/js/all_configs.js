// all_configs.js

let init_options = {
  "#spinner_max_num_foc_anchors" : 4,
  "#focus_anchor_type": "waypoint",
  "#spinner_foc_gap_break": 1000,
  "#spinner_desc_size": 20,
  "#check_group_focus": true,
  "#species_selection": "human",
  "#ontology_selection": "biological_process",
};

let all_color_mapping = {
  "link_default": "#808080",
  "tested_in_full": "#581845",
  "not_tested_in_full": "#A2A2A2",
  "test_nonnull": "#C70039",
  "test_null": "#581845",
  "node_background": "#A2A2A2",
  "edge_background": "#A2A2A2",
  "node_stat": "#581845",
  "node_reject": "#C70039",
  "node_search": "#FA8072",
  "node_select": "#2F000A",
  "node_select_neighbor": "#7F001B",
  "node_select_relative": "#ff3333",
  "node_query_border": "#E8EB3E", //TODO:remove
  "node_anchor_border": "#80dfff",
  "node_prolif_border": "#ffb366",
  "bar_total": "#A2A2A2",
  "bar_statistical" : "#581845",
  "bar_queried" : "#FA8072",
  "bar_selected" : "#FA8072",
  "bar_reject" : "#C70039",
  "node_base" : "#581845", // the base color of the node
  "node_highlight": {
    "default": "#C70039",
    "cntx_ancs": "#3399ff",
    "fcus_ancs": "#3399ff",
    "prolif_set": "#FA8072",
    "fcus_outer": "#339966",
  },
  "highlights": {
    "self_nonnull": "#C70039",
    "comp_nonnull": "#C70039",
    "query_data": "#A569BD",
    "prolif_set": "#FA8072",
    "fcus_outer": "#3399ff",
    "fcus_ancs": "#3399ff",
    "plain": "#515A5A",
    "none": "#626567",
    "hide": "#BDC3C7",
    "focus_relatives": "#752481",
    "fcux_ancs_2": "#2753AD",
  },
};

function get_full_canvas_config(x_size, y_size, fixed=false) {
  // default for fixed view
  let padding = { "top": 40,
                  "bottom": 25,
                  "left": 0,
                  "right": 30};
  let back_height = 600;
  let back_width = 800;
  let mid_ann = 10;
  let left_ann = 80;
  let right_ann = 60;
  if (fixed) {
    mid_ann = 43; // leave space for buttons
  }

  let graph_width, bar_width, height;
  if (fixed) {
    let nominal_width = (x_size + 1) * 30;
    let nominal_height = (y_size + 1) * 50;
    height = Math.min(back_height, nominal_height);
    graph_width = Math.min(back_width / 2 - left_ann, nominal_width);
    bar_width = back_width / 2 - right_ann;
    left_ann = back_width / 2 - graph_width;
  } else { // adaptive according to the graph
    let y_lim = 25;
    let min_tot_width = 600;
    let col_width = 30;  // graph width per node
    // let x_lim = Math.round((min_tot_width/2 - left_ann) / col_width);
    let x_lim = 10;
    if (x_size < x_lim) { // minimum number of nodes in each layer for scaling
      col_width = 32;
      // graph_width = x_size * col_width;
    } else { // many many nodes
      col_width = 20;
      // graph_width = x_size * col_width;
    }
    graph_width = x_size * col_width + padding.right;

    left_ann += Math.max(min_tot_width/2, graph_width) - graph_width;
    height = (y_size + 1) * 30 + padding.top + padding.bottom;
    back_height = height;
    bar_width = graph_width + mid_ann + left_ann - right_ann;
    back_width = Math.max(min_tot_width,
                          bar_width + graph_width + left_ann + right_ann);
  }

  let hspace =  {
    "left_ann": left_ann,
    "mid_ann": mid_ann,
    "right_ann": right_ann,
    "graph": graph_width,
    "bar": bar_width,
  };
  // add the margins to the width
  width = graph_width + bar_width + left_ann + mid_ann + right_ann;
  let dim = {
    "svg": {
      "height": height,
      "width": width,
    },
    "svg_background": {
      "height": back_height,
      "width": back_width,
    },
    "split": hspace,
    "legend" : {
      "rel_x": 0.65,
      "rel_y": 0.05,
    },
    "padding": padding,
  };
  return(dim);
}

function get_foc_config() {
  let total_graph = get_full_canvas_config(10, 10);
  let mirror_graph_config = {
    "transition": {
      "delay": {
        "select": 200,
      },
      "start_x_pos": 0,
    },
    "padding": {
      "top": total_graph.padding.top,
      "bottom": total_graph.padding.bottom,
      "left": total_graph.padding.left,
      "right": total_graph.padding.right,
    },
    "node":  {
      "radius": 7,
      "border_size": 3,
    },
    "link": {
      "width": "2px",

    },
    "opacity": {
      "background_link": 0.8,
      "hidden": 0.2,
    },
    "simulation": null,
    "max_range": {
      "depth": {
        "x": null,
        "y": null,
      },
      "height": {
        "x": null,
        "y": null,
      },
      "flex": {
        "x": null,
        "y": null,
      }
    },
  };
  return mirror_graph_config;
}

function get_con_config() {
  let total_graph = get_full_canvas_config(10, 10);
  let mirror_bar_config = {
    "n_y_ticks": 5,
    "padding": {
      "top": total_graph.padding.top,
      "bottom": total_graph.padding.bottom,
      "left": 0,
      "right":70,
    },
    "left_tick_padding": 8,
    "legend": {
      "top_shift": 15,
      "sym_text_gap": 10,
      "marker_size": 12,
      "height": 40,
      "text_size": 12,
      "location": 0.50,
      "padding": 4,
    },
    "text_dist": 10,
    "tri_size": 11,
    "max_range": {
      "depth": {
        "x": null,
        "y": null,
      },
      "height": {
        "x": null,
        "y": null,
      },
      "flex": {
        "x": null,
        "y": null,
      }
    },
    "width_prop": 0.3,
    "width_wide_prop": 0.7,
    "hide_triangle": {
      "none": null,
      "fcus_ancs": null,
      "prolif_set": null,
      "fcus_outer": null,
    },
  };
  return mirror_bar_config;
}

let general_config = {
  "download_font_size": 17,
  "access_dag": "",
  "requests": {
    "ontology": {
      "query_dataset": null, // could be a "upload" or "example1" or "example2"
      "query_anchors": null, // could be at "focus" or "context"
    },
    "context": {
      "min_node_size": 1,
      "max_node_size": 30000,
      "anchor_type": "Root",
    },
    "focus": {
    },
  },
  "init_options": init_options,
  "plotly": {
    "svg": {
      "width": 800/3,
      "height": 400,
    },
  },
  "transition": {
    "exit_layer_time": 200,
    "enter_layer_time": 200,
    "total_buffer_time": 300,
    "min_time": 2,
    "exit_time": 500,
    "update_time": 500,
    "enter_time": 10000,
    "prev_nlayers": 1,
    "prev_node_lev_map": {},
  },
  "main_div": "",
  "main_mode": "simulation_setup",
  "margins": {top:20,right:40,bottom:60,left:40},
  // "default_layer_type" : "flex",
  // "default_layout_type": "fixed",
  "svg_graph_width": 330,
  "svg_graph_height": 400,
  "svg_flex_min_height": 200,
  "bar_graph_width": 400,
  "left_padding": 10,
  "colors": all_color_mapping,
  "bar": get_con_config(),
  "graph": get_foc_config(),
  "context_highlights": {
    "self_nonnull": "",
    "comp_nonnull": "",
    "query_data": "",
    "focus_relatives": "",
  },
  // "mode": {
  //   "initial": null,
  //   "stat_reject": null,
  //   "total_reject": null,
  //   "total_search": null
  // },
  "sim_time": 9,
  "curr_state": {
    "Htype": "self_nonnull",
    "View": "flex",
    "Context": "test_context",
    // "Mode": "initial",
    "Trial": 0,
    "Case": 0,
    "Method": "BH",
    "Highlight": "none",
    "QueryAsContext": false,
    "MaxFocusAnc": 10,
  },
  "level_breaks": {
    "depth": [],
    "height": [],
    "flex": [],
  },
};

function get_subplot_breakdown(ss_manhattan_dim) {
  let ss_manhattan_share = {
    "total": ss_manhattan_dim,
    "padding": {
      "top": 5,
      "bottom": 40,
      "left": 6,
      "right": 1,
    },
    "plot_type_dim": {
      "manhattan-plot": {
        "width": 200,
        "height": ss_manhattan_dim.height,
      },
      "zoom-bridge-plot": {
        "width": ss_manhattan_dim.height / 10,
        "height": ss_manhattan_dim.height,
      },
      "text-bridge-plot": {
        "width": 80,
        "height": ss_manhattan_dim.height,
      },
      "text-long-bridge-plot": {
        "width": 170,
        "height": ss_manhattan_dim.height,
      },
      "arc-plot": {
        "width": ss_manhattan_dim.height / 2,
        "height": ss_manhattan_dim.height,
      },
      "heatmap-plot": {
        "width": 240,
        "height": ss_manhattan_dim.height,
      }
    }
  }
  return(ss_manhattan_share)
}

function ssm_params(height=350, width=700, main_mode="simulation_result") {
  if (main_mode == "visualizer") {
    graph_only = true;
    show_context = false;
    show_name=true
    main_plot_type = "vector";
  } else {
    graph_only = false;
    show_context = false;
    show_name=true
    main_plot_type = "matrix";
  }
  let ss_manhattan_dim = {
    "width": width,
    "height": height,
  };

  let ss_manhattan_share = get_subplot_breakdown(ss_manhattan_dim);
  let ss_manhattan_config = {
    "max_node_display": 50,
    "shared_padding": ss_manhattan_share.padding,
    "row_height": 19,
    "show_name": show_name,
    "main_plot_type": main_plot_type,
    "show_context": show_context,
    "graph_only": graph_only,
    "max_name_len": 25,
    "component_breakdown":{
      "graph": [
        {
          "id": "arc-graph-plot",
          "class": "arc-plot",
        },
        {
          "id": "go-name-table",
          "class": "text-long-bridge-plot",
        },
        {
          "id": "go-id-table",
          "class": "text-bridge-plot",
        },
      ],
      "vector": [
        {
          "id": "focus-graph-plot",
          "class": "manhattan-plot",
        },
        {
          "id": "multi-polygons",
          "class": "zoom-bridge-plot",
        },
        {
          "id": "context-graph-plot",
          "class": "manhattan-plot",
        },
      ],
      "matrix": [
        {
          "id": "focus-graph-heatmap",
          "class": "heatmap-plot",
        },
        {
          "id": "multi-polygons",
          "class": "zoom-bridge-plot",
        },
        {
          "id": "context-graph-heatmap",
          "class": "heatmap-plot",
        },
      ],
    },
    "plot_type_dim": ss_manhattan_share.plot_type_dim,
    "total": ss_manhattan_share.total,
    "opacity": {
      "hidden": 0.5,
      "highlight": 0.9,
    },
    "color": {
      "heatmap": {
        // "domain": [0, 0.5, 1],
        // "range": ['#000000', '#FF8484', '#C40000'],
        // "domain": [0, 1],
        // "range": ['#000000', '#C40000'],
        "domain": [0, 0.25, 0.5, 0.75, 1],
        "range": ['#35193e', '#701f57', '#ad1759', '#e13342', '#f37651'], //, '#f6b48f'],
        // let colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"];
      },
      "background": {
        "even": "#B9CCFF",
        "odd": "#D6EAF8",
      },
      "points": {
        "even": "#000000",
        "odd": "#000000",
      },
      "arc": "#818181",
      "node_select": all_color_mapping.node_select,
      "node_select_neighbor": all_color_mapping.node_select_neighbor,
      "node_select_relative": all_color_mapping.node_select_relative,
    },
    "arc_graph": {
      "node_size": 4,
      "padding": {
        "right": 10,
        "left": 30,
        "top": ss_manhattan_share.padding.top,
        "bottom": ss_manhattan_share.padding.bottom,
      },
    },
    "manhattan_plot": {
      "padding": {
        "top": ss_manhattan_share.padding.top,
        "bottom": ss_manhattan_share.padding.bottom,
        "left": 6,
        "right": 8,
      },
      "scatter": { // default scatter dot size and color
        "radius" : 3,
      }
    },
    "class_style": {
      "manhattan-plot": {
        "width": "22%",
        "height": "100%",
      },
      "zoom-bridge-plot": {
        "width": "5%",
        "height": "100%",
      },
      "text-bridge-plot": {
        "width": "14%",
        "height": "100%",
      },
      "arc-plot": {
        "width": "35%",
        "height": "100%",
      },
    },
    "max_val_margin": 0.10,
    "n_value_ticks": 5,
  };
  return(ss_manhattan_config);
}



