// ---------------------------

// configuration info and initializations
let config = general_config;
config.main_mode = "visualizer";
// config.curr_state.QueryAsContext = false;
// config.curr_state.QueryAsFocus = false;
config.uploaded_anchors = {"focus": [], "context": []};

setup_full_go_canvas(config);
let ss_manhattan_config = ssm_params(height=800,
                                     width=800,
                                     main_mode=config.main_mode)

initialize_ssm_canvas(".plot-canvas",
                      ss_manhattan_config,
                      show_name=true)

function update_query_input_box(input_id, id_term_map) {
  let list = "";
  for (let id in id_term_map) {
    list += ( id + " - " + id_term_map[id] + "\n");
  }
  $(input_id).val(list);
}

function button_icon_change(button_id, status) {
  let span_id = button_id + " span";
  if (status == "complete") {
    $(button_id).prop("disabled", true);
    $(button_id).switchClass("btn-primary", "btn-success");
    $(span_id).switchClass("glyphicon-refresh", "glyphicon-ok");
  }
  if (status == "change") {
    $(button_id).prop("disabled", false);
    $(button_id).switchClass("btn-success", "btn-primary");
    $(span_id).switchClass("glyphicon-ok", "glyphicon-refresh");
  }
}

function query_change_detected() {
  button_icon_change("#upload_request_ontology_button", "change");
  update_query_input_box("#query_list", {});
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
            config.uploaded_anchors.focus = response.terms;
          }
          if (input_id == "#input_file_upload_context") {
            config.uploaded_anchors.context = response.terms;
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
  $("#general_options_for_upload").hide();
  $("#highlight_node_select").append($('<option>', {
      value: "query_data",
      text: "query data", // add index
  }));

  // enable files to be uploaded
  $("#input_file_upload_focus").change(function() {
    query_change_detected();
    button_icon_change("#focus_data_upload_button", "change");
    config.uploaded_anchors.focus = [];
  });
  $("#input_file_upload_context").change(function() {
    query_change_detected();
    button_icon_change("#context_data_upload_button", "change");
    config.uploaded_anchors.context = [];
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
    button_icon_change("#upload_request_ontology_button", "complete");

    // option changes in the next panel
    $(".main-ontology-control").prop("disabled", true);
    $("#focus_anchor_type").val("leaf");
    let use_list;
    let query_dict = {};
    // uploaded focus anchors rules over context anchors as query data
    if (config.uploaded_anchors.focus.length > 0) {
      use_list = config.uploaded_anchors.focus;
      config.curr_state.Highlight = "query_data";
      $("#highlight_node_select").val("query_data");
      $("#spinner_foc_gap_break").val(20000); // show all the focus nodes
    } else {
      use_list = config.uploaded_anchors.context;
      config.curr_state.Highlight = "query_data"; // TODO: change later
      $("#highlight_node_select").val("query_data"); // TODO: change later
      $("#spinner_foc_gap_break").val(9); // show all only 9 context nodes
    }
    use_list.forEach(query => { query_dict[query] = null; });
    full_data.general_data.query_data = query_dict;
    console.log(query_dict);
    // TODO: move into the request_main_ontology() function
    update_query_input_box("#query_list", query_dict);
    // request_main_ontology();
  });

  $("#query_to_navigation").click(function() {

  });

  // hide the main go panel
  //  $("#query_data_type").change(function() {
  //   // console.log("file selected");
  //   $(".main-viz").hide();
  // });

  // submit the data as an option
  $("#go_use_data_query_button").click(function() {
    config.curr_state.QueryAsContext = false;
    full_data.general_data.query_data = {};

    $(".main-viz").show();
    $(".context-block").hide();
    $(".view-block").hide();
    $(".focus-block").hide();
    $(".main-ontology-control").prop("disabled", false);

    let query_type = $("#query_data_type").val();


    // option 0: default GO exploration
    setup_request_main_ontology(onclick_only=true);

    // option 1: use the uploaded data
    if (query_type == "upload" ) {
      if (file_input != "") {
        // https://gist.github.com/kholidfu/a9a0bdfac7b334a5a6b0
        console.log("Uploading data and creating GO list");
        var form_data = new FormData($('#upload-file')[0]);
        $.ajax({
          type: 'POST',
          url: "/upload_view_file",
          data: form_data,
          contentType: false,
          cache: false,
          processData: false,
          success: function(view_response) {
            console.log('Success fully uploaded data!');
            // TODO: make sure the
            setup_request_main_ontology(onclick_only=true);
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
    // option 2: use the example data
    if (["example1", "example2"].includes(query_type) ){
      if (query_type == "example1") {
        // show all 9 anchors and use leaf anchors for focus
        $("#spinner_max_num_foc_anchors").val(9);
      }
      console.log("Requesting example data " + query_type);
      $.ajax({
        url: "/get_example_query_data",
        timeout: 10000,
        type: "POST",
        data: JSON.stringify({"example_id": query_type}),
        contentType: "application/json",
        success: function(out_data) {
          console.log("Simulation data loaded succesfully!");
          // unpack the data
          let query_dict = out_data["query_term_dict"];
          let ontology = out_data["ontology"];
          let species = out_data["species"];
          // update the correct ontology and species
          $("#ontology_selection").val(ontology);
          $("#species_selection").val(species);
          $(".main-ontology-control").prop("disabled", true);
          // $("#highlight_node_select").val("query_data"); // default view
          $("#highlight_node_select").val("query_data");
          $("#focus_anchor_type").val("leaf");
          $("#spinner_foc_gap_break").val(20000);
          config.curr_state.Highlight = "query_data";
          full_data.general_data.query_data = query_dict;
          // $("#context_anchor_type").val("waypoint"); // handled later
          config.curr_state.QueryAsContext = true;
          // set the query to also be the context anchors
          // use the way-point view instead of the root view
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

  });
});

