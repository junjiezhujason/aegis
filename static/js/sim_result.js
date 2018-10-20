
// configuration info and initializations
let config = general_config;
let ss_manhattan_config = ssm_params();
config.main_mode = "simulation_result";
setup_full_go_canvas(config);
create_all_groups("#viewer_foc_con_png", config);
create_all_groups("#viewer_foc_con_svg", config);
initialize_ssm_canvas("#viewer_ssm_png", ss_manhattan_config);
initialize_ssm_canvas("#viewer_ssm_svg", ss_manhattan_config);

function request_simulation_details() {
  let job_name = $("#job_id_input").val();
  let test_method = $("#result_test_method").val();
  let adjust_method =  $("#option_multi_test").attr("true_value");
  // console.log(test_method);
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
      // full_data.general_data.simulation["statistics"] = out_data["statistics"];
      plotly_boxplot(config, "update", out_data.statistics);
      $("#expand_binder_result_summary").off().on("click", function() {
        open_context_focus_image("ssm");
      });
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
      let name_alias = {
        "hypergeometric.ga" : "Hypergeometric",
        "simes": "Simes' (Composite)",
        "BH": "Benjamini Hochberg",
        "Bonferroni": "Bonferroni",
      };
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
        let param_value = out_data.lite_summary[sim_param];
        let display_value;
        if (["comp_test", "self_test", "multi_test"].includes(sim_param)) {
          display_value = name_alias[param_value]
        } else {
          display_value = param_value;
        }
        $("#option_"+sim_param).attr("true_value", param_value);
        $("#option_"+sim_param).val(display_value);
      }
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


$(function() {
  $(".result-panel").hide();
  // enable_graph_viewer_saving();
  setup_simulation_highlight_options();
  // $("#result_test_method").val("hypergeometric.ga");
  plotly_boxplot(config, "init");
  // button_div_hide_show("#expand_binder_summary", "#power_binder_plot");
  // button_div_hide_show("#expand_level_summary", "#ploty_layer_summary");
  // submit the data as an option
  $("#load_simulation_button").click(function() {
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
