
// configuration info and initializations
let config = general_config;
config.main_mode = "simulation_result";
setup_full_go_canvas(config);
let ss_manhattan_config = ssm_params();
initialize_ssm_canvas(".plot-sim-canvas", ss_manhattan_config)


function request_simulation_details() {
  let job_name = $("#job_id_input").val();
  let test_method = $("#result_test_method").val();
  let adjust_method =  $("#result_multi_method").val();
  $.ajax({
    url: "/simulation_details",
    timeout: 10000,
    type: "POST",
    data: JSON.stringify({"job_id": job_name,
                          "test_method": test_method,
                          "adjust_method": adjust_method}),
    contentType: "application/json",
    success: function(out_data) {
      console.log("Simulation details loaded succesfully!");
      full_data.general_data.simulation["matrix"] = out_data["matrix"];
    },
    failure: function() {
      console.log("Server error.");
    },
    error: function ( jqXHR, textStatus, errorThrown) {
      console.log("errorThrown: " + errorThrown
      + " textStatus:" + textStatus);
    }
  })
}

function request_simulation_restore() {
  let job_name = $("#job_id_input").val();
  $.ajax({
    url: "/simulation_restore",
    timeout: 10000,
    type: "POST",
    data: JSON.stringify({"job_id": job_name}),
    // data: JSON.stringify({"job_id": job_name,
    //                       "test_method": test_method,
    //                       "adjust_method": adjust_method}),
    contentType: "application/json",
    success: function(out_data) {
      console.log("Simulation data loaded succesfully!");
      $(".result-panel").show();

      full_data.general_data.simulation = out_data;
      full_data.ground_truth_info = out_data["nonnulls"];
      // unpack the data
      // restore the ontology options and disable further changes
      $("#ontology_selection").val(out_data["ontology_params"]["ontology"]);
      $("#species_selection").val(out_data["ontology_params"]["species"]);
      // TODO: fix restore the context options and disable further changes
      $("#highlight_node_select").val("self_nonnull");
      config.curr_state.Highlight = $("#highlight_node_select").val();
      button_icon_change("#load_simulation_button", "complete");
      // update the simulation parameters
      for (let sim_param in out_data.lite_summary) {
        console.log(sim_param);
        $("#option_"+sim_param).val(out_data.lite_summary[sim_param]);
      }
      request_simulation_details();
      setup_request_main_ontology();
    },
    failure: function() {
      console.log("Server error.");
    },
    error: function ( jqXHR, textStatus, errorThrown) {
      console.log("errorThrown: " + errorThrown
      + " textStatus:" + textStatus);
    }
  })
}


function render_binder_plot() {
  let job_name = $("#job_id_input").val();
  let test_method = $("#result_test_method").val();
  let fname = "subfig_" + job_name + "_" + test_method;
  d3.select("#export_as_png").on('click', function(){
    d3.select(".ssm-svg")
      .selectAll(".tick")
      .selectAll("text")
      .style("font-family", "Arial")
      ;
    save_d3_svg("#full_binder_plot", "png", fname + ".png")
  });
  // https://github.com/edeno/d3-save-svg
  d3.select('#export_as_svg').on('click', function() {
    d3.select(".ssm-svg")
      .selectAll(".tick")
      .selectAll("text")
      .style("font-family", "Arial")
      ;
    save_d3_svg("#full_binder_plot", "svg", fname)
  });
  // important to avoid illustrator bugs

}

$(function() {
  // $(".result-panel").hide();
  setup_simulation_highlight_options();
  button_div_hide_show("#expand_binder_summary", "#power_binder_plot");
  button_div_hide_show("#expand_level_summary", "#ploty_layer_summary");
  // submit the data as an option
  $("#load_simulation_button").click(function() {
    // render_plotly_summary("plotly_power");
    // render_plotly_summary("plotly_fdr");
    // render_plotly_summary("plotly_numrej");

    let graph_data = prepare_plotly_graph_data(big_data, plotly_config);
    initialize_bar("ploty_layer_summary",graph_data,plotly_config);
    let graph_data_small = prepare_plotly_graph_data(small_data, plotly_config);
    initialize_bar("ploty_all_summary", graph_data_small, plotly_config)

    // clicking this button restores the graph selected in simulation setup
    $("#spinner_max_num_foc_anchors").val(20);
    $("#spinner_foc_gap_break").val(5000);
    move_to_next_section("#loadResultPanel", "#loadResult",
                         "#goExplorePanel", "#goExplore")
    let disable_divs = [".data-driven-line",
                        "#general_options",
                        "#context_anchors",
                        "#context_options"]
    disable_divs.forEach(div => {$(div).addClass("disableddiv"); });
    request_simulation_restore();
  });
});



// // old:
// let data;
// let precomp_data;
// let result_data;
// let config = general_config;
// let go_awesomplete;
// // core-setup
// config.main_mode = "simulation_result";
// config.main_div = "#go_panel";
// config.completeID = go_awesomplete;
// go_interaction_core_setup(config);
// initialize_plot_canvas(".plot-canvas", ss_manhattan_config)

// $('.panel-collapse').on('shown.bs.collapse', function (e) {
//   var $panel = $(this).closest('.panel');
//   $('html,body').animate({
//       scrollTop: $panel.offset().top
//   }, 500);
// });

// $(function(){
//   $("#go_tagsinput").tagsinput({tagClass: "cust-tags"});
//   $('[data-toggle="tooltip"]').tooltip();
//   $(".sim_spinner").spinner();
// });


// // Set-up the export button
// d3.select("#export_as_png").on('click', function(){
//     save_d3_svg(".svg-table", "png", "export.png")
// });
// // https://github.com/edeno/d3-save-svg
// d3.select('#export_as_svg').on('click', function() {
//   save_d3_svg(".svg-table", "svg", "export.svg")
// });
