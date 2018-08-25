

function prepare_data_for_plotly(data,config) {
    //Add a field in the dictionary indicating members that are "others"
    let other = [];
    for (let go_name in data.tested_terms) {
      //flag checks if the go-term is in any existing categories
      flag = false;
      name = data.tested_terms[go_name];
      for(y in data.ancestors){
        if(name == data.ancestors[y]){
          flag = true;
        }
      }
      for(y in data.descendents){
        if(name== data.descendents[y]){
            flag = true;
        }
      }
      if (name==data.go_term){
        flag = true;
      }
      //if not in existing category, add to the "other" category
      if(flag == false){
        other.push(data.tested_terms[go_name])
      }
    }
    data["other"] = other;
    data["go_term"] = [data["go_term"]];
    //All relationships
    let rel = ["ancestors","descendents","go_term","other"];
    //creates a dictionary for easy access to p-values necessary to plot the figure
    let graph_data = {}
    //level-1: data in each trial
    for(let trial_num = 0; trial_num<data.n_trials_per_case;trial_num++){
      //level-2: data in each case within a trial
      data_seed = {};
      for(let seed_num = 0; seed_num< data.n_cases;seed_num++){
        //create a map for GO-term names to their p-values in a given trial-case
        let go_value_map = {};
        let n = trial_num + data.n_trials_per_case*(seed_num);
        for (let i =0; i < data.n_go_terms_tested; i ++ ) {
          go_value_map[data.tested_terms[i]] = data.raw_pvalues[n][i];
        }
        //level-3: p-value for each trial-case-group
        let p_value_trial = {};
        for(r in rel){
          //group members
          group = rel[r];
          //create data for members in a group
          let temp = [];
          for(l in data[group]){
            temp.push(go_value_map[data[group][l]])
          }
          p_value_trial[group] = temp;
        }
        data_seed[seed_num] = p_value_trial;
      }
      graph_data[trial_num] = data_seed;
    }
    //create distance for each go-term
    var distance = {};
    for(let r=0; r<4;r++){
      group = rel[r];
      let temp = [];
        for(l in data[group]){
            temp.dist = data.jaccard_dist[data[group][l]]
            if(temp.dist == null){
                temp.dist = 1
            }
          temp.push(temp.dist)
        }
        distance[group] = temp;
    }
    //create traces and frames
    let out_trace = [];
    let out_frame = [];
    let out_step= [];

   // color = ["pink","purple","red","green"]
   //Setup traces
    //level-1: trace in one trial
    for(let trial_num = 0; trial_num<data.n_trials_per_case;trial_num++){
      let one_trial_trace = [];
      let one_trial_frame = [];
      let one_trial_step = [];
      //level-2: trace in one trial-case
      for(seed_num = 0; seed_num<data.n_cases;seed_num++){

        //level-3: trace in one trial-case-group
        let one_trial_case_trace = [];
        let one_trial_case_frame = [];
        let one_trial_case_step = [];
        for(r in rel){
          group = rel[r];
          x_val = distance[group]; //distance
          y_val = graph_data[trial_num][seed_num][group]; //p-values
          //trace for a group
        let single_trace = {
                x: x_val,
                 y: y_val,
                 mode: 'markers',
                 type: 'scatter',
                 marker: { size: config.layout.marker_layout.marker.size,
                 color: config.layout.marker_layout.marker.color[r]},
                 hoverinfo : config.layout.marker_layout.hoverinfo,
                 name:group
          }
          one_trial_case_trace.push(single_trace);
      }
      //frame
          one_trial_case_frame = {
            name : String(seed_num),
            data: one_trial_case_trace
          }
          //step
          one_trial_case_step = {
            label : String(seed_num),
            method: "animate",
            args:[[String(seed_num)],
                  {
                    mode: config.step_config.mode,
                    frame: config.step_config.frame,
                    transition: config.step_config.transition
            }
            ]
          }
      one_trial_trace.push(one_trial_case_trace);
      one_trial_frame.push(one_trial_case_frame);
      one_trial_step.push(one_trial_case_step);
      }
      out_trace.push(one_trial_trace);
      out_frame.push(one_trial_frame);
      out_step.push(one_trial_step);
    }
    console.log("OUT TRACE DATA");
    console.log(out_frame);
    return({"trace": out_trace,
            "step": out_step,
            "frame": out_frame});
}


//create plot
function init_caseslider(div, outs, config) {
    let out_trace = outs.trace;
    let out_step = outs.step;
    let out_frame  = outs.frame;
    let init_trial = config.init_trial;
    let init_case = config.init_case;
    //setup layouts
    let layout = [];
    layout = {
        legend : config.layout.graph_layout.legend,
        xaxis : config.layout.graph_layout.xaxis,
        yaxis : config.layout.graph_layout.yaxis,
        margin : config.layout.graph_layout.margin,
        hovermode : config.layout.graph_layout.hovermode,
        updatemenus : [config.layout.graph_layout.updatemenus]
    }
    layout.sliders = config.layout.graph_layout.sliders;
    layout.sliders["active"] = init_case;
    layout.sliders["steps"] = out_step[init_trial];
    layout.sliders = [layout.sliders];
    //plot
    Plotly.plot(div, {
      data: out_trace[init_trial][init_case],
      layout: layout,
      frames: out_frame[init_trial]
    });
}
// update plot
function update_caseslider(div, outs, config) {
    let out_step = outs.step;
    let out_frame  = outs.frame;
    let init_trial = config.init_trial;
    let init_case = config.init_case;
    let graph_div = document.getElementById(div);
    graph_div.frames = out_frame[init_trial]
     //update initial data , other layouts are the same
    let layout = graph_div.layout;
    console.log(layout.sliders[0] )
    layout.sliders[0]["active"] = init_case;
    layout.sliders[0]["steps"] = out_step[init_trial];

    graph_div.layout = layout;
    Plotly.redraw(graph_div);
}


// THIS IS FOR THE SIMULATION SLIDERS
function parse_simulation_key(config, value_map) {
  let param_i = 0;
  let out_key = "";
  while (param_i < config.parameters.length) {
    param = config.parameters[param_i];
    out_key += config.shortkey[param];
    out_key += String(value_map[param]);
    param_i += 1;
    if (param_i < config.parameters.length){
      out_key += "_";
    }
  }
  console.log(out_key);
  return(out_key);
}

function setup_plotly_single_slider(name, config) {
  let pos = config.slider_positions[name];
  let val_range = config.value_ranges[name];
  // common configurations of the slider
  let slider = {
    name: name,
    pad: {t: 30},
    x: pos[0],
    y: pos[1],
    len: 1.00,
    currentvalue: {
      xanchor: 'left',
      prefix: name + " : ",
      font: {
        color: '#888',
        size: 13
      }
    },
    transition: {duration: 100},
  };

  let steps = [];
  let frame_key;
  let step_value;
  // construct key frame from scratch
  let curr_vals = Object.assign({}, config.current_values);
  for (let i_val = 0; i_val < val_range.length; i_val ++ ) {
    step_value = val_range[i_val];
    curr_vals[name] = step_value;
    // console.log(curr_vals);
    // console.log(config.current_values);
    // frame_key = parse_simulation_key(config, curr_vals);
    frame_key = config.shortkey[name] + step_value;
    steps.push({
      label: step_value,
      method: "animate",
      args: [[frame_key], {
        mode: "immediate",
        frame: {redraw: false, duration: 100},
        transition: {duration: 100}
       }]
    })
  }

  slider["steps"] = steps;

  return(slider);
}



// TODO: remove later
function create_nodetip(container) {
  let tooltip = container.append("div")
    .attr("id", "nodetip")
    .style("position", "absolute")
    .style("top", "0px")
    .style("left", "0px")
    .style("background", "white")
    .style("box-shadow", "0 0 10px #999999")
    .style("color", "black")
    .style("display", "inline")
    .style("font-size", "11px")
    .style("padding", "2px")
    .style("padding-left", "4px")
    .style("padding-right", "4px")
    .style("text-align", "center")
    .style("height", "auto")
    .style("width", "auto")
    .style("display", "none")
    ;

  tooltip.append('div')
    .attr('class', 'label');
}

// TODO: remove later
function create_selection_output(container) {
    // container.append("p")
    //   .attr("id", "query_output")
    //   .text("[Query info will be displayed here]");

    container.append("p")
      .attr("id", "go_output")
      .text("[Move mouse over a focus graph node to see GO information]")
      .style("overflow-x", "auto")
      .style("display", "inline-block");


    container.append("p")
      .attr("id", "gene_output")
      .text("")
      .style("overflow-x", "auto")
      .style("display", "inline-block");
}

// TODO: remove later
function create_slider(container,config){
  let min = 0;
  let max = config.sim_time;
  let init_val = 0;

  let slider_input = container.append("div")
    .attr('class', 'slider-wrapper')
    .style("position", "absolute");
    ;
  slider_input.append("div")
    .style("display","inline-block")
    .append("p")
    .attr("class", "slider_title")
    .attr('id', 'title')
    // .style("padding-left", "10px")
    .text("Simulation:")
    ;

  slider_input.append("div")
    .style("display","inline-block")
    .style("width","10px")
    .style("height", "auto")
    ;

  slider_input.append('input')
    .attr('id', 'sim_slider')
    .attr('type','range')
    .attr('value', init_val)
    .attr('step', 1)
    .attr('min', min)
    .attr('max', max)
    .style('height', "10px")
    .style("width","220px")
    .style("vertical-align","center")
    ;

  slider_input.select('#sim_slider')
    .attr('value', init_val)
    ;

  slider_input.select("#sim_slider")
    .property("value", init_val)
    .attr("value", init_val);
    ;

  slider_input.append("div")
    .style("display","inline-block")
    .style("width","20px")
    .style("height", "auto")
    ;

  let slider_text = slider_input.append("div")
  	.style("display","inline-block")
    .style("width","300px")
    .style("height", "auto")
    ;

  slider_text.append("p")
  	.attr("id","slider_output")
  	.text("[Slide bar to see rejection results]")
    .style("margin-right", "20px")
    .style("display","inline-block")
  	;
  slider_text
    .append("p")
    .style("display","inline-block")
    .attr("id","slider_count")
    ;

  slider_input.append("input")
    .attr("id","submit_rejection")
    .attr("type","submit")
    .attr("value","Query Rejections")
    .style("display", "inline-block")
    .style("font-size","16px")
    .style("font-family","Arial")
    .style("background","white")
    .style("vertical-align", "top")
  ;

  return slider_input;
}
























