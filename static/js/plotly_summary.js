function get_trace_style(style) {
  let trace = {};
  switch(style) {
  case "All Points":
    trace = {
      type: 'box',
      // name: 'All Points',
      jitter: 0.3,
      pointpos: -1.8,
      marker: {
        color: 'rgb(7,40,89)'
      },
      boxpoints: 'all',
    };
    return trace;
  case "Only Wiskers":
    trace = {
      type: 'box',
      // name: 'Only Wiskers',
      marker: {
        color: 'rgb(9,56,125)'
      },
      boxpoints: false,
    }
    return trace;
  case "Suspected Outlier":
    trace = {
      type: 'box',
      // name: 'Suspected Outlier',
      marker: {
        color: 'rgb(8,81,156)',
        outliercolor: 'rgba(219, 64, 82, 0.6)',
        line: {
          outliercolor: 'rgba(219, 64, 82, 1.0)',
          outlierwidth: 2
        }
      },
      boxpoints: 'suspectedoutliers'
    }
    return trace;
  default:
    trace = {
      type: 'box',
      jitter: 0.5,
      fillcolor: 'cls',
      line: {
        width: 1,
      },
      // name: 'Wiskers and Outliers',
      marker: {
        color: 'rgb(8,81,156)',
        size: 2,
      },
      boxpoints: 'Outliers',
      // boxmean: true,
    };
    return trace;
  }
}

function prepare_boxplot_data(plot_dat, style="Wiskers and Outliers") {
  if (plot_dat.names.length != plot_dat.values.length) {
    throw "data length and names do not match!"
  }
  let all_traces = [];
  for (let i = 0; i < plot_dat.names.length; i++) {
    let trace = get_trace_style(style);
    trace.y = plot_dat.values[i];
    trace.name = "n=" + plot_dat.names[i].toString();
    all_traces.push(trace);
  }
  return all_traces;
}

function plotly_boxplot(config, task="init", in_data={}) {
  let stats = ["empirical_power", "empirical_fdr", "num_rejections"];
  let stat_alias = {
    "empirical_power": "Empirical Power",
    "empirical_fdr": "False Discovery Proportion",
    "num_rejections": "Number of Rejections",
  };
  let common_layout = {
    // title: 'Box Plot Styling Outliers',
    showlegend: false,
    width : config.full_mirror.svg.width / 3,
    height : config.full_mirror.svg.width / 2,
    "margin": {
      l: 30,
      r: 30,
      b: 100,
      t: 100,
      pad: 4
    },
    xaxis: {
      title: 'number of case/control samples',
      titlefont: {
        family: 'Arial',
        size: 14,
        // color: '#7f7f7f'
      }
    },
    titlefont: {
      family: 'Arial',
      size: 16,
    },
  };
  $(".plotly-div").css("width", config.full_mirror.svg.width / 3);
  $(".plotly-div").css("height", config.full_mirror.svg.width / 2);
  stats.forEach(stat => {
    let elmt_id = "boxplot_".concat(stat);
    if (task == "init") {
      let layout = $.extend({}, common_layout);
      layout.title = stat_alias[stat];
      if ((stat == "empirical_power") || (stat == "empirical_fdr")) {
        layout.yaxis =  {"range": [0, 1]};
      }
      Plotly.newPlot(elmt_id, [], layout);
    } else {
      let graph_div = document.getElementById(elmt_id);
      graph_div.data = prepare_boxplot_data(in_data[stat]);
      Plotly.redraw(graph_div);
    }
  });
}

