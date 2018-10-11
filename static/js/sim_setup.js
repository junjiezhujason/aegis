// data-handling for rendering
// -----------------------------------------------------------------------------
// global variables (TODO: handle in the future)
let config = general_config;
config.main_mode = "simulation_setup";
setup_full_go_canvas(config);

$(function() {
  // application-specific parameters
  $("#spinner_foc_gap_break").val(1000);
  initialize_gene_tagit();
  setup_simulation_highlight_options();
  setup_request_main_ontology();
  $( "#option_eff_size" ).spinner({
      step: 0.01,
      numberFormat: "n1"
  });
  $( "#option_node_level" ).spinner({
      step: 0.01,
      numberFormat: "n1"
  });

})

// handle simulation setup with a progress dialog
// -----------------------------------------------------------------------------
let source = null;
function cancelSimFunc() {
  source.close()
  $("#progress_dialog").dialog("close");
}
// TODO: hide the submission button when ajax is running as a lock

function generateJobID() {
  $.ajax({
    url: "/generate_job_id",
    timeout: 10000,
    type: "GET",
    data: JSON.stringify({}),
    contentType: "application/json",
    success: function(out_data) {
      alert("All data will be saved at: " + out_data.path)
      $("#job_id_input").val(out_data.job_id);
      $("#submit_btn").prop("disabled", false);
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

function submitSim() {
  // collect the parameters
  let form_data = {};
  $('form[name="simulation_form"]').serializeArray().forEach(d => {
    form_data[d.name] = d.value;
  });
  ["option_comp_test", "option_self_test", "option_multi_test"].forEach(d => {
    form_data[d] = $("#" + d).val()
  });
  form_data.job_id = $("#job_id_input").val();
  if (!form_data.job_id) {
    alert("Job ID cannot be empty!")
    return
  }
  $.ajax({
    url: "/simulation_launch",
    timeout: 10000,
    type: "POST",
    data: JSON.stringify(form_data),
    contentType: "application/json",
    success: function(out_data) {
      alert("Simulation completed successfully!")
      console.log("Simulation completed successfully!");
      console.log(out_data);
    },
    failure: function() {
      console.log("Server error.");
    },
    error: function ( jqXHR, textStatus, errorThrown) {
      console.log("errorThrown: " + errorThrown
      + " textStatus:" + textStatus);
    }
  })

  // source = new EventSource("/progress");
  // // funciton to cancel the simulation
  // source.onmessage = function(event) {
  //     console.log(event.data);
  //     $('.progress-bar')
  //         .css('width', event.data+'%')
  //         .attr('aria-valuenow', event.data);
  //     $('.progress-bar-label')
  //         .text(event.data+'%');
  //   if (event.data == 100){
  //     console.log("Simulation Complete")
  //     source.close()
  //     // TODO: add event when the simulation is complete
  //     // 1. the progam and user should know the results can be rendered
  //     // 2. the dialog needs to close or update so "cancel" is not shown
  //   }
  // }
  // // $( "#progress_dialog" ).dialog();
  // $("#progress_dialog").dialog({
  //   autoOpen : false,
  //   modal : true,
  //   show : "blind",
  //   hide : "blind",
  // });
  // $("#progress_dialog").dialog("open");
  // ;
}

