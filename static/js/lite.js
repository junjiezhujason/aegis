// data-handling for rendering
// -----------------------------------------------------------------------------
// global variables (TODO: handle in the future)
let config = general_config;
config.main_mode = "lite";
setup_full_go_canvas(config);

$(function() {
  // application-specific parameters
  // setup data related to initialization
  // core adjax call to request ontology data
  $("#context_anchors").hide();
  $("#context_options").hide();
  $("#general_options").hide();
  $(".view-block").show();
  $(".focus-block").show();
  console.log("Requesting General and Context Data...");
  let pathname = window.location.pathname
  let page_id = pathname.substring(pathname.lastIndexOf("/") + 1);
  config.access_dag = page_id

  // view-go-like options setup
  if (page_id == "exp_gwas" | page_id == "exp_chip") {
    $("#highlight_node_select").append($('<option>', {
      value: "query_data",
      text: "query data", // add index
    }));
    $("#highlight_node_select").val("query_data");
    $("#focus_anchor_type").val("leaf");
    $("#spinner_foc_gap_break").val(20000);
    config.curr_state.Highlight = "query_data";
    config.curr_state.QueryAsContext = true;
    if (page_id == "exp_chip") {
      // show all 9 anchors and use leaf anchors for focus
      $("#spinner_max_num_foc_anchors").val(9);
    } else {
      $("#spinner_max_num_foc_anchors").val(29);
    }
  } else {
    $("#highlight_node_select").val("fcus_ancs");
    config.curr_state.Highlight = "fcus_ancs";
    $("#spinner_max_num_foc_anchors").val(10);
  }
  // simulaiton-setup like options setup


  // $("#context_anchor_type").val("waypoint"); // handled later
  initialize_gene_tagit();
  request_general_and_context_info();
})

function request_general_and_context_info(page_id) {
  $.ajax({
    url: "/lite/request_general_and_context_info",
    timeout: 100000,
    type: "POST",
    data: JSON.stringify({"page_id": config.access_dag}),
    contentType: "application/json",
    success: function(all_data) {
      // console.log(general_data);
      // once the data is loaded successfully
      // propagate the autocomplete for context search
      // unpack the data here
      let summary_info = all_data.summary_info
      let general_data = all_data.general_info
      let context_data = all_data.context_info
      let general_vars = ["go_gene_cnt",
                          "ontology_root_id",
                          "search_dict",
                          "query_data"]
      general_vars.forEach(v => {
        full_data.general_data[v] = general_data[v];
      });
      context_data = reformat_context_data(context_data);
      full_data.context_data = context_data;
      // full_data.summary_info = summary_info;
      $("#dat_name").val(summary_info["caption"]);
      $("#ont_name").val(summary_info["ontology"]);
      $("#spe_name").val(summary_info["species"]);
      $("#anc_type").val(context_data["anchor_rule"]);
      let list = "";
      let list_data = context_data["anchors"];
      for (let id in list_data) {
        let term = list_data[id];
        let anns = context_data.go_anns[context_data.name_id_map[term]];
        list += ( term + " - " + anns + "\n");
      }
      $("#anc_list").val(list);
      // update the label
      let num_anchors = list_data.length;
      $("#anc_list_lab").text("Context Anchors (" + num_anchors +"):");
      // console.log(full_data);
      // console.log(summary_info);
      setup_focus_request();
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

