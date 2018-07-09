
function prep_trial_panel(sim_data, config) {
    // prepare the data for the trial panel
    // count up the rejections for each method, each case and each trial
    // each (trial, method) pair is a trace
    // and each line consists of signal regime vs number of rejections

    // TODO: make the methods more explicit when outputting from python
    let methods = Object.keys(sim_data.sim_results[0][0].rejections);
    let n_methods = methods.length;
    // ----
    let n_trials = sim_data.n_trials_per_case;
    let n_sigs = sim_data.n_cases;
    let out_data = []; // each element would be a trace for plotly
    let x_const = Array.apply(null, {length: n_sigs}).map(Number.call, Number);
    for (let trial_i = 0 ; trial_i < n_trials; trial_i++ ) {
        for (let j = 0; j < n_methods; j++ ) {
            let meth = methods[j];
            let rej_cnts = [];
            for (let k = 0; k < sim_data.n_cases; k++ ) {
                let rej = sim_data.sim_results[k][trial_i].rejections[meth];
                rej_cnts.push(rej.length);
            }
            let trace = {
                x: x_const,
                y: rej_cnts,
                hoverinfo: 'x',
                showlegend: false,
                opacity: 0.3,
                line: {
                  color: config.method_color[meth],
                  simplify: false,
                },
            };
            out_data.push(trace);
        }
    }
    return(out_data);
}

function setup_config(sim_data) {
    let ntrial = sim_data.n_trials_per_case;
    let nsig = sim_data.n_cases;
    let slider_config = {
        "parameters": [
          "Case",
          "Trial",
        ],
        "shortkey": {
          "Case": "c",
          "Trial": "s",
        },
        "value_ranges": {
          "Case": Array.apply(null, {length: nsig}).map(Number.call, Number),
          "Trial": Array.apply(null, {length: ntrial}).map(Number.call, Number),
        },
        "current_values" : {
          "Case": 0,
          "Trial": 0,
        },
        "slider_positions": {
          "Case": [0.0, 0.0],
          "Trial": [0.0, 1.4],
        },
      };
    return(slider_config);
}

function setup_slider_frame(sim_data, slider, config) {
    let frames = [];
    let steps = slider.steps;
    let step;
    // TODO: improve later
    let methods = Object.keys(sim_data.sim_results[0][0].rejections);
    let n_methods = methods.length;
    let n_trials = sim_data.n_trials_per_case;

    for (let step_i = 0; step_i < steps.length; step_i++ ) {
        step = steps[step_i];
        // for each step, highlight methods under that trial
        // recall that each (trial, method) pair is a trace
        let trace_update = [];
        for (let trial_i = 0 ; trial_i < n_trials; trial_i++ ) {
            for (let j = 0; j < n_methods; j++ ) {
                let trace;
                if (trial_i == step_i) {
                    // selected trial value
                    trace = {
                        opacity: 1.0,
                        showlegend: false,
                        hoverinfo: 'y',
                        "line.color":  config.method_color[methods[j]],
                    }
                } else {
                    // other trial values
                    trace = {
                         // selected trial value
                        opacity: 0.1,
                        showlegend: false,
                        hoverinfo: 'skip',
                        "line.color":  config.method_dim_color[methods[j]],
                    }
                }
                trace_update.push(trace);
            }
        }
        let curr_frame = {
            name: step.args[0][0],
            data: trace_update,
        };
        frames.push(curr_frame);
    }
    return(frames);
}

function setup_summary_statics_view(sim_data) {
    let general_config = {
        "method_color": {
            "BH": "#3C6BFF",
            "Bonferroni": "#BA4A00",
        },
        "method_dim_color": {
            "BH": "#9DB5FF",
            "Bonferroni": "#FFD89D",
        }
    };
    let slider_config = setup_config(sim_data);
    console.log(sim_data);
    let trace_data = prep_trial_panel(sim_data, general_config);
    let slideExDiv = document.getElementById('trialSlider');
    let trial_slider = setup_plotly_single_slider("Trial", slider_config);
    let laytout_w_slider =   {
        // width: 380,
        // height: 450,
        "xaxis" : {
            title: 'case number',
            showgrid: true,
            zeroline: true,
            hoverformat: '.2f'
          },
          "yaxis": {
            title: 'number of rejections',
            showgrid: true,
            zeroline: true,
            hoverformat: '.2f'
          },
        margin: {
            l: 50,
            r: 0,
            b: 50,
            t: 0,
            pad: 0,
          },
        sliders: [
            trial_slider,
            ],
        };
    Plotly.plot(slideExDiv, {
        data: trace_data,
        layout: laytout_w_slider,
        frames: setup_slider_frame(sim_data, trial_slider, general_config),
    });
}
