function create_bar_svg(container, main_config) {
  let svg = d3.select(container).append("svg")
    .attr("class", "bar_display")
    .attr("height", "100%")
    .attr("width",  main_config.svg_graph_width)
    ;
  // add the Y gridlines
  svg.append("g").attr("class", "grid-break");
  svg.append("g").attr("class", "grid-layer");
  svg.append("g").attr("class", "xaxis");
  svg.append("g").attr("class", "yaxis");
  svg.append("g").attr("class", "group-bars");
  // let bar_ann = svg..append("g").attr("class", "group-ann");
  svg.append("g").attr("class", "group-text");
  svg.append("g").attr("class", "group-triang");
  svg.append("g").attr("class", "group-triang-text");
  legend_g = svg.append("g").attr("class", "legend-box");
  legend_g.append("g").attr("class", "legend-symb");
  legend_g.append("g").attr("class", "legend-text");
}


function bar_mode_select(graph_data, main_config) {
  // switch(mode) {
  //   case "initial":
  //     return(["bar_total","bar_statistical"]);
  //   case "stat_reject":
  //     return(["bar_total","bar_statistical","bar_reject"]);
  //   case "total_search":
  //     return(["bar_total","bar_queried"]);
  //   default:
  //     console.log("MODE ERROR!");
  // }
  let num_nodes_per_layer = graph_data.curr_lev_nodes.map(x => x.length);
  let num_nodes = num_nodes_per_layer.reduce((a, b) => a + b);
  let view = main_config.curr_state.View;
  let full_level_cnt = graph_data.context_info.meta.level_counts[view];
  let num_other_nodes = full_level_cnt.reduce((a, b) => a + b) - num_nodes;

  switch(main_config.curr_state.Highlight) {
    case "query_data":
      return(["nodes in query data (" + num_nodes + ")",
              "other nodes in the context (" + num_other_nodes + ")"]);
    case "focus_relatives":
      return(["ancestor / descendant terms (" + num_nodes + ")",
              "other terms (" + num_other_nodes + ")"]);
    case "self_nonnull":
      return(["self-contained non-null (" + num_nodes + ")",
              "self-contained null (" + num_other_nodes + ")"]);
    case "comp_nonnull":
      return(["competitive non-null (" + num_nodes + ")",
              "competitive null (" + num_other_nodes + ")"]);
    default:
      return(["", ""]);
  }
}

function get_legend_text(bar_type) {
  switch(bar_type) {
    case "tested_in_full":
      return "Testable hypothesis";
    case "not_tested_in_full":
      return "Non-testable hypothesis";
    case "test_nonnull":
      return "Non-null hypothesis";
    case "test_null":
      return "Null hypothesis";
    case "highlight_nodes":
      return "Highlighted nodes";
    case "other_nodes":
      return "Other nodes";
    default:
      console.log("MODE ERROR!");
  }
}

function prepare_bar_display_data(graph_data, main_config) {
  let view = main_config.curr_state.View;
  let n_levels;
  let grp_cnts, cum_cnts;
  let plot_data = [];
  let plot_meta = {};
  let bar_anns = [main_config.curr_state.Highlight, "none"];
  let full_level_cnt = graph_data.context_info.meta.level_counts[view];
  // let level_nodes = graph_data.curr_lev_nodes;
  // let highlight_cnt = get_higlighted_counts(graph_data, main_config);
  let highlight_cnt = graph_data.curr_lev_nodes.map(x => x.length);

  for (let i = 0; i <  bar_anns.length; i++) {
    grp_cnts = [];
    switch(i) {
      case 0:
        for (let j = 0; j < full_level_cnt.length; j++) {
          grp_cnts.push(highlight_cnt[j])
        }
        break
      case 1:
        for (let j = 0; j < full_level_cnt.length; j++) {
          grp_cnts.push(full_level_cnt[j] - highlight_cnt[j])
        }
        break
      default:
        throw "MODE ERROR!";
    }
    if (i == 0) { // intialize the counts and retrieve the number of layers
      n_levels = grp_cnts.length;
      cum_cnts = new Array(n_levels).fill(0);
    } else {
      if (!(n_levels == grp_cnts.length)) {
        throw "The group layers do not match!";
      }
    }
    // scale problem!
    // console.log(bar_names[i]);
    // console.log(grp_cnts);
    for (let j = 0; j < n_levels; j++ ) {
      if (grp_cnts[j] < 0 ) {
        // console.log(grp_cnts);
        throw "The count value cannot be less than zero!"
      }
      let single_b = {
        "id": (bar_anns[i] + "-" + view + "-" + j),
        "grp_id": i,
        "grp_name": bar_anns[i],
        "level": j,
        "low_val": cum_cnts[j],
        "high_val": cum_cnts[j] + grp_cnts[j],
      };
      cum_cnts[j] += grp_cnts[j];
      plot_data.push(single_b);
    }
  }
  // console.log(plot_data);
  plot_meta.tot_cnts = cum_cnts;
  plot_meta.max_level = n_levels-1;
  plot_meta.max_count = Math.max(...cum_cnts);
  // TODO: add level names in the future
  return { "data": plot_data, "meta": plot_meta };
}

//update bars
function update_context_display(svg_id, bar_data, main_config, fixed_dim=false){
  // let container = main_config.main_div;
  let container = ".bar-layer";
  let width = main_config.svg_graph_width;
  let height = main_config.svg_graph_height;
  let padding = main_config.bar.padding;
  // let curr_cntx = main_config.curr_state.Context;
  let curr_view = main_config.curr_state.View;
  let bar_anns = [main_config.curr_state.Highlight, "none"];
  let bar_names = bar_mode_select(bar_data, main_config);
  let plot_data = prepare_bar_display_data(bar_data, main_config);
  main_config.bar.max_range[curr_view].y = plot_data.meta.max_level;
  main_config.bar.max_range[curr_view].x = plot_data.meta.max_count;

  let leg_config = main_config.bar.legend;
  let bar_legends = d3.select(svg_id).select(container).select(".legend-box");
  let n_layers = main_config.bar.max_range[curr_view].y;
  let xy_scales = bar_scale_setup(main_config, fixed_dim=fixed_dim);
  let x_scale = xy_scales.x;
  let y_scale = xy_scales.y;
  let yAxis = d3.axisLeft()
    .scale(y_scale)
    .ticks(n_layers)
    .tickPadding(main_config.bar.left_tick_padding)
    ;

  let curr_highlight = main_config.curr_state.Highlight;
  let secondary_svg_g = [".group-triang", ".group-triang-text", ".legend-box"];
  // let bar_width_prop = main_config.bar.width_prop;
  let bar_width_prop = main_config.bar.width_wide_prop;
  secondary_svg_g.forEach(function(svg_g){
    d3.select(svg_id)
      .select(container)
      .select(svg_g)
      .attr("visibility", "hidden");
  });
  if (curr_highlight in main_config.context_highlights) {
    d3.select(svg_id)
      .select(container)
      .select(".legend-box")
      .attr("visibility", "visble")
      ;
  }

  // determine drawing of bars and their specifics
  d3.select(svg_id)
    .select(container)
    .select(".yaxis")
    .call(yAxis)
    .attr("transform","translate("+(padding.left)+", 0)")
    // .append("text")
    ;
  let xAxis = d3.axisBottom()
    .scale(x_scale)
    .ticks(main_config.bar.n_y_ticks)
    ;
  let xAxis_pos;
  if (curr_view == "height") {
    xAxis_pos = y_scale( -0.5 );
  } else {
    xAxis_pos = y_scale(plot_data.meta.max_level + 0.5);
  }
  d3.select(svg_id)
    .select(container)
    .select(".xaxis")
    .call(xAxis)
    .attr("transform","translate(0, " + xAxis_pos + ")")
    // .append("text")
    ;
  // console.log(plot_data);
  // console.log("updated bars");
  // data-binding and rendering
  let rec_data = d3.select(svg_id)
    .select(container)
    .select(".group-bars")
    .selectAll("rect")
    .data(plot_data.data, d => d.id)
    ;
  let rec_text = d3.select(svg_id)
    .select(container)
    .select(".group-text")
    .selectAll("text")
    .data(plot_data.data, d => d.id)
    ;
  let tri_data = d3.select(svg_id)
    .select(container)
    .select(".group-triang")
    .selectAll("path")
    .data(plot_data.data, d => d.id)
    ;
  let tri_text = d3.select(svg_id)
    .select(container)
    .select(".group-triang-text")
    .selectAll("text")
    .data(plot_data.data, d => d.id)
    ;
  let leg_symb = bar_legends
    .select(".legend-symb")
    .selectAll("rect")
    .data(bar_names, d => d );

  let leg_text = bar_legends
    .select(".legend-text")
    .selectAll("text")
    .data(bar_names, d => d );

  let group_update_enter = {
    "rec_data": {
      "update": rec_data,
      "enter": rec_data.enter().append("rect"),
    },
    "rec_text": {
      "update": rec_text,
      "enter": rec_text.enter().append("text").attr("class", "ann-text"),
    },
    "tri_data": {
      "update": tri_data,
      "enter": tri_data.enter().append("path").attr("class", "tri_pntr"),
    },
    "tri_text": {
      "update": tri_text,
      "enter": tri_text.enter().append("text").attr("class", "ann-text"),
    },
    "leg_symb": {
      "update": leg_symb,
      "enter": leg_symb.enter().append("rect").attr("class","legend-rect"),
    },
    "leg_text": {
      "update": leg_text,
      "enter": leg_text.enter().append("text").attr("class","legend-text"),
    },
  }
  function get_legend_y_offset(i, n, conf) {
    // confg: legend config: e.g., main_config.bar.legend
    return y_pos = conf.height / n * i + conf.height / (2 * n);
  }
  let tri = d3.symbol().type(d3.symbolTriangle).size(main_config.bar.tri_size*5);
  let tri_off_px = main_config.bar.tri_size/2;
  let bar_off_scale = bar_width_prop/2
  for (let group in group_update_enter) {
    let update_enter = group_update_enter[group];
    update_enter["update"].exit().remove();
    for (let mode in update_enter) {
      // update the legends
      if (group == "leg_symb") {
         update_enter[mode]
          .attr("x", 0)
          .attr("y", function(d, i) {
            let shift = leg_config.marker_size / 2;
            return get_legend_y_offset(i, bar_names.length, leg_config) - shift;
          })
          .attr("width",  leg_config.marker_size)
          .attr("height", leg_config.marker_size)
          .attr("fill", function(d, i) {
            return main_config.colors.highlights[bar_anns[i]];
          })
          .attr("stroke","none")
          ;
      }
      if (group == "leg_text") {
         update_enter[mode]
          .attr("x", leg_config.sym_text_gap + leg_config.marker_size)
          .attr("y", function(d, i) {
            return get_legend_y_offset(i, bar_names.length, leg_config);
          })
          .text(d => d)
          .style("font-size","12px")
          .style("font-family","sans-serif")
          ;
      }
      if (group == "rec_data") {
        update_enter[mode]
          .attr("x", d => x_scale(d.low_val))
          .attr("width", d => x_scale(d.high_val)-x_scale(d.low_val))
          .attr("y", function(d) {
            if (curr_view == "height") {
              return y_scale(d.level + bar_width_prop/2)
            } else {
              return y_scale(d.level - bar_width_prop/2)
            }
          })
          .attr("height", function(d) {
            if (curr_view == "height") {
              return y_scale(0) - y_scale(bar_width_prop)
            } else {
              return y_scale(bar_width_prop)-y_scale(0)
            }
          })
          .attr("fill", d => main_config.colors.highlights[d.grp_name] )
          ;
      }
      if (group == "rec_text") {
        let text_node = update_enter[mode]
          .attr("x", d => (main_config.bar.text_dist + x_scale(d.high_val)))
          .attr("y", d => y_scale(d.level))
          .attr("dy", "0.32em")
          .attr("font-family", "sans-serif")
          .style("display", function(d) { // only show the last bar
            return d.grp_id == (bar_names.length-1) ? "block" : "none";
          })
          ;
        let tspan1, tspan2;
        if (mode == "enter") {
          tspan1 = text_node.append('tspan').attr("class", "btspan_primary");
          tspan2 = text_node.append('tspan').attr("class", "btspan_secondary");
        } else {
          tspan1 = text_node.select(".btspan_primary");
          tspan2 = text_node.select(".btspan_secondary");
        }
        tspan1.text(d => d.high_val)
          ;
        tspan2.style("fill", main_config.colors.highlights[curr_highlight])
          .text(d => {
            let num_nodes = bar_data.curr_lev_nodes[d.level].length;
            if ((curr_highlight in main_config.context_highlights) &
                (num_nodes > 0))
            {
              return " [" + num_nodes + "]";
            } else {
              return "";
            }
          });
      }
      if (group == "tri_data") {
        update_enter[mode]
          .attr('d', tri)
          .attr("fill",  d => main_config.colors.highlights[d.grp_name])
          .attr('transform', function(d) {
            let x_coord, y_coord;
            if (curr_view == "height") {
              x_coord  = x_scale(d.high_val);
              y_coord = y_scale(d.level - bar_off_scale ) + tri_off_px;
            } else {
              x_coord = x_scale(d.high_val);
              y_coord = y_scale(d.level + bar_off_scale ) + tri_off_px;
            }
            return "translate("+ x_coord +","+ y_coord+")";
          })
          .style("display", function(d) { // only show the first bar
            return d.grp_id == 0 ? "block" : "none";
          })
          ;
      }
      if (group == "tri_text") {
        update_enter[mode]
          .attr("fill", d => main_config.colors.highlights[d.grp_name] )
          .attr("x", d => (main_config.bar.text_dist + x_scale(d.high_val)))
          .attr("y", function(d) {
            if (curr_view == "height") {
              return y_scale(d.level - bar_off_scale ) + 1.2 * tri_off_px;
            } else {
              return y_scale(d.level + bar_off_scale ) + 1.2 * tri_off_px;
            }
          })
          .style("display", function(d) { // only show the first bar
            return d.grp_id == 0 ? "block" : "none";
          })
          .text(d=>d.high_val)
          ;
      }
    }
  }

}
