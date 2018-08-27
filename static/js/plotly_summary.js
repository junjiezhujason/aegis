
//global plotly_configuration
let plotly_config = {
"plot_names" : {
  "FDR" : "False Discovery Proportion",
  "Power" : "Power",
  "Number_of_rejections" : "Number of Rejections",
  "Number_of_hypothesis" : "n_total"
},

"layout" :  {
  "width": 800,
  "height": 450,
  "margin": {
    l: 50,
    r: 10,
    b: 50,
    t: 50,
    pad: 4
  },
  "barmode": 'group',
  "showlegend" : true,
  "yaxis" : {
      "hoverformat" : '.2f'
    },
    "line" : {
    'opacity': 0.3,
    'type': 'line',
    'line': {
      "dash" : "dot",
      'color': 'grey'
    }
  },
  "legend" : {
    "orientation" : "h",
    "x" : 0 ,
    "y" : 1.05,
  }
},

"step" : {
  "mode": 'immediate',
  "frame": {"redraw": false, "duration": 500},
  "transition": {"duration": 500}
},

//hoverformat
"hover_format" : {
  "bgcolor" : 'blue',
  "font": {
    "color": 'white'
  }
},

//line
  "sig_level" : 0.05,
  //bar color
  "color":['#4286f4','#0abab5'],
  //fully transparent version of previous colors
  "color_rgb" : ["rgba(66,134,244,0.1)","rgba(10, 186, 181,0.1)"],
  //padding between subplots
  "padding" : 0.06,
  "bar_padding" : 0.05,
  //length of error arrow
  "arrow_length_f" : 0.4,
  //error line color
  "error_col" : "#000000",
  //length of error bar
  "n_error" : 1,
  //how much higher maximum value is
  "max_val" : 0.2,
  //if smaller change to for animation
  "min_val" : 0.01,
  // subplot title position
  "subplot_title_y": 1.05,
  //initial value
  "init_val" : 2,
  //horizontal or vertical plot
  "plot_orient" : "horizontal",
};

//make up some data
let meta_data = {
    "signal_regimes": ["signal1", "signal2", "signal3","signal4", "signal5", "signal6"]
};
let signal_regimes = meta_data.signal_regimes;
let metric_names = ["FDR", "Power", "Number_of_rejections", "Number_of_hypothesis"];
//metric names that we plot out
let metric_names_plot = ["FDR", "Power", "Number_of_rejections"];

// let method_names = ["Bonf", "BH"];
let method_names = ["BH"];


let bar_names_big = ["layer1", "layer2", "layer3", "layer4"];
let stat_names = ["mean", "err"];

// ------>>>>>> Generates data
function generate_data(){
  let big_data = {}
  let temp = {};
  for (let sig_i in signal_regimes) {
    let new_data = generate_random_data();
      big_data[signal_regimes[sig_i]] = new_data[1];
      temp[signal_regimes[sig_i]] = new_data[0];
  }
  let small_data = prepare_small_data(temp);
  //debug
  return([big_data, small_data])
}
//dot product sum
function dot_prod(a,b){
  let sum = 0;
  for(let i=0; i<a.length; i++){
    sum = sum + a[i] * b[i];
  }
  return(sum);
}

function generate_result(){
  let result = {};
  let result_names = ["V", "U", "S","T"];
  let bar_names = bar_names_big;
  let n = [];
  let n0 = [];
  for(let bar_i in bar_names){
    let new_n = Math.round(Math.random() * 1000)
    n.push(new_n);
    n0.push(Math.round(new_n * Math.random()));
  }

  for(let method_i in method_names){
    let result_method = {}
    for(let bar_i in bar_names){
      let fake_data = {};
      fake_data["V"] = Math.round(n0[bar_i] * Math.random());
      fake_data["U"] = n0[bar_i] - fake_data["V"];
      fake_data["S"] = Math.round((n[bar_i] - n0[bar_i]) * Math.random());
      fake_data["T"] = n[bar_i] - n0[bar_i] - fake_data["S"];

      result_method[bar_names[bar_i]] = fake_data;
    }

    result[method_names[method_i]] = result_method;
  }
  return(result)
}
function generate_random_data(){
  let data = {}
  let data_1 = {}
  let result = generate_result();
  let bar_names = bar_names_big;
  let metric_names = ["FDR", "Power", "Number_of_rejections", "Number_of_hypothesis","n1"];

  for(metric_i in metric_names){
    let new_data_metric = {};

    for(method_i in method_names){
      let new_data_method = {};

      for(let stat_i in stat_names){
        let new_data_stat = [];

        for(let bar_i in bar_names){
          let fake_mean = 0;

          if(metric_names[metric_i] == "FDR"){
            fake_mean = result[method_names[method_i]][bar_names[bar_i]]["V"] / (result[method_names[method_i]][bar_names[bar_i]]["V"]+result[method_names[method_i]][bar_names[bar_i]]["U"]);
          }else if(metric_names[metric_i] == "Power"){
            fake_mean = result[method_names[method_i]][bar_names[bar_i]]["S"] / (result[method_names[method_i]][bar_names[bar_i]]["S"]+result[method_names[method_i]][bar_names[bar_i]]["T"]);
          }else if(metric_names[metric_i] == "Number_of_rejections"){
            fake_mean =  (result[method_names[method_i]][bar_names[bar_i]]["S"]+result[method_names[method_i]][bar_names[bar_i]]["V"]);
          }else if(metric_names[metric_i] == "Number_of_hypothesis"){
            fake_mean =  (result[method_names[method_i]][bar_names[bar_i]]["S"]+result[method_names[method_i]][bar_names[bar_i]]["V"]+result[method_names[method_i]][bar_names[bar_i]]["T"]+result[method_names[method_i]][bar_names[bar_i]]["U"]);
          }else if(metric_names[metric_i] == "n1"){
          fake_mean = result[method_names[method_i]][bar_names[bar_i]]["S"]+result[method_names[method_i]][bar_names[bar_i]]["T"]

          }else{
            fake_mean = Math.random();
          }
          if (stat_names[stat_i] == "mean") {
                          new_data_stat.push(fake_mean);
                  } else {
                          new_data_stat.push(fake_mean/5);
                  }

        }
        new_data_method[stat_names[stat_i]] = new_data_stat;

      }
      new_data_metric[method_names[method_i]] = new_data_method;

    }
    data[metric_names[metric_i]] = new_data_metric;

    if(metric_names[metric_i] != "n1"){
      data_1[metric_names[metric_i]] = new_data_metric;
    }
  }
  return([data, data_1]);
}

function prepare_small_data(big_data){
  let small_data = {};
  for(let metric_i in metric_names){
    let new_data_metric = {};

    for(let method_i in method_names){
      let new_data_method = {};


      for(let stat_i in stat_names){
        let new_data_stat = [];

        let n_total = 0;
        let n_rej = 0;
        let n_f_rej = 0;
        let n1 = 0;

        for(let sig_i in signal_regimes){
          let fake_mean = 0;
          n_total = big_data[signal_regimes[sig_i]]["Number_of_hypothesis"][method_names[method_i]]["mean"].reduce(function(a, b) { return a + b; }, 0);
          n_rej = big_data[signal_regimes[sig_i]]["Number_of_rejections"][method_names[method_i]]["mean"].reduce(function(a, b) { return a + b; }, 0);
          n_f_rej = dot_prod(big_data[signal_regimes[sig_i]]["Number_of_rejections"][method_names[method_i]]["mean"],big_data[signal_regimes[sig_i]]["FDR"][method_names[method_i]]["mean"]);
          n_1 = big_data[signal_regimes[sig_i]]["n1"][method_names[method_i]]["mean"].reduce(function(a, b) { return a + b; }, 0);

          if(metric_names[metric_i] == "FDR"){
            fake_mean = n_f_rej / n_rej;
          }else if(metric_names[metric_i] == "Power"){
            fake_mean = (n_rej - n_f_rej) / n_1;

          }else if(metric_names[metric_i] == "Number_of_rejections"){
            fake_mean = n_rej;
          }else if(metric_names[metric_i] == "Number_of_hypothesis"){
            fake_mean = n_total;
          }else{
            fake_mean = Math.random();
          }

          if (stat_names[stat_i] == "mean") {
                            new_data_stat.push(fake_mean);
                } else {
                            new_data_stat.push(fake_mean/5);
               }


        }
        new_data_method[stat_names[stat_i]] = new_data_stat;

      }
      new_data_metric[method_names[method_i]] = new_data_method;
    }
    small_data[metric_names[metric_i]] = new_data_metric;
  }
  return([small_data]);
}
// ------>>>>>> End of generating data

function add_single_trace(trace, param, graph_plotly_config){
  let bar_center = param.x;
  let bar_size = param.bar_width;
  let y = param.y;
  let err = param.err;
  let showlegend = param.showlegend;
  let n_method = param.method_ind;
  let method_i = param.method_name;
  let xaxis = param.xaxis;
  let yaxis = param.yaxis;
  let thresh = param.thresh;
  let arrow_length = bar_size * graph_plotly_config.arrow_length_f;

  let single_trace = {};
  let bar_location = [bar_center - bar_size / 2 , bar_center - bar_size / 2 , bar_center,bar_center + bar_size / 2 , bar_center + bar_size / 2];

  //rectangle
 single_trace = {
  x: bar_location,
  y: [0, y,y , y, 0],
  fill: 'tozeroy',
  fillcolor: graph_plotly_config.color[n_method-1],
  hoverinfo: "none",
  type: 'scatter',
  mode:"markers",
  marker:{
    size : 1,
    opacity : 0.0
  },
  showlegend : showlegend,
  xaxis : xaxis,
  yaxis : yaxis,
  legendgroup: method_i,
  name : method_i,
}
if(y< thresh){
    single_trace.y = [0, thresh,thresh, thresh, 0];
    // single_trace.marker.opacity=0.0;
    single_trace.fillcolor= graph_plotly_config.color_rgb[n_method-1];
}
trace.push(single_trace);

//erro bar
single_trace = {
  x : [bar_center ],
  y : [y],
  error_y:{
    type: 'data',
    array : [ err * graph_plotly_config.n_error ],
    color : graph_plotly_config.error_col,
    width : graph_plotly_config.arrow_length,
  },
  mode : "markers",
          type : "scatter",
          marker : {
            color : graph_plotly_config.error_col,
            opacity : 1,
            size : 1,
          },
          text : method_i,
        hoveron : "points",
        hovertext : y.toFixed(2).concat(",").concat(err.toFixed(2)),
        hoverinfo: "text",
        hoverlabel: {
          bgcolor: graph_plotly_config.hover_format.bgcolor,
          font: {
            color: graph_plotly_config.hover_format.font.color
          }
        },
          showlegend : false,
        xaxis : xaxis,
        yaxis : yaxis,
}
trace.push(single_trace);

return(trace)
}

//function to add trace, same for all frames
function add_trace(data, graph_plotly_config, graph_param){
  let trace = [];

  console.log(graph_param)
  let bar_names = graph_param.bar_names;

  let bar_size = graph_param.bar_size;
  let max_val = graph_param.max_val;
  let legends = graph_param.legends;

  //set up initial traces
  n_metric = 0;
  for(let metric_i in data){
    n_metric = n_metric + 1;
    n_method = 0;
    n_methods = Object.keys(data[metric_i]).length;
    for(let method_i in data[metric_i]){
      n_method = n_method + 1;

      let y = data[metric_i][method_i]["mean"];
      let err = data[metric_i][method_i]["err"];
      let xaxis = "x".concat(n_metric);
      let yaxis = "y".concat(n_metric);

      n_bar = 0;
      for(bar_i in bar_names){
        bar_center = (n_bar) / bar_names.length + graph_plotly_config.bar_padding / 2 + bar_size * (n_method - 0.5);
        //show legends
        showlegend = false;
        if (y[n_bar] > max_val[n_metric - 1] * graph_plotly_config.min_val){
          if ( (legends[n_method-1] == false) &  n_methods > 2){
            showlegend = true;
            legends[n_method-1] = true;
          }
        }

        let param = {
          "x" : bar_center,
          "bar_width" : bar_size,
          "y" : y[n_bar],
          "err" : err[n_bar],
          "showlegend" : showlegend,
          "method_ind" : n_method,
          "method_name" : method_i,
          "xaxis" : xaxis,
          "yaxis" : yaxis,
          "thresh" : max_val[n_metric - 1] * graph_plotly_config.min_val,
        }
        trace = add_single_trace(trace, param, graph_plotly_config );
        n_bar = n_bar + 1;
      }
    }
  }

  let traces = {
    "trace" : trace,
    "legends" : legends,
}

  return(traces);
}

function prepare_plotly_graph_data(input_data, graph_plotly_config){
  let bar_names = [];
  let signal_1 = [];
  let slider = true;
  let data = {};
  //Trim data to sones we want to show
  for(let signal_i in input_data){
    let data_sig = {};
    for(let metric_i in input_data[signal_i]){
      let plot_metric = false;
      for(let i=0; i<metric_names_plot.length; i++){
        if(metric_i == metric_names_plot[i]){
          plot_metric = true;
        }
      }
      if(plot_metric == true){
        data_sig[metric_i] = input_data[signal_i][metric_i]
      }
    }
    data[signal_i] = data_sig;
  }

  //small data
  if(Object.keys(data).length == 1){
    bar_names = signal_regimes;
    signal_1 = data[0];
    slider = false;
  }else{
    bar_names = bar_names_big;
    signal_1 = data[signal_regimes[graph_plotly_config.init_val-1]];
  }
  console.log(data)

  //parameters for the graph
  let subplot =  Object.keys(signal_1);
  let n_subplot = subplot.length;
  let plot_height = (1 - (n_subplot +1) * graph_plotly_config.padding) / n_subplot;
  let total_method = Object.keys(signal_1[subplot[0]]).length;
  let bar_size = (1 / bar_names.length - graph_plotly_config.bar_padding) / total_method;
  let arrow_length = bar_size * graph_plotly_config.arrow_length_f;
  let subplot_center = [];
  for(let i = 0; i < bar_names.length; i++){
    subplot_center.push( (i + 0.5 )/ bar_names.length ) ;
  }
  let legends = {};
  for(let i=0; i<total_method;i++){
    legends[i] = 0;
  }
  console.log(legends);

  //Find maximum in all data values to set range of y
  let max_val = [];
  let ind = 0;
  for(let i=0; i < n_subplot; i++){
    max_val[i] = 0;
  }
  for(let signal_i in data){
    ind = 0;
    for(let metric_i in data[signal_i]){
      for(let method_i in data[signal_i][metric_i]){
        for(let i = 0; i < bar_names.length; i++){
          max_val[ind] = Math.max(max_val[ind], data[signal_i][metric_i][method_i]["mean"][i] + data[signal_i][metric_i][method_i]["err"][i] )
        }
      }
      ind = ind + 1;
    }
  }
  console.log(max_val)

  //prepare data for graph
  let init_trace = []; //this is just data for plot call
  let single_trace = [];
  let frame_trace = [];
  let layout = {};
  let frames = [];
  let new_frame = [];
  let steps = [];
  let new_step = [];

  let n_metric = 0;
  let n_method = 0;
  let n_bar = 0;
  let bar_center = 0;
  let bar_location = [];
  let title_anns = [];

  let max_y_val = max_val[n_metric - 1] * (graph_plotly_config.max_val + 1);

  //set up layouts
  for(let metric_i in signal_1){
    n_metric = n_metric + 1;
    title_anns.push({
      x : 0.5,
      y : max_val[n_metric - 1] * graph_plotly_config.subplot_title_y,
      xref: "x".concat(n_metric),
      yref: 'y'.concat(n_metric),
      text: graph_plotly_config["plot_names"][metric_i],
      showarrow: false,
      // arrowhead: 3,
      // ax: -30,
      // ay: -40
    });
    // if(graph_plotly_config.plot_orient == "horizontal"){
      //setting domain for subplot
    let domain_left= (n_metric-1) * (plot_height + graph_plotly_config.padding) ;
    let domain_right = domain_left + plot_height;

    console.log(domain_left)
    // debugger;
    //update layout
    layout["yaxis".concat(n_metric)] = {
      fixedrange: true,
      anchor: "x".concat(n_metric),
      domain : [0,1],
      range : [0, max_y_val],
      // title : graph_plotly_config["plot_names"][metric_i],
      //hoverformat : graph_plotly_config.layout.yaxis.hoverformat,
    };
    layout["xaxis".concat(n_metric)] = {
      fixedrange: true,
      anchor: "y".concat(n_metric),
      domain : [domain_left, domain_right],
      range : [0,1],
      autotick : false,
        tickvals : subplot_center,
          ticktext : bar_names,
          tickmode : "array"
    };
    // add line (optional)
    if(metric_i == "FDR"){
      layout['shapes'] =  [{
        'opacity': graph_plotly_config.layout.line.opacity,
        'xref': "x".concat(n_metric),
        'yref': 'y'.concat(n_metric),
        'x0': 0,
        'y0': graph_plotly_config.sig_level,
        'x1': 1,
        'y1': graph_plotly_config.sig_level,
        'type': 'line',
        'line': graph_plotly_config.layout.line.line
      }]
    }
    // TODO: handle case when vertical without duplicating code
    // } else if (graph_plotly_config.plot_orient == "vertical"){
    //   //setting domain for subplot
    //   let domain_low = 1 - n_metric * (plot_height + graph_plotly_config.padding) ;
    //   let domain_up = domain_low + plot_height;
    //   //update layout
    //   layout["yaxis".concat(n_metric)] = {
    //     anchor: "x".concat(n_metric),
    //     domain : [domain_low, domain_up],
    //     title : graph_plotly_config["plot_names"][metric_i],
    //     //hoverformat : graph_plotly_config.layout.yaxis.hoverformat,
    //     range : [0,max_val[n_metric - 1] * (graph_plotly_config.max_val + 1)]
    //   };
    //   layout["xaxis".concat(n_metric)] = {
    //     anchor: "y".concat(n_metric),
    //     domain : [0,1],
    //     range : [0,1],
    //     autotick : false,
    //     tickvals : subplot_center,
    //     ticktext : bar_names,
    //     tickmode : "array",
    //
    //   };

    //   // add line
    //   if(metric_i == "FDR"){
    //     layout['shapes'] =  [{
    //       'opacity': graph_plotly_config.layout.line.opacity,
    //       'xref': 'paper',
    //       'yref': 'y'.concat(n_metric),
    //       'x0': 0,
    //       'y0': graph_plotly_config.sig_level,
    //       'x1': 1,
    //       'y1': graph_plotly_config.sig_level,
    //       'type': 'line',
    //       'line': graph_plotly_config.layout.line.line
    //     }]
    //     }
    // }
  }

  console.log(bar_names)

  let graph_param = {
    "bar_names" : bar_names,
    "max_val" : max_val,
    "bar_size" : bar_size,
    "legends" : legends,
  }
  console.log(graph_param)

  let temp = add_trace(signal_1, graph_plotly_config, graph_param);
  init_trace = temp.trace;
  legends = temp.legends;

  //debug
  console.log(init_trace)
  console.log(legends)

  layout["annotations"] = title_anns;
  layout["width"] = graph_plotly_config.layout.width;
  layout["height"] = graph_plotly_config.layout.height;
  layout["margin"] = graph_plotly_config.layout.margin;
  layout["autosize"] = false;
  // layout["showlegend"] = false;
  if(slider == false){
    layout["height"] = graph_plotly_config.layout.height - 100;
    //Prepare plot
    let graph_data = {
      "data" : init_trace,
      "layout" : layout,
      "slider" : false,
    }
    return(graph_data)
  }

  //Set up frames and steps
  for(let signal_i in data){
    frame_trace = [];

    graph_param.legends = legends;

    let temp = add_trace(data[signal_i], graph_plotly_config, graph_param);
    frame_trace = temp.trace;
    legends = temp.legends;

    new_frame = {
      name : signal_i,
      data: frame_trace
    }
    frames.push(new_frame);

    new_step = {
      label : signal_i,
      method: "animate",
      args:[[signal_i],{
        mode: graph_plotly_config.step.mode,
        frame: {redraw: graph_plotly_config.step.frame.redraw,
          duration: graph_plotly_config.step.frame.duration},
        transition: {duration: graph_plotly_config.step.transition.duration}
      }]
    }
    steps.push(new_step);
  }
  //Prepare plot
  let graph_data = {
    "data" : init_trace,
    "frames" : frames,
    "steps" : steps,
    "layout" : layout,
    "slider" : true,
  }
  // debugger;
  return(graph_data)
}

function update_layout(plot_layout, graph_data,graph_plotly_config){
  let plot_steps = graph_data.steps;
plot_layout.sliders ={
  pad: {t: 30,
    b : 30},
  x: 0.05,
  //location of slider
  y: 1.5,
  len: 0.905,
  currentvalue: {
    xanchor: 'right',
    prefix: 'case: ',
    font: {
      color: '#888',
      size: 20
    }
  },
  transition: {duration: 500}
};
plot_layout.updatemenus = [{
     type: 'buttons',
     showactive: false,
     x: 0.05,
     //locatin of button
     y: 1.5,
     xanchor: 'right',
     yanchor: 'top',
     direction: 'left',
     pad: {t: 60, r: 20},
     buttons: [{
       label: 'Play',
       method: 'animate',
       args: [null, {
         fromcurrent: true,
         frame: {redraw: false, duration: 1000},
         transition: {duration: 500}
       }]}, {
       label: 'Pause',
       method: 'animate',
       args: [[null], {
         mode: 'immediate',
         frame: {redraw: false, duration: 0}
       }]
     }]
}];

plot_layout.sliders["active"] = graph_plotly_config.init_val - 1;
plot_layout.sliders["steps"] = plot_steps;
plot_layout.sliders = [plot_layout.sliders];

return(plot_layout)
}

function initialize_bar(graph_div,graph_data,graph_plotly_config){
  let plot_data = graph_data.data;
  let plot_layout = graph_data.layout;
  console.log(graph_data.layout)

  //legends
  plot_layout.legend = {
    x : graph_plotly_config.layout.legend.x,
    y : graph_plotly_config.layout.legend.y,
    orientation : graph_plotly_config.layout.legend.orientation,
  }

  //if no slider
  if(graph_data.slider == false){
    Plotly.newPlot(graph_div, plot_data, plot_layout);
    return(0);
  }

  //more layouts to setup slider
  let plot_frames = graph_data.frames;
  let plot_steps = graph_data.steps;
  plot_layout = update_layout(plot_layout, graph_data,graph_plotly_config);
  console.log(plot_layout)

  Plotly.newPlot(graph_div, { data : plot_data, layout : plot_layout , frames : plot_frames});
}

function update_bar(graph_div,data, graph_plotly_config){
  let graph_data = prepare_plotly_graph_data(data, graph_plotly_config);

  let plot_data = graph_data.data;
  let plot_layout = graph_data.layout;

graph_div = document.getElementById(graph_div);
  graph_div.data = plot_data;

  graph_div.layout = plot_layout;

  //legends
plot_layout.legend = {
  x : graph_plotly_config.layout.legend.x,
  y : graph_plotly_config.layout.legend.y,
  orientation : graph_plotly_config.layout.legend.orientation,
}

  if(graph_data.slider == false){
    Plotly.redraw(graph_div);
    return(0);
  }


//if no slider
if(graph_data.slider == false){
  Plotly.newPlot(graph_div, plot_data, plot_layout);
  return(0);
}

//more layouts to setup slider
let plot_steps = graph_data.steps;
plot_layout = update_layout(plot_layout, graph_data,graph_plotly_config);
let plot_frames = graph_data.frames;
  graph_div.frames = plot_frames;

  Plotly.redraw(graph_div);
}

function update_data() {
let data = generate_data();
  let big_data = data[0];
  let small_data = data[1];
  update_bar("graph",big_data,plotly_config);
  update_bar("graph_small",small_data,plotly_config);
}

let data = generate_data();
let big_data = data[0];
let small_data = data[1];
console.log(big_data);
console.log(small_data);

