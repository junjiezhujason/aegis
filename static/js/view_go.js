// configuration info and initializations
let config = general_config;
config.main_mode = "visualizer";
let ss_manhattan_config = ssm_params(height=800, width=800,
                                     main_mode=config.main_mode)
setup_full_go_canvas(config);
initialize_ssm_canvas("#viewer_ssm_png", ss_manhattan_config, show_name=true);
initialize_ssm_canvas("#viewer_ssm_svg", ss_manhattan_config, show_name=true);

function query_change_detected() {
  button_icon_change("#upload_request_ontology_button", "change");
  update_query_input_box("#query_list", {});
  $("#query_data_summary").hide();
  $(".context-block").hide();
  $(".view-block").hide();
  $(".focus-block").hide();
}

function read_uploaded_list(input_id, form_id, icon_id) {
  if ($(input_id).val() != "") {
    // https://gist.github.com/kholidfu/a9a0bdfac7b334a5a6b0
    console.log("Uploading data " + input_id + form_id);
    var form_data = new FormData($(form_id)[0]);
    console.log(form_data);
    // debugger;
    $.ajax({
      type: 'POST',
      url: "/upload_view_file",
      data: form_data,
      contentType: false,
      cache: false,
      processData: false,
      success: function(response) {
        // response: {status : "...", terms: [] }
        if (response.status == "success")  {
          console.log('Success fully uploaded data!');
          // interface updates
          button_icon_change(icon_id, "complete");
          $("#general_options_for_upload").show();
          $(".main-ontology-control").prop("disabled", true);
          $("#ontology_selection_data_upload").off().on("change", function() {
            $("#ontology_selection").val($(this).val());
            query_change_detected();
          })
          $("#species_selection_data_upload").off().on("change", function() {
            $("#species_selection").val($(this).val());
            query_change_detected();
          })
          // data storage
          if (input_id == "#input_file_upload_focus") {
            full_data.general_data.uploaded_anchors.focus = response.terms;
          }
          if (input_id == "#input_file_upload_context") {
            full_data.general_data.uploaded_anchors.context = response.terms;
          }
        } else {
          console.log("Something went wrong.")
        }
      },
      beforeSend: function() {
        $("#go_ajax_modal").css("display", "block");
      },
      complete: function() {
        $("#go_ajax_modal").css("display", "none");
      },
    });
  } else {
    alert("No file specified, query data will be empty");
    $("#query_data_type").val("none");
  }
}

$(function() {
  // update the query type to be "Upload" if file is selected
  $("#view-ssm-block").css("display", "inline-block");
  query_change_detected();
  $("#general_options_for_upload").hide();
  $("#highlight_node_select").append($('<option>', {
      value: "query_data",
      text: "query data", // add index
  }));
  // enable files to be uploaded
  $("#input_file_upload_focus").change(function() {
    query_change_detected();
    $("#general_options_for_upload").hide();
    button_icon_change("#focus_data_upload_button", "change");
    full_data.general_data.uploaded_anchors.focus = [];
  });
  $("#input_file_upload_context").change(function() {
    query_change_detected();
    $("#general_options_for_upload").hide();
    button_icon_change("#context_data_upload_button", "change");
    full_data.general_data.uploaded_anchors.context = [];
  });
  $("#focus_data_upload_button").click(function() {
    read_uploaded_list("#input_file_upload_focus",
                       "#upload_file_focus",
                       "#focus_data_upload_button");
  });
  $("#context_data_upload_button").click(function() {
    read_uploaded_list("#input_file_upload_context",
                       "#upload_file_context",
                       "#context_data_upload_button");
  });
  $("#upload_request_ontology_button").click(function() {
    if ((full_data.general_data.uploaded_anchors.focus.length ==0) &
        (full_data.general_data.uploaded_anchors.context.length ==0)) {
      $("#general_options_for_upload").hide();
      alert("Neither focus or context anchors have been uploaded succesfully.")
    } else {
      button_icon_change("#upload_request_ontology_button", "complete");
      $(".main-ontology-control").prop("disabled", true);
      request_main_ontology();
    }
  });
  $("#query_to_navigation").click(function() {
    let qdata = full_data.general_data.query_data;
    if (Object.keys(qdata).length > 0) {
      move_to_next_section("#vizOptions_panel", "#vizOptions",
                           "#vizDynamic_panel", "#vizDynamic")
    } else {
      alert("There were problems with file uploading - please re-try.")
    }
  });
  $("#request_ontology_button").off().on('click', function() {
    $(".view-block").hide();
    $(".focus-block").hide();
    request_main_ontology();
  });
});

