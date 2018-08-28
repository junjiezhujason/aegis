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
  }
};

function get_full_canvas_config(x_size=0, y_size=0) {
  let dim = {
    "svg": {
      "height": 600,
      "width": 800,
    },
    "split": {},
    "legend" : {
      "rel_x": 0.72,
      "rel_y": 0.05,
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
  }

  let hspace =  {
    "left_ann": 80,
    "mid_ann": 43,
    "right_ann": 10,
  }


  let x_lim = 20;
  let y_lim = 25;
  if (x_size > x_lim) {
    dim.svg.width = x_size * (dim.svg.width / x_lim);
  }
  if (y_size > y_lim) {
    dim.svg.height = y_size * (dim.svg.height / y_lim);
  }
  let res = dim.svg.width - hspace.left_ann - hspace.mid_ann - hspace.right_ann;
  hspace.graph =  0.45 * res;
  hspace.bar =  0.55 * res;
  if (x_size > x_lim) {
    hspace.graph = 0.5 * res;
    hspace.bar =  0.5 * res;
  }
  dim.split = hspace;

  return(dim);
}


let bar_graph_share = {
  "padding": {
    "top": 40,
    "bottom": 25,
  }
};

let mirror_graph_config = {
  "transition": {
    "delay": {
      "select": 200,
    },
    "start_x_pos": 0,
  },
  "padding": {
    "top": bar_graph_share.padding.top,
    "bottom": bar_graph_share.padding.bottom,
    "left": 0,
    "right": 25,
  },
  "node":  {
    "radius": 7,
    "border_size": 3,
  },
  "link": {
    "width": "2px",

  },
  "opacity": {
    "background_link": 0.5,
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

let mirror_bar_config = {
  "n_y_ticks": 5,
  "padding": {
    "top": bar_graph_share.padding.top,
    "bottom": bar_graph_share.padding.bottom,
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


let general_config = {
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
  "full_mirror": get_full_canvas_config(),
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
  "bar": mirror_bar_config,
  "graph": mirror_graph_config,
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

let config_caseslider = {
  "init_trial":0,
  "init_case": 0,
  "layout" : {
    "marker_layout" :  {
      "marker" : {
        "size": 8,
        "color": [
          "pink",
          "purple",
          "red",
          "green"
        ]
      },
      "hoverinfo" :"x+y"
    },
    "graph_layout":{
      // "legend" : {
      //   x: 1.1,
      //   y: 1.0,
      //   traceorder: 'normal',
      //   font: {
      //     family: 'sans-serif',
      //     size: 12,
      //     color: '#000'
      //   },
      //   bgcolor: '#E2E2E2',
      //   bordercolor: '#FFFFFF',
      //   borderwidth: 2
      // },
      "margin" : {
        t : 10,
        pad : 10
      },
      "hovermode" : 'closest',
      "xaxis" : {
        title: 'jaccard_distance',
        showgrid: true,
        zeroline: false,
        hoverformat: '.2f'
      },
      "yaxis": {
        title: 'raw_pvalue',
        showgrid: true,
        zeroline: false,
        range : [-0.1,1.1],
          hoverformat: '.2f'
      },
      "sliders" : {
        pad: {t: 30,
                b : 30},
        x: 0.05,
        y: 2.3,
        len: 0.905,
        currentvalue: {
          xanchor: 'right',
          prefix: 'Case: ',
          font: {
            color: '#888',
            size: 13
          }
        },
        transition: {duration: 500}
      },
      "updatemenus" : {
        type: 'buttons',
        showactive: false,
        x: 0.05,
        y: 2.3,
        xanchor: 'right',
        yanchor: 'top',
        pad: {t: 60, r: 20},
        buttons: [{
          label: 'Play',
          method: 'animate',
          args: [null, {
            fromcurrent: true,
            frame: {redraw: false, duration: 1000},
            transition: {duration: 500}
          }]
        }]
      }
    }
  },
  "step_config":{
    "mode": 'immediate',
    "frame": {redraw: false, duration: 500},
    "transition": {duration: 500}
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



