// ---------------------------

// configuration info and initializations
let config = general_config;
config.main_mode = "visualizer";
setup_full_go_canvas(config);
let ss_manhattan_config = ssm_params(height=800,
                                     width=600,
                                     main_mode=config.main_mode)

initialize_ssm_canvas(".plot-canvas",
                      ss_manhattan_config,
                      show_name=true)

$(function() {
  // update the query type to be "Upload" if file is selected
  $(".main-viz").hide();

  $("#highlight_node_select").append($('<option>', {
    value: "query_data",
    text: "query data", // add index
  }));
  // enable files to be uploaded
  $("#input_file_upload").change(function() {
    // console.log("file selected");
    $(".main-viz").hide();
    $("#query_data_type").val("upload");
  });

  // hide the main go panel
   $("#query_data_type").change(function() {
    // console.log("file selected");
    $(".main-viz").hide();
  });

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
    let file_input = $("#input_file_upload").val();

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
    // TODO: remove later
    if (["example1", "example2"].includes(query_type) ){

      // <div >
      //   <button id='export_as_png'>Export Figure as PNG</button>
      //   <button id='export_as_svg'>Export Figure as SVG</button>
      // </div>
      let fname = "subfig_focus_context_gwas";
      d3.select(".data-driven-line").append("button")
        .attr("id", 'export_as_png')
        .text("Export Figure as PNG")
        .on('click', function(){
          save_d3_svg("#full_mirror_display", "png", fname + ".png")
        });

      d3.select(".data-driven-line").append("button")
        .attr("id", 'export_as_svg')
        .text("Export Figure as SVG")
        .on('click', function() {
          save_d3_svg("#full_mirror_display", "svg", fname)
        })
        ;
      d3.select("#export_as_png")
      if (query_type == "example2") {
        $(".main-viz").css("width", "1200px");
        $(".new-node-buttons").css("display", "none");
        // $(".group-text").css("display", "none");
        $(".legend-box").css("display", "none");


        // $(".yaxis").css("display", "none");
        // $(".xaxis").css("display", "none");
        // d3.select(".full-mirror-display")
        //   .selectAll("text")
        //   .attr("font-size", "15px")
        //   ;
        // $(".background-layer").css("display", "none");
      }
      if (query_type == "example1") {
        // show all 9 anchors and use leaf anchors for focus
        $("#spinner_max_num_foc_anchors").val(9);
      } else {
        $("#spinner_max_num_foc_anchors").val(27);
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
          $("#highlight_node_select").val("focus_relatives");

          $("#focus_anchor_type").val("leaf");
          $("#spinner_foc_gap_break").val(20000);
          full_data.general_data.query_data = query_dict;
          // $("#context_anchor_type").val("waypoint"); // handled later
          config.curr_state.QueryAsContext = false;
          $("#view_select").val("depth");
          config.curr_state.View = $("#view_select").val();
          config.curr_state.Highlight =$("#highlight_node_select").val();

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

