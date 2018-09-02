function get_ssm_parts(conf) {
  let type = conf.main_plot_type;
  let show_name = conf.show_name;
  let show_context = conf.show_context;
  let graph_only = conf.graph_only;
  let left_part, right_part, all_parts;
  if (show_name) {
    left_part = conf.component_breakdown.graph;
  } else {
    left_part = []
    conf.component_breakdown.graph.forEach(d => {
      if (d.id != "go-name-table") {
        left_part.push(d);
      }
    })
  }
  right_part = conf.component_breakdown[type];
  if (!show_context) {
    right_part = [right_part[0]];
  }
  if (graph_only) {
    all_parts = left_part;
  } else {
    all_parts = left_part.concat(right_part);
  }
  return(all_parts);
}

function initialize_ssm_canvas(svg_id, conf) {

  let main_svg = d3.select(svg_id);
  // create the svg sub-components
  main_svg.append("text")
    .attr("class", "error-message")
    .style("text-anchor", "middle")
    .style("visibility", "visible")
    ;
  // create the svg sub elements
  let all_parts = get_ssm_parts(conf);
  for (let comp_i in all_parts) {
    let sub_svg = main_svg.append("g")
      .attr("id", all_parts[comp_i].id)
      .attr("class", all_parts[comp_i].class)
      .call(initialize_subplots, conf);
  }
  // ----------------------------------------------------------
  // CREATE LEGEND
  // http://bl.ocks.org/nbremer/a43dbd5690ccd5ac4c6cc392415140e7
  // ----------------------------------------------------------
  //Extra scale since the color scale is interpolated
  var width = 100;
  var height = 8;
  var outerRadius = 100;

  var colorScale = d3.scaleLinear()
    .domain(conf.color.heatmap.domain)
    .range(conf.color.heatmap.range)
    .interpolate(d3.interpolateHcl)
    ; //interpolateHsl interpolateHcl interpolateRgb

  var tmpdomain = [0,1];
  var tempScale = d3.scaleLinear()
    .domain(tmpdomain)
    .range([0,width])
    ;

  //Calculate the variables for the temp gradient
  var numStops = 10;
  tempRange = tempScale.domain();
  tempRange[2] = tempRange[1] - tempRange[0];
  tempPoint = [];
  for(var i = 0; i < numStops; i++) {
    tempPoint.push(i * tempRange[2]/(numStops-1) + tempRange[0]);
  }
  //Create the gradient
  main_svg.append("defs")
    .append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%")
    .selectAll("stop")
    .data(d3.range(numStops))
    .enter().append("stop")
    .attr("offset", function(d,i) { return tempScale( tempPoint[i] )/width; })
    .attr("stop-color", function(d,i) { return colorScale( tempPoint[i] ); });

  let legendWidth = 120;

  //Color Legend container
  let legendsvg = main_svg.append("g")
    .attr("class", "legendWrapper")
    .attr("transform", "translate(0, 0)")
    .style("visibility", "hidden")
    ;

  let stretch = 1;
  //Draw the Rectangle
  legendsvg.append("rect")
    .attr("class", "legendRect")
    .attr("x", 0)
    .attr("y", 0)
    // .attr("rx", 8/2)
    .attr("width", legendWidth + stretch)
    .attr("height", 8)
    .style("fill", "url(#legend-gradient)")
    // .attr("stroke", "darkgrey")
    ;

  // Append title
  legendsvg.append("text")
    .attr("class", "legendTitle")
    .attr("x", -70)
    .attr("y", 12)
    .style("text-anchor", "middle")
    .text("rejection frequency");

  //Set scale for x-axis
  var xScale = d3.scaleLinear()
     .range([0, legendWidth])
     .domain(tmpdomain);

  //Define x-axis
  var xAxis = d3.axisBottom()
      .ticks(5)
      .tickFormat(function(d) { return d; })
      .scale(xScale);

  //Set up X axis
  legendsvg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + (8) + ")")
    .call(xAxis);
  legendsvg.select(".domain").remove();

}

function initialize_subplots(grp, conf) {
  let class_n = grp.attr("class");
  // all groups have a background layer
  grp.append("g").attr("class", "plot-background");
  if (class_n == "manhattan-plot") {
    let padding = conf.manhattan_plot.padding;
    grp.append("g").attr("class", "xaxis");
    grp.append("g").attr("class", "yaxis");
    grp.append("g").attr("class", "data-scatter");
    grp.append("g")
      .attr("class", "plot-border")
      .append("rect")
      ;
  }
  if (class_n == "heatmap-plot") {
    let padding = conf.manhattan_plot.padding;
    grp.append("g").attr("class", "xaxis");
    grp.append("g").attr("class", "yaxis");
    grp.append("g").attr("class", "heatmap-grid");
    grp.append("g")
      .attr("class", "plot-border")
      .append("rect")
      ;
    grp.append("text")
      .attr("class", "ylabel")
      .style("text-anchor", "middle")
      .text("number of case/control samples")
      ;
  }
  if (class_n == "arc-plot") {
    grp.append("g").attr("class", "arc-links");
    grp.append("g").attr("class", "nodes");
  }
  if (class_n == "text-bridge-plot" | class_n == "text-long-bridge-plot") {
    grp.append("g").attr("class", "node-text")
  }
}

function prepare_group_data(ordering) {
  let cum_sum = 0;
  let group_data = [];
  for (let i = 0; i < ordering.length; i++) {
    let start, end;
    start = cum_sum - 0.5;
    cum_sum += ordering[i].length;
    end = cum_sum - 0.5;
    group_data.push({
      "id" : i,
      "start": start,
      "end": end,
    })
  }
  return group_data;
}

function prepare_group_info(ordering, mode="heavy") {
  let in_data = {};
  if (mode == "light") {
      in_data.group = []
      ordering.forEach( (d, i) => {
        let start, end, id;
        if (i == 0) {
          start = d - 0.5
          end = d + 0.5
        } else {
          start = ordering[i - 1] + 0.5
          end = d + 0.5
        }
        in_data.group.push({"id": i, "start": start, "end": end});
      });
      in_data.node_domain = [ordering[0]- 0.5,
                             ordering[ordering.length-1]+ 0.5];
  } else {
    let group_data = prepare_group_data(ordering);
    let node_domain = parse_node_domain_from_group(group_data);
    in_data.group = group_data;
    in_data.node_domain = node_domain;
  }

  return in_data;
}


function prepare_matrix_data(in_data, ordering, values, mode="heavy") {
  if (mode == "light") {
    for (let attr in values) {
      in_data[attr] = values[attr];
    }
  } else {
    // 1. handle the specific node information for layout
    let node_cids = {};
    let node_data = [];
    let rank = 0;
    // prepare nodes
    for (let i = 0; i < ordering.length; i++ ) {
      for (let j = 0; j < ordering[i].length; j++) {
        node_cids[ordering[i][j]] = rank;
        node_data.push({
          "cid": ordering[i][j], // node identifier in the context
          "rank": rank,
          "group": i,
          "gid" : j,
        });
        rank += 1;
      }
    }
    in_data.node = node_data;

    // 2. update the matrix information
    for (let attr in values) {
      if (attr == "col_ann") { // use the same column annotation
        in_data[attr] = values[attr];
      }
      if (attr == "row_ann") { // use row annotation for correct selection
        let row_ann = values[attr];
        let out_ann = [];
        for (let i in row_ann) {
          if (i in node_cids) {
            out_ann.push(row_ann[i]);
          }
        }
        in_data[attr] = out_ann;
      }
      if (attr == "data") { // use data entries with the correct indices
        let mat_dat = values[attr];
        let out_dat = [];
        mat_dat.forEach(entry => {
          if (entry.row_id in node_cids) {
            let new_entry = {
              "row_id": node_cids[entry.row_id],
              "col_id":  entry.col_id,
              "value": entry.value,
            };
            out_dat.push(new_entry);
          }
        })
        in_data[attr] = out_dat;
      }
    }
  }

  return in_data;
}

function prepare_vector_data(in_data, ordering, values, mode="heavy") {
  if (mode == "light") {
    in_data.max_val = Math.max(...values);
    in_data.all_values = values;
  } else {
    let node_data = []
    let rank = 0;
    let max_val = 0;
    for (let i = 0; i < ordering.length; i++ ) {
      for (let j = 0; j < ordering[i].length; j++) {
        let val = values[ordering[i][j]];
        max_val = val > max_val ? val : max_val;
        node_data.push({
          "cid": ordering[i][j], // node identifier in the context
          "rank": rank,
          "group": i,
          "gid" : j,
          "value": val,
        });
        rank += 1;
      }
    }
    in_data.node = node_data;
    in_data.max_val = max_val;
  }

  return in_data;
}

function get_svg_dim(ssm_conf, name) {
  // let style = ssm_conf.class_style[name];
  // let svg_dim = {};
  // for (let att in ssm_conf.total) {
  //   svg_dim[att] = ssm_conf.total[att] * parseFloat(style[att]) / 100;
  // }
  let svg_dim = ssm_conf.plot_type_dim[name];
  let data_dim = ssm_conf.data_dim;
  let shared_padding = ssm_conf.shared_padding;
  if (!(data_dim == null)) {
    svg_dim.height = ssm_conf.row_height * data_dim.y +
                     shared_padding.top + shared_padding.bottom;
    if (name == "arc-plot") {
      svg_dim.width = ssm_conf.row_height * data_dim.y / 2;
    }
    if (name == "heatmap-plot"){
      let mm_padding = ssm_conf.manhattan_plot.padding;
      svg_dim.width = ssm_conf.row_height * data_dim.x +
                      mm_padding.left + mm_padding.right;
    }
  }
  return svg_dim;
}

function get_group_color(group_id, type, conf) {
  if (group_id % 2 == 0) {
    return conf.color[type].even;
  } else {
    return conf.color[type].odd;
  }
}
function data_sel_states(d3_data_sel, element) {
  return {
    "exit" : d3_data_sel.exit(),
    "enter" : d3_data_sel.enter().append(element),
    "update" : d3_data_sel,
  };
}


function draw_background_border(d3_sel,
                                container,
                                conf,
                                scales,
                                svg_dim,
                                dat_len,
                                col_anns=[]) {
  // let d3_sel = d3.select(".ssm-svg").select(container);
  let padding = conf.manhattan_plot.padding
  let xAxis;
  if (container == "#focus-graph-heatmap" |
      container == "#context-graph-heatmap") {
      xAxis = d3.axisBottom()
        .scale(scales.x)
        .ticks(col_anns.length)
        .tickFormat(d => col_anns[d])
        ;
  } else {
      xAxis = d3.axisBottom()
        .scale(scales.x)
        .ticks(conf.n_value_tick)
        ;
  }
  d3_sel.select(".xaxis").call(xAxis);
  let border_width, border_height, border_left, border_right;
  border_height = svg_dim.height - padding.top - padding.bottom;
  border_right = padding.top;

  if (container != "#context-graph-plot" & container != "#context-graph-heatmap") {
    let yAxis = d3.axisLeft()
    .scale(scales.y)
    .ticks(dat_len)
    .tickFormat("")
    ;
    d3_sel.select(".yaxis").call(yAxis);
    if (container == "#focus-graph-heatmap" ) {
      border_width = svg_dim.width -padding.left-padding.right;
    } else {
      border_width = svg_dim.width -padding.right;
    }
    border_left = padding.left;
  } else {
    border_width = svg_dim.width-padding.left-padding.right;
    border_left = 0;
  }
  d3_sel.select(".plot-border")
      .select("rect")
      .attr("x", border_left)
      .attr("y", border_right)
      .attr("width", border_width) // TODO: FIX number
      .attr("height", border_height)
      .attr("stroke", "darkgrey")
      .attr("fill", 'none')
    ;
  if (container == "#focus-graph-heatmap" |
      container == "#context-graph-heatmap"){
    d3_sel.selectAll(".domain").remove();
  }
}



function draw_heatmap(d3_sel, container, in_data, conf) {
  // let d3_sel = d3.select(".ssm-svg").select(container);

  // background data setup
  let group_data = in_data.group;
  let grpdat = d3_sel
    .select(".plot-background")
    .selectAll("rect")
    .data(group_data)  // indexed by order of in list
    ;

  let node_data = in_data.all_values;
  // let pntdat = d3_sel
  //     .select(".data-scatter")
  //     .selectAll("circle")
  //     .data(node_data)
  //     ;
  let griddat = d3_sel
    .select(".heatmap-grid")
    .selectAll("rect")
    .data(in_data.data)
    ;

  // axes setup
  let scales = in_data.manhattan_scales;
  let svg_dim = get_svg_dim(conf, "heatmap-plot");
  draw_background_border(d3_sel, container, conf, scales, svg_dim,
                         in_data.row_ann.length,
                         col_ann=in_data.col_ann);

  // Rendering
  let data_sel = {
    // "points" : data_sel_states(pntdat, "circle"),
    "blocks" : data_sel_states(grpdat, "rect"),
    "grids": data_sel_states(griddat, "rect"),
  };
  let grid_dist = 10;
  // let grid_width = scales.x(1) - grid_dist;
  // let grid_height = scales.y(1) - grid_dist;
  // TODO: clean up
  var colorScale = d3.scaleLinear()
    .domain(conf.color.heatmap.domain)
    .range(conf.color.heatmap.range)
    .interpolate(d3.interpolateHcl)
    ; //interpolateHsl interpolateHcl interpolateRgb

  let grid_width = 0.48;
  let grid_height = 0.48;
  for (let data_t in data_sel) {
    for (let state in data_sel[data_t]) {
      if (state == "exit") {
        data_sel[data_t][state].remove();
      } else {
        if (data_t == "grids") {
          data_sel[data_t][state]
            .attr("x", d => scales.x(d.col_id - grid_width))
            .attr("y", d => scales.y(d.row_id - grid_height))
            .attr("width", d => scales.x(d.col_id+grid_width)-scales.x(d.col_id-grid_width))
            .attr("height", d => scales.y(d.row_id + grid_height)-scales.y(d.row_id - grid_height))
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("fill", d => colorScale(d.value))
            ;
        }
        if (data_t == "blocks") {
          data_sel[data_t][state]
            .attr("x", 0)
            .attr("y", d => scales.y(d.start))
            .attr("width", svg_dim.width)
            .attr("height", d => (scales.y(d.end) - scales.y(d.start)))
            .attr("fill", d => get_group_color(d.id, "background", conf) )
            // .attr("opacity", 0.6)
            ;
        }
      }
    }
  }
}

function draw_manhattan(d3_sel, container, in_data, conf, mode="heavy") {
  // let d3_sel = d3.select(".ssm-svg").select(container);

  // background data setup
  let group_data = in_data.group;
  let grpdat = d3_sel
    .select(".plot-background")
    .selectAll("rect")
    .data(group_data)  // indexed by order of in list
    ;

  // foreground data setup
  let pntdat = d3_sel
      .select(".data-scatter")
      .selectAll("circle")
      ;
  let node_data;
  if (mode == "heavy") {
    node_data = in_data.node;
    pntdat = pntdat.data(node_data, d => d.id );
  } else {
    node_data = in_data.all_values;
    pntdat = pntdat.data(node_data);
  }

  // axes setup
  let scales = in_data.manhattan_scales;
  let svg_dim = get_svg_dim(conf, "manhattan-plot");
  let dat_len = node_data.length;
  draw_background_border(d3_sel, container, conf, scales, svg_dim, dat_len);

  // Rendering
  let data_sel = {
    "points" : data_sel_states(pntdat, "circle"),
    "blocks" : data_sel_states(grpdat, "rect"),
  };
  for (let data_t in data_sel) {
    for (let state in data_sel[data_t]) {
      if (state == "exit") {
        data_sel[data_t][state].remove();
      } else {
        if (data_t == "points") {
          data_sel[data_t][state]
              .attr("r", conf.manhattan_plot.scatter.radius)
              .attr("fill", d => get_group_color(d.group, "points", conf) )
              ;
          if (mode == "heavy") {
          data_sel[data_t][state]
              .attr("cx", d => scales.x(d.value) )
              .attr("cy", d => scales.y(d.rank) )
              ;
          } else {
          data_sel[data_t][state]
              .attr("cx", d => scales.x(d) )
              .attr("cy", (d, i) => scales.y(i) )
              ;
          }
        }
        if (data_t == "blocks") {
          data_sel[data_t][state]
            .attr("x", 0)
            .attr("y", d => scales.y(d.start))
            .attr("width", svg_dim.width)
            .attr("height", d => (scales.y(d.end) - scales.y(d.start)))
            .attr("fill", d => get_group_color(d.id, "background", conf) )
            .attr("opacity", 0.6)
            ;
        }
      }
    }
  }
}

function match_group_data(grp1, grp2) {
  // pair the polygon data
  if (grp1.length != grp2.length) {
    throw "The group sizes should be the same to match";
  }
  let n_grps = grp1.length;
  let out_grp = [];
  for (let i = 0; i < n_grps; i++ ) {
    out_grp.push({
      "id" : i,
      "starts": [grp1[i].start, grp2[i].start],
      "ends": [grp1[i].end, grp2[i].end],
    })
  }
  return out_grp;
}

function parse_node_domain_from_group(data_g) {
  let n_groups = data_g.length;
  if (n_groups > 0) {
    return [data_g[0].start, data_g[n_groups-1].end];
  } else {
    console.log(data_g);
    throw "Number of groups must be positive"
  }
}

function draw_bridge(d3_sel, c_data, f_data, conf) {
  // let d3_sel = d3.select(".ssm-svg").select(container);
  let f_data_g = f_data.group;
  let c_data_g = c_data.group;
  let f_scale = f_data.manhattan_scales;
  let c_scale = c_data.manhattan_scales;
  let svg_dim = get_svg_dim(conf, "zoom-bridge-plot");
  let b_data = match_group_data(f_data_g, c_data_g);
  let grpdat = d3_sel
      .select(".plot-background")
      .selectAll("rect")
      .data(b_data);
  let b_data_sel =  data_sel_states(grpdat, "polygon");
  for (let state in b_data_sel) {
    if (state == "exit") {
      b_data_sel[state].remove();
    } else {
      b_data_sel[state]
        .attr("points", function(d) {
          let coords = [
            [0, f_scale.y(d.starts[0])],
            [0, f_scale.y(d.ends[0])],
            [svg_dim.width, c_scale.y(d.ends[1])],
            [svg_dim.width, c_scale.y(d.starts[1])]
          ];
          return coords.join(" ")
        })
        .attr("fill", d => get_group_color(d.id, "background", conf) )
        ;
    }
  }
}
function get_rev_cid_map(node_list) {
  let map = {}; // map from context id to the focus nodes
  for (let i = 0; i < node_list.length; i++ ) {
    map[node_list[i].cid] = node_list[i];
  }
  return map;
}
function draw_textaxis(d3_sel, f_data, f_nodes, conf, name_type) {
  // let d3_sel = d3.select(".ssm-svg").select(container);
  // need to reorder the focus nodes according to the
  // the ordering in the grouped and organized f_data
  let fn_map = get_rev_cid_map(f_nodes);
  let class_n;
  if (name_type == "full_name") {
    class_n =  "text-long-bridge-plot";
  } else {
    class_n =  "text-bridge-plot";
  }
  let svg_dim = get_svg_dim(conf, class_n);
  let scales = f_data.manhattan_scales;
  let grpdat = d3_sel
    .select(".plot-background")
    .selectAll("rect")
    .data(f_data.group)
    ;
  let pntdat = d3_sel
    .select(".node-text")
    .selectAll("text")
    .data(f_data.node, d => d.cid )
    ;

  let data_sel = {
    "text" : data_sel_states(pntdat, "text"),
    "rect" : data_sel_states(grpdat, "rect"),
  };
  for (let data_t in data_sel) {
    for (let state in data_sel[data_t]) {
      if (state == "exit") {
        data_sel[data_t][state].remove();
      } else {
        if (data_t == "text") {
          data_sel[data_t][state]
            .attr("x", 0)
            .attr("y", d => scales.y(d.rank))
            .text(d => {
              if (name_type == "full_name") {
                let name = fn_map[d.cid][name_type];
                if (name.length > conf.max_name_len) {
                  name = name.slice(0, conf.max_name_len);
                  name += "...";
                }
                return name;
              } else {
                return fn_map[d.cid][name_type];
              }
            })
            .style("font-family", "Arial")
            .style("font-size","13px")
            // .style("alignment-baseline", "central")
            .attr("dy", "0.32em")
            .style("display", "block")
            .style("perspective-origin","0px 0px")
            .style("transform-origin", "0px 0px")
            ;
        }
        if (data_t == "rect") {
          data_sel[data_t][state]
            .attr("x", 0)
            .attr("y", d => scales.y(d.start))
            .attr("width", svg_dim.width)
            .attr("height", d => (scales.y(d.end) - scales.y(d.start)))
            .attr("fill", d => get_group_color(d.id, "background", conf) )
            ;
        }
      }
    }
  }
}

function draw_arcgraph(d3_sel, f_data, f_nodes, conf) {
  // let d3_sel = d3.select(".ssm-svg").select(container);
  let fn_map = get_rev_cid_map(f_nodes); // unranked by has children info
  let dat_map = get_rev_cid_map(f_data.node); // ranked
  let scales = f_data.manhattan_scales;
  let svg_dim = get_svg_dim(conf, "arc-plot");
  // prepare the arc_scale
  // reverse map from cid to f_data
  let links = [];
  for (let i = 0; i < f_data.node.length; i++ ) {
    let cid = f_data.node[i].cid;
    let children_ids = fn_map[cid].children;
    for (let j = 0; j < children_ids.length; j++) {
      child_cid = f_nodes[children_ids[j]].cid;
      links.push({
        "id": cid + "->" + child_cid,
        "source": dat_map[cid], // parent
        "target": dat_map[child_cid], // child
      });
    }
  }
  f_data.node.forEach(function (n) {
    n.x = svg_dim.width - conf.arc_graph.padding.right;
    n.y = scales.y(n.rank);
  })

  let grpdat = d3_sel
    .select(".plot-background")
    .selectAll("rect")
    .data(f_data.group)
    ;
  let lindat = d3_sel
    .select(".arc-links")
    .selectAll("path")
    .data(links, d => d.id)
    ;
  let noddat = d3_sel
    .select(".nodes")
    .selectAll("circle")
    .data(f_data.node, d => d.cid)
    ;
  let data_sel = {
    "arc":  data_sel_states(lindat, "path"),
    "rect" : data_sel_states(grpdat, "rect"),
    "circle": data_sel_states(noddat, "circle"),
  };
  for (let data_t in data_sel) {
    for (let state in data_sel[data_t]) {
      if (state == "exit") {
        data_sel[data_t][state].remove();
      } else {
        if (data_t == "rect") {
          data_sel[data_t][state]
            .attr("x", svg_dim.width - 18)
            .attr("y", d => scales.y(d.start))
            .attr("width", 20) // cover the nodes only
            .attr("height", d => (scales.y(d.end) - scales.y(d.start)))
            .attr("fill", d => get_group_color(d.id, "background", conf) )
            ;
        }
        if (data_t == "circle") {
          data_sel[data_t][state]
            .attr("r", conf.arc_graph.node_size)
            .attr("cx", d => d.x )
            .attr("cy", d => d.y )
            .attr("fill", d => get_group_color(d.group, "points", conf) )
            ;
        }
        if (data_t == "arc") {
          data_sel[data_t][state]
            .attr("d",  function (d) {
              return ['M', d.source.x, d.source.y, 'A',
                (d.target.y - d.source.y)/2, ',', (d.target.y - d.source.y)/2,
                0, 0, ',', 0,
                d.target.x, ',', d.target.y]
                .join(' ');
            })
            .style('stroke-width', "2px")
            .style("fill", "none")
            .style("stroke", conf.color.arc)
            .style("opacity", 0.6)
            ;
        }
      }
    }
  }
  d3_sel.select(".nodes")
    .selectAll("circle")
    .on("mouseover", mouseOverFunction)
    .on("mouseout", mouseOutFunction)
    ;
  function mouseOverFunction(d) {
    let fid = fn_map[d.cid].id;
    // find_related_nodes is defined in graph_utils.js
    let ancestors = find_related_nodes(f_nodes,[fid],"parents");
    let descendents = find_related_nodes(f_nodes,[fid],"children");
    let parents = f_nodes[fid]["parents"];
    let children = f_nodes[fid]["children"];
    d3_sel.select(".nodes")
      .selectAll("circle")
      .transition("node_mouse_over_out")
      .style('fill', (o) => {
        let oid = fn_map[o.cid].id;
        let did = fn_map[d.cid].id;
        if (oid == did) {
          return conf.color.node_select;
        }
        if (parents.includes(oid)) {
          return conf.color.node_select_neighbor;
        }
        if (children.includes(oid)) {
          return conf.color.node_select_neighbor;
        }
        if (oid in ancestors) {
          return conf.color.node_select_relative;
        }
        if (oid in descendents) {
          return conf.color.node_select_relative;
        }
      });
      ;
    d3_sel.select(".arc-links")
        .selectAll("path")
        .transition("link_mouse_over_out")
        .style("stroke", (o) => {
          let s_oid = fn_map[o.source.cid].id;
          let t_oid = fn_map[o.target.cid].id;
          if (s_oid === fid || t_oid === fid) {
            return conf.color.node_select_neighbor;
          }
          if (s_oid in ancestors && t_oid in ancestors) {
            return conf.color.node_select_relative;
          }
          if (s_oid in descendents && t_oid in descendents) {
            return conf.color.node_select_relative;
          }
          return conf.color.arc;
        })
        .style('stroke-opacity', (o) => {
          let s_oid = fn_map[o.source.cid].id;
          let t_oid = fn_map[o.target.cid].id;
          if (s_oid === fid || t_oid === fid) {
            return conf.opacity.highlight;
          }
          if (s_oid in ancestors && t_oid in ancestors) {
            return conf.opacity.highlight;
          }
          if (s_oid in descendents && t_oid in descendents) {
            return conf.opacity.highlight;
          }
          return conf.opacity.hidden;
        })
        ;

  };

  function mouseOutFunction() {
    d3_sel.select(".nodes")
      .selectAll("circle")
      .style("fill", "black")
      .style('opacity', 1.0);

    d3_sel.select(".arc-links")
      .selectAll("path")
      .style('stroke-opacity', conf.opacity.highlight)
      .style("stroke",  conf.color.arc)
      ;
  };
}

function add_scale_attribute(in_data, conf, plot_id) {
  let out_data = in_data;
  let node_domain = in_data.node_domain;
  let padding = conf.manhattan_plot.padding;

  let svg_dim, val_domain;
  if (plot_id == "#focus-graph-heatmap" | plot_id == "#context-graph-heatmap" ){
    svg_dim = get_svg_dim(conf, "heatmap-plot");
    val_domain = [-0.5, in_data.col_ann.length-0.5];

  } else {
    svg_dim = get_svg_dim(conf, "manhattan-plot");
    val_domain = [0,  in_data.max_val * (1 + conf.max_val_margin)];
  }
  let x_range = [padding.left,  svg_dim.width - padding.right];
  if (plot_id == "#context-graph-plot" | plot_id == "#context-graph-heatmap") {
    x_range = [0,  svg_dim.width - padding.right-padding.left];
  }
  let y_range = [padding.top, svg_dim.height - padding.bottom];
  let scale = {
    "x": d3.scaleLinear().domain(val_domain).range(x_range),
    "y": d3.scaleLinear().domain(node_domain).range(y_range),
  }
  out_data["manhattan_scales"] = scale;
  return out_data;
}

function update_ssm_plot(svg_id,
                        node_values,
                        focus_nodes,
                        f_group_ordering,
                        c_group_ordering, // TODO: replace with index breaks
                        conf,
                        mode) {
  // requirements:
  // 1. all children should have a larger index than its parent
  // 2. there is no edge crossing within each group


  let data_dim =  {"x": 8, "y": focus_nodes.length};
  if (conf.main_plot_type == "matrix") {
   data_dim.x = node_values.col_ann.length;
  }
  conf.data_dim = data_dim; // this is used in get_svg_dim()
  // ------------------------
  // svg dimension setup
  // ------------------------
  let main_svg = d3.select(svg_id);
  // do not display graph if it is too large
  if (focus_nodes.length > conf.max_node_display) {
    let message_w = 400;
    let message_h = 20;
    main_svg.select(".error-message")
      .text("Error: failed to display binder plots due to too many focus nodes.")
      .attr("x", message_w/2)
      .attr("y", message_h/2)
      .style("visibility", "visibility")
      ;
    main_svg.attr("width", message_w).attr("height", message_h);
    return
  }

  let all_parts = get_ssm_parts(conf);
  let width_offset = 0;
  let grp_dim;
  for (let comp_i in all_parts) {
    grp_dim = get_svg_dim(conf, all_parts[comp_i].class);
    let sub_svg = main_svg.select("#"+all_parts[comp_i].id)
      .attr("transform", "translate(" + width_offset +", 0)");
    if (all_parts[comp_i].class == "heatmap-plot") {
      let padding = conf.manhattan_plot.padding;
      let xAxis_pos = padding.left;
      let yAxis_pos = grp_dim.height - padding.bottom;
      main_svg.select(".heatmap-plot").select(".xaxis")
        .attr("transform","translate(0, " + yAxis_pos + ")");
      main_svg.select(".heatmap-plot").select(".yaxis")
        .attr("transform","translate(" + xAxis_pos + ", 0)");
      main_svg.select(".heatmap-plot").select(".ylabel")
        .attr("x", grp_dim.width / 2)
        .attr("y", yAxis_pos + 35)
        ;
      let legend_x = width_offset - 130;
      let legend_y = grp_dim.height - 25;
      main_svg.select(".legendWrapper")
        .style("visibility", "visible")
        .attr("transform", "translate("+ legend_x +", "+ legend_y +")");
    }
    width_offset += grp_dim.width;
  }
  main_svg.attr("width", width_offset)
          .attr("height", grp_dim.height) // this is shared, so we're fine
          ;
  // ------------------------
  // data preparation
  // ------------------------
  let f_data = prepare_group_info(f_group_ordering);
  if (conf.main_plot_type == "matrix") {
    f_data = prepare_matrix_data(f_data, f_group_ordering, node_values);
    f_data = add_scale_attribute(f_data, conf, "#focus-graph-heatmap");
  }
  if (conf.main_plot_type == "vector") {
    f_data = prepare_vector_data(f_data, f_group_ordering, node_values);
    f_data = add_scale_attribute(f_data, conf, "#focus-graph-plot");
  }
  // console.log(f_data);

  // draw text bridge and the arc plot
  draw_textaxis(main_svg.select("#go-id-table"), f_data, focus_nodes, conf, "name");
  draw_textaxis(main_svg.select("#go-name-table"), f_data, focus_nodes, conf, "full_name");
  draw_arcgraph(main_svg.select("#arc-graph-plot"), f_data, focus_nodes, conf);

  if (conf.graph_only) { return; }
  // otherwise, start drawing the focus vector or matrix data
  if (conf.main_plot_type == "matrix") { // draw heatmap
    let container = "#focus-graph-heatmap";
    draw_heatmap(main_svg.select(container), container, f_data, conf);
  }
  if (conf.main_plot_type == "vector") {  // draw manhattan plots
    let container = "#focus-graph-plot";
    draw_manhattan(main_svg.select(container), container, f_data, conf, "heavy");
  }

  if (!conf.show_context) { return; }
  // otherwise, start drawing the context vector or matrix data
  let c_data = prepare_group_info(c_group_ordering, mode);
  if (conf.main_plot_type == "matrix") {
    let container = "#context-graph-heatmap";
    c_data = prepare_matrix_data(c_data, c_group_ordering, node_values);
    c_data = add_scale_attribute(c_data, conf, container);
    draw_heatmap(main_svg.select(container), container, c_data, conf);
  }
  if (conf.main_plot_type == "vector") {
    let container = "context-graph-plot"
    c_data = prepare_vector_data(c_data, c_group_ordering, node_values, mode);
    c_data = add_scale_attribute(c_data, conf, container);
    draw_manhattan(main_svg.select(container), container, c_data, conf, mode);
  }
  draw_bridge(main_svg.select("#multi-polygons"), c_data, f_data, conf);


}
