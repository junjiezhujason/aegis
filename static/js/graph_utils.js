function create_graph_svg(container, confg) {
  let svg = d3.select(container).append("svg")
    .attr("class", "graph_display")
    .attr("height", "100%")
    .attr("width",  confg.svg_graph_width)
    ;
  // add the Y gridlines
  svg.append("g").attr("class", "grid-break");
  svg.append("g").attr("class", "grid-layer");
  svg.append("g").attr("class","links");
  svg.append("g").attr("class","nodes");
}

function create_links(main_nodes) {
  let tot_n_nodes = main_nodes.length;
  let main_links = [];
  for (let i = 0; i < tot_n_nodes; i ++) {
    let children = main_nodes[i].children;
    for (let j = 0; j < children.length; j++) {
      // add the children links
      main_links.push(
        { "source" : main_nodes[i],
          "target" : main_nodes[children[j]],
          "name": main_nodes[i].name + "-" + main_nodes[children[j]].name,
        }
      );
    }
  }
  return main_links;
}

function update_node_features(graph_data, confg) {
  let node_data = graph_data.focus_info.graph;
  let node_meta = graph_data.focus_info.meta;
  // for positional information
  let curr_view = confg.curr_state.View;
  let xy_scales = graph_scale_setup(curr_view, confg);
  let x_scale = xy_scales.x;
  let y_scale = xy_scales.y;
  // for node colors
  let highlight_mode = confg.curr_state.Highlight;
  let highlight_col;
  if (highlight_mode in confg.colors.node_highlight) {
    highlight_col = confg.colors.node_highlight[highlight_mode];
  } else {
    highlight_col = confg.colors.node_highlight["default"];
  }
  node_data.forEach(function(d) {
    d.lev_x = d.pos_info[curr_view].x;
    d.lev_y = d.pos_info[curr_view].y;
    d.cx = x_scale(d.lev_x);
    d.cy = y_scale(d.lev_y);
    d.x = d.cx;
    d.y = d.cy;
    d.fx = null;
    d.fy = null;
    d.anchor = d.name in node_meta.anchors;
    d.prolif = d.name in node_meta.prolifs;
    d.r = node_rad_wid_col(d, confg)[0];
    d.col = confg.colors.node_base; // this is the base color of each node

    let target_data;
    switch(highlight_mode) {
      case "fcus_ancs":
        target_data =  node_meta.anchors;
        break;
      case "prolif_set":  // highlight prolific nodes
        target_data =  node_meta.prolifs;
        break;
      case "fcus_outer":
        target_data = node_meta.outers;
        break;
      case "query_data":
        target_data = node_meta.queries;
        break;
      default:
        target_data = {};
        break;
    }

    if (highlight_mode in {"self_nonnull":null, "comp_nonnull":null}) {
      let ground_truth = full_data.ground_truth_info[highlight_mode];
      let ground_set = {};
      ground_truth.forEach(function(node_id) {
        ground_set[node_id] = null;
      })
      if (d.cid in ground_set) {
        d.col = confg.colors.highlights[highlight_mode];
      } else {
        d.col = confg.colors.highlights["none"];
      }
    } else {
      // use data targets
      if (d.name in target_data) {
        d.col = confg.colors.highlights[highlight_mode];
      } else {
        d.col = confg.colors.highlights["none"];
      }
    }

  });
  return node_data;
}

function default_node_appearance(d3_select_all, confg) {
 let out_select =  d3_select_all
    .attr("r",  d => node_rad_wid_col(d, confg)[0])
    .style("stroke-width", d => node_rad_wid_col(d, confg)[1])
    .style("stroke", d => node_rad_wid_col(d, confg)[2])
    .style("fill", d => d.col )
    .attr("opacity", 1)
    ;
 return out_select;
}


function update_focus_display(graph_data, confg) {
  container = confg.main_div;
  // let curr_cntx = confg.curr_state.Context;
  let focus_info = graph_data.focus_info;
  let go_info = graph_data.context_info.graph.go_info;
  // console.log(go_info);
  focus_info.links = create_links(focus_info.graph);
  focus_info.graph = update_node_features(graph_data, confg);


  // TODO: create a function to setup graph based on the baseline node idenity
  render_node_link_pos(".graph-layer", focus_info, confg);
  render_node_link_interaction(".graph-layer", focus_info, go_info, confg);
  // update_node_link_interpretation(".graph-layer", graph_data, confg);
}



function render_node_link_interaction(container,
                                      focus_info,
                                      go_info,
                                      confg) {
  let nodes = focus_info.graph;
  let links = focus_info.links;
  // console.log("Graph data for update")
  // console.log(graph_data)
  let svg = d3.select(container);
  svg.select(".nodes")
    .selectAll("circle")
    .on("mouseover", mouseOverFunction)
    .on("mouseout", mouseOutFunction)
    .on("dblclick", append_by_dblclick)
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
    ;
  // TODO: make this tooltip update work with new svg framework
  function tooltip_update(d, tip_text, mode) {
    let tooltip = d3.select(container).select(".node-tip");
    if (mode == "show") {
      // tool tip
      // tooltip.select('.node-tip-text').html(tip_text);
      tooltip.html(tip_text);
      tooltip.style('display', 'inline-block');
      tooltip.style('left',  (d.x + 20) + 'px') // TODO: fix later
             .style('top', (d.y -10) + 'px');
    } else {
      tooltip.style('display', 'none');
    }
  }
  // interaction: node drag
  function dragstarted(d) {
    d.fx = null;
    d.fy = null;
    tooltip_update(d, go_info[d.name].ann, "show");
    // transition effects
    d3.select(this).style('fill', "black");
    // similar to mouse over effects
    let relatives = get_all_relatives(d);
    let node_sel = select_node_update(d, relatives);
    select_link_update(d, relatives);
    // turn off the mouse over
    node_sel
      .on("mouseover", null)
      .on("mouseout", null);
  }
  function dragged(d) {
    d.x = d3.event.x;
    d.y = d3.event.y;
    tooltip_update(d, go_info[d.name].ann, "show");
    ticked(container);
  }
  function dragended(d) {
    // if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = d3.event.x;
    d.fy = d3.event.y;
    default_link_update()
    let node_select = default_node_update()
    node_select
      .on('mouseover', mouseOverFunction)
      .on('mouseout', mouseOutFunction)
      ;
    ticked(container);
  }

  function get_all_relatives(d) {
    let parents = nodes[d.id]["parents"];
    let children = nodes[d.id]["children"];
    let ancestors = find_related_nodes(nodes,[d.id],"parents");
    let descendents = find_related_nodes(nodes,[d.id],"children");
    let relatives = [parents, children, ancestors, descendents];
    return relatives;
  }

  function mouseOverFunction(d) {
    let relatives = get_all_relatives(d);
    tooltip_update(d, go_info[d.name].ann, "show");
    select_node_update(d, relatives);
    select_link_update(d, relatives);
    // d3.select(this).attr('r', confg.graph.node.radius); // circle update
    // update the text in output div
    d3.select("#output_div").select("#go_output")
      .text(d.name + " "+ go_info[d.name].ann)
      ;
    d3.select("#output_div").select("#gene_output")
      .text("("  + go_info[d.name].ngenes + " genes)")
      ;
  };

  function mouseOutFunction(d) {
    tooltip_update(null, null, "hide")
    default_node_update();
    default_link_update();
    // d3.select(this).attr('r', confg.graph.node.radius);
  };

  function default_node_update() {
    let select = svg.select(".nodes").selectAll("circle");
    select.transition("node_mouse_over_out")
      // .attr("r",  d => node_rad_wid_col(d, confg)[0])
      // .style("stroke-width", d => node_rad_wid_col(d, confg)[1])
      // .style("stroke", d => node_rad_wid_col(d, confg)[2])
      .style("fill", d => d.col)
      .style('opacity', 1.0);
    return select;
  }

  function default_link_update() {
    let select = svg.select(".links").selectAll("line")
    select.transition("link_mouse_over_out")
      .style('stroke-opacity', confg.graph.opacity.background_link)
      .style("stroke", confg.colors.link_default)
      ;
    return select;
  }
  function select_node_update(d, relatives) {
    let parents = relatives[0];
    let children = relatives[1];
    let ancestors = relatives[2];
    let descendents = relatives[3];

    let select = svg.select(".nodes").selectAll("circle");

    select.transition("node_mouse_over_out")
      .style("opacity", confg.graph.opacity.hidden)
      .transition("node_mouse_over_out")
      .delay(o => {
        if (parents.includes(o.id) || children.includes(o.id)) {
          return confg.graph.transition.delay.select;
        }
        if (o.id in ancestors || o.id in descendents) {
          return 2 * confg.graph.transition.delay.select;
        }
        return 0;
      })
      // .attr("r", confg.graph.node.radius)
      // .style("stroke-width", 0)
      .style('opacity', o => {
        if (o.id in ancestors || o.id in descendents || o.id == d.id) {
          return 1.0;
        } else {
          return confg.graph.opacity.hidden;
        }
      })
      .style('fill', (o) => {
        if (o.id == d.id) {
          return confg.colors.node_select;
        }
        if (parents.includes(o.id)) {
          return confg.colors.node_select_neighbor;
        }
        if (children.includes(o.id)) {
          return confg.colors.node_select_neighbor;
        }
        if (o.id in ancestors) {
          return confg.colors.node_select_relative;
        }
        if (o.id in descendents) {
          return confg.colors.node_select_relative;
        }
      })
      ;
    return select;
  }
  function select_link_update(d, relatives) {
    let parents = relatives[0];
    let children = relatives[1];
    let ancestors = relatives[2];
    let descendents = relatives[3];
    let select =  svg.select(".links").selectAll("line");
    select.transition("link_mouse_over_out")
      .style("stroke-opacity", confg.graph.opacity.hidden)
      .transition("link_mouse_over_out")
      .delay((o) => {
        if (o.source === d || o.target === d) {
          return confg.graph.transition.delay.select;
        }
        if (o.source.id in descendents && o.target.id in descendents) {
          return 2 * confg.graph.transition.delay.select;
        }
        if (o.source.id in ancestors && o.target.id in ancestors) {
          return 2 * confg.graph.transition.delay.select;
        }
        return 0;
      })
      .style("stroke-opacity", (o) => {
        if (o.source === d || o.target === d) {
          return confg.graph.opacity.background_link;
        }
        if (o.source.id in ancestors && o.target.id in ancestors) {
          return confg.graph.opacity.background_link;
        }
        if (o.source.id in descendents && o.target.id in descendents) {
          return confg.graph.opacity.background_link;
        }
        return confg.graph.opacity.hidden;
      })
      .style("stroke", (o) => {
        if (o.source === d || o.target === d) {
          return confg.colors.node_select_neighbor;
        }
        if (o.source.id in ancestors && o.target.id in ancestors) {
          return confg.colors.node_select_relative;
        }
        if (o.source.id in descendents && o.target.id in descendents) {
          return confg.colors.node_select_relative;
        }
        return confg.colors.link_default;
      })
      ;
    return select;
  }
}

// -----------------------------
// transition specific functions
// -----------------------------
function compute_lev_cnts(id_lev_map, n_levels) {
  let lev_cnts = [];
  for (let i=0; i<n_levels; i++) {
    lev_cnts.push(0);
  }
  for (let id in id_lev_map) {
    lev_cnts[id_lev_map[id]] += 1
  }
  return lev_cnts;
}
function compute_id_lev_map(node_list) {
  let id_lev_map = {};
  for (let i in node_list) {
    let node_id = node_list[i].name;
    let node_lev = node_list[i].lev_y;
    id_lev_map[node_id] = node_lev;
  }
  return id_lev_map;
}

function compute_layer_duration_simple(lay_time, min_time, lay_node_cnt) {
  // every layer must have non_zero time for transition
  // compute the duration of layer transtition based on time per layers
  let layer_duration = [];
  let layer_delay = [];
  let curr_time = min_time;
  // let tot_nodes = lay_node_cnt.reduce(function(acc, val) {return acc+val;});
  let layer_time;
  for (let i in lay_node_cnt) {
    layer_delay.push(curr_time);
    if (lay_node_cnt[i] > 0 ) {
      layer_time = lay_time;
    } else {
      layer_time = 0;
    }
    layer_time += min_time; // add the min time offset
    layer_duration.push(layer_time);
    curr_time += layer_time;
  }
  return {"duration": layer_duration,
          "delay": layer_delay,
          "total_time": curr_time};
}

function compute_layer_duration(full_time,
                                min_time,
                                lay_node_cnt,
                                mode="binary") {
  // every layer must have non_zero time for transition
  let n_layers = lay_node_cnt.length;
  let tot_time = full_time - (n_layers + 1) * min_time;
  let tot_nonempty_layers = 0;
  let tot_nodes = 0;
  for (let i in lay_node_cnt) {
    let curr_n_nodes = lay_node_cnt[i];
    tot_nodes += curr_n_nodes;
    if (curr_n_nodes > 0 ){
      tot_nonempty_layers += 1
    }
  }
  // compute the duration of layer transtition based on node counts
  let layer_duration = [];
  let layer_delay = [];
  let curr_time = min_time;
  // let tot_nodes = lay_node_cnt.reduce(function(acc, val) {return acc+val;});
  let layer_time;
  for (let i in lay_node_cnt) {
    layer_delay.push(curr_time);
    if (mode == "node_prop") {
      layer_time = tot_time * lay_node_cnt[i] / tot_nodes;
    } else if (mode == "binary") {
      if (lay_node_cnt[i] > 0 ) {
        layer_time = tot_time / tot_nonempty_layers;
      } else {
        layer_time = 0;
      }
    } else {
      throw "mode not recognized!"
    }
    layer_time += min_time; // add the min time offset
    layer_duration.push(layer_time);
    curr_time += layer_time;
  }
  return {"duration": layer_duration, "delay": layer_delay};
}
function compute_layer_delay(layer_duration) {
  let layer_delay = [];
  let curr_time = 0;
  for (let i in layer_duration) {
     layer_delay.push(curr_time);
     curr_time += layer_duration[i];
  }
  return layer_delay;
}
function compare_diff_lev_map(use_map, ref_map) {
  // return only elments in use_map that are NOT in ref_map
  let new_map = {};
  for (let key in use_map) {
    if (!(key in ref_map)) {
      new_map[key] = use_map[key];
    }
  }
  return new_map;
}
// -----------------------------
function render_node_link_pos(container,
                              focus_info,
                              confg,
                              animation=true) {
  // data binding: https://stackoverflow.com/questions/24175624/d3-key-function
  // ONLY run when a new focus graph is created (via the Flask interface)
  // Note: d3 enter() exit() is handled here only
  // Note: context switching and view switching does not require new data to be
  // computed via Flask, so the updates should be handled elsewhere

  // this part not only handles two main functions
  // the enter() and exit() of data
  // the update() based on curr_state.Context, curr_state.View and
  // perhaps force simulatoin setup (in the future)
  // gridlines in y axis function

  // force-simulation (disabled now) update
  let nodes = focus_info.graph;
  let links = focus_info.links;
  let simulation = focus_info.meta.simulation;
  simulation.stop();
  simulation.nodes(nodes).on("tick", ticked, container)
  simulation.force("link").links(links);
  // bind the new data with d3 enter(), exit(), etc.
  let node_circles = d3.select(container).select(".nodes").selectAll("circle")
    .data(nodes, d => d.name); // the binded circles are keyed by node name
  let link_lines = d3.select(container).select(".links").selectAll("line")
    .data(links, d => d.name); // the binded lines is keyed by link name
  let node_exit = node_circles.exit();
  // let line_exit = link_lines.exit();
  let line_coords = {"source": {"x": "x1", "y": "y1"},
                     "target": {"x": "x2", "y": "y2"}};
  let link_exit = link_lines.exit();
  let link_exits = {"source": link_exit, "target": link_exit};
  let node_update = node_circles;
  let link_updates = {"source": link_lines, "target": link_lines};
  let node_enter = node_circles.enter().append("circle");
  let link_enter = link_lines.enter().append("line");
  let link_enters = {"source": link_enter, "target": link_enter};
  // let link_source_enter = link_enter;
  // let link_target_enter = link_enter;
  // find out nodes that are entering
  // find out nodes that are being removed

  let node_lev_map = compute_id_lev_map(nodes);
  let n_layers = confg.graph.max_range[confg.curr_state.View].y + 1;

  let trans_confg = confg.full_mirror.transition;
  // let exit_time   = trans_confg.exit_time;
  // let update_time = trans_confg.update_time;
  // let enter_time  = trans_confg.enter_time;
  // let min_time = trans_confg.min_time;
  // let layer_time = layer_time;

  let prev_node_lev_map = trans_confg.prev_node_lev_map;
  let prev_n_layers = trans_confg.prev_nlayers;

  let enter_map = compare_diff_lev_map(node_lev_map, prev_node_lev_map);
  let enter_lev_cnts = compute_lev_cnts(enter_map, n_layers);
  // let enter_t = compute_layer_duration(enter_time, min_time, enter_lev_cnts);
  let enter_t = compute_layer_duration_simple(trans_confg.enter_layer_time,
                                              trans_confg.min_time,
                                              enter_lev_cnts);


  let exit_map = compare_diff_lev_map(prev_node_lev_map, node_lev_map);
  let exit_lev_cnts = compute_lev_cnts(exit_map, prev_n_layers);
  // let exit_t = compute_layer_duration(exit_time, min_time, exit_lev_cnts);
  let exit_t = compute_layer_duration_simple(trans_confg.exit_layer_time,
                                             trans_confg.min_time,
                                             exit_lev_cnts);

  let enter_time = enter_t.total_time;
  let update_time = trans_confg.update_time;
  let exit_time =  exit_t.total_time;
  // debugger;
  // optional animation updates
  if (animation) {
    // d3 named transition can be used for concurrent transitions/animation
    // source:  https://bl.ocks.org/mbostock/24bdd02df2a72866b0ec
    let y_dt = 100;
    let total_update_time = layer_delay(y_dt, n_layers);

    // exit effects
    // -------------
    // link_exit = link_exit.style("stroke", "brown");
    // for (let link_end in link_exits) {
    //   let trans_name = "link_exit_" + link_end;
    //   link_exit = link_exit
    //     .transition(trans_name)
    //     .duration( d => exit_t.duration[exit_map[d[link_end].name]])
    //     .delay( d => exit_t.delay[exit_map[d[link_end].name]])
    // }
    // node_exit = node_exit
    //   .style("fill", "brown")
    //   .style("opacity", 1.0)
    //   .transition("node_exit_1")
    //   .duration( d => exit_t.duration[exit_map[d.name]])
    //   .delay( d => exit_t.delay[exit_map[d.name]])
    //   // .attr("r", 0)
    //   .attr("cx", confg.graph.transition.end_x_pos)
    //   ;
    // link_exit = link_exit
    //   .style("stroke", "brown")
    //   .transition("link_exit")
    //   .duration(trans_confg.min_time)
    //   .attr("stroke-opacity", 0)
    //   ;

    // first turn brown and then exit
    // link_exit = link_exit.style("stroke", "brown");
    // for (let link_end in link_exits) {
    //   let coords = line_coords[link_end];
    //   link_exits[link_exits] = link_exits[link_end]
    //     .transition("link_exits_" + link_end)
    //     .duration( d => exit_t.duration[exit_map[d[link_end].name]])
    //     .delay( d => exit_t.delay[exit_map[d[link_end].name]])
    //     .attr(coords.x, d => confg.graph.transition.end_x_pos )
    //     // .attr(coords.y, d => d[link_end].cy )
    //     // .duration( d => exit_t.duration[exit_map[d[link_end].name]])
    //     // .delay( d => exit_t.delay[exit_map[d[link_end].name]])
    //     // .duration(update_time)
    //     // .delay(exit_time)
    //     .transition("link_exits_" + link_end)
    //     // .delay(trans_confg.min_time)
    //     // .attr(coords.x, d => confg.graph.transition.end_x_pos )
    //     .duration(100)
    //     .attr(coords.x, 0)
    //     ;
    //
    // }

    // -------------------------------
    // SIMPLE EXIT EFFECT
    exit_time = trans_confg.exit_time;
    node_exit = node_exit
      .style("fill", "brown")
       .style("opacity", 1.0)
      .transition("node_exit")
      .duration(exit_time)
      .delay(trans_confg.min_time)
      ;
    link_exit = link_exit
      .style("stroke", "brown")
      .transition("node_exit")
      .duration(exit_time)
      .delay(trans_confg.min_time)
      ;
    // -------------------------------

    // update effects
    // -------------
    node_update = node_update
      .transition("node_update")
      .duration(update_time)
      .delay(exit_time)
      // .duration(y_dt)
      // .delay( d => layer_delay(y_dt, d.lev_y) )
      ;

    for (let link_end in link_updates) {
      let trans_name = "link_update_" + link_end;
      link_updates[link_end] = link_updates[link_end]
        .transition(trans_name)
        // .duration( d => exit_t.duration[exit_map[d[link_end].name]])
        // .delay( d => exit_t.delay[exit_map[d[link_end].name]])
        .duration(update_time)
        .delay(exit_time)
    }

    // enter effects
    // -------------
    node_enter = node_enter
      .attr("opacity", 0)
      .attr("r",  d => node_rad_wid_col(d, confg)[0])
      .style("stroke-width", d => node_rad_wid_col(d, confg)[1])
      .style("stroke", d => node_rad_wid_col(d, confg)[2])
      .style("fill", "green")
      .attr("cx", d => confg.graph.transition.start_x_pos )
      .attr("cy", d => d.cy )
      .transition("node_enter_1")
      .duration( d => enter_t.duration[d.lev_y])
      .delay( d => exit_time + update_time + enter_t.delay[d.lev_y])
      ;

    link_enter = link_enter
      .style("stroke", "green")
      .style("stroke-width","2px")
      ;
    for (let link_end in link_enters) {
      let coords = line_coords[link_end];
      link_enter = link_enter
        .attr(coords.x, d => confg.graph.transition.start_x_pos )
        .attr(coords.y, d => d[link_end].cy )
        ;
    }
    for (let link_end in link_enters) {
      // let coords = line_coords[link_end];
      link_enters[link_end] = link_enters[link_end]
        .transition("link_enter_" + link_end + "_1")
        .duration( d => enter_t.duration[d[link_end].lev_y])
        .delay( d => exit_time + update_time + enter_t.delay[d[link_end].lev_y])
        ;
    }
  }
  // no-transition defaults for exit(), update() and enter()
  node_exit.remove();
  link_exit.remove();
  // link_exit
  //   .transition("link_remove")
  //   .remove();
  // link_exits["source"].remove();
  // link_exit.remove();
  // link_exits["source"].remove();
  node_update = default_node_appearance(node_update, confg);
  node_update
    .attr("cx", d => d.cx )
    .attr("cy", d => d.cy )
    ;
  for (let link_end in link_updates) {
    let coords = line_coords[link_end];
    link_updates[link_end]
      .attr(coords.x, d => d[link_end].cx )
      .attr(coords.y, d => d[link_end].cy )
      ;
  }
  node_enter = default_node_appearance(node_enter, confg);
  node_enter
    .attr("cx", d => d.cx )
    .attr("cy", d => d.cy )
    ;
  for (let link_end in link_enters) {
    let coords = line_coords[link_end];
    link_enters[link_end]
      .attr(coords.x, d => d[link_end].cx )
      .attr(coords.y, d => d[link_end].cy )
      .style("stroke", confg.colors.edge_background)
      .style("stroke-width", confg.graph.link.width)
      .style("stroke-dasharray", d => edge_dash(d))
      .style("stroke-opacity",  confg.graph.opacity.background_link)
      ;
  }
  // link_source_enter
  //   .attr("x1", d => d.source.cx )
  //   .attr("y1", d => d.source.cy )
  //   ;
  // link_target_enter
  //   .attr("x2", d => d.target.cx )
  //   .attr("y2", d => d.target.cy )
  //   .style("stroke", confg.colors.edge_background)
  //   .style("stroke-width","2px")
  //   .style("stroke-dasharray", d => edge_dash(d))
  //   .style("stroke-opacity",  confg.graph.opacity.background_link)
  //   ;
  function layer_delay(delay_t, layer_id) {
    // TODO: handle case for height for reverse layer delay
    return delay_t * layer_id + 1;
  }
  //book keeping
  trans_confg.prev_nlayers = n_layers;// remember how many layers are used
  trans_confg.prev_node_lev_map = node_lev_map;
  // timer delay
  if (tag_update_queue.length > 0) {
    // let curr_list = tag_update_queue.shift();
    // done with processing, remove from queue, look for next recursion
    setTimeout(function() {
      tag_update_queue.shift();
      recursive_request_focus_data();
    }, enter_time + update_time + exit_time + trans_confg.total_buffer_time);
    // request_focus_data(curr_list);
  } else {
    console.log("Queue is empty, no updates needed!");
  };
  // .on("end", function() {
  // })
}

function ticked(container) {
  // links the nodes and edges to change together
  let main_div = d3.select(container);
  main_div.select(".links")
    .selectAll("line")
    // .attr("y1", function(d) { return d.source.y; })
    .attr("x1", function(d) { return d.source.x; })
    // .attr("y2", function(d) { return d.target.y; })
    .attr("x2", function(d) { return d.target.x; });

  main_div.select(".nodes")
    .selectAll("circle")
    // .attr("cy", function(d) { return d.y; })
    .attr("cx", function(d) { return d.x; })
    // .attr("cx", function(d) { return d.x = Math.max(radius, Math.min(width - radius, d.x)); });
}


// TODO: remove
function node_color(node, graph_data, confg) {
  if (confg.curr_state.Context == "full_context") {
    if (node.name in graph_data.precomp.input_test_context.name_id_map) {
      return confg.colors.node_stat;
    } else {
      return confg.colors.node_background;
    }
  } else { // test_context
    let htype = confg.curr_state.Htype;
    let ground_truth = precomp_data.input_test_context.ground_truth_info[htype];
    let name_id_map = precomp_data.input_test_context.name_id_map;
    if (!ground_truth) {
      return confg.colors.test_null;
    }
    if (ground_truth.includes(name_id_map[node.name])) {
      return confg.colors.test_nonnull;
    } else {
      return confg.colors.test_null;
    }
  }
}

function node_rad_wid_col(node, confg) {
  let node_radius = confg.graph.node.radius;
  let border_size =  confg.graph.node.border_size;
  let rad, wid, col;
  if (node.anchor) {
    rad = node_radius + border_size/2;
    wid = border_size;
    col = confg.colors.node_anchor_border;
  } else if (node.prolif){
    rad = node_radius + border_size/4;
    wid = border_size / 2;
    col = confg.colors.node_prolif_border;
  } else {
    rad = node_radius;
    wid = 0;
    col = null;
  }
  return [rad, wid, col];
}

function node_size_border(node, confg) {
  let node_radius = confg.graph.node.radius;
  let border_size =  confg.graph.node.border_size;
  switch(confg.curr_state.Mode) {
    case "total_search":
      // console.log(node.search);
      return [node_radius, 0];
      break;
    default:
      if (node.queried) {
        return [node_radius + border_size/2, border_size];
      } else {
        return [node_radius, 0];
      }
  }
}

function edge_dash(edge) {
  // if (edge[(layer_type + "_cross_layer")]) {
  //   // make lighter if cross layer
  //   return "3,0"
  // } else {
  return "3,0"
  // }
}


