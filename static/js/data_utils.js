function create_reverse_search_map(go_anns, go_data) {
  let reverse_map = {};
  let go_terms = Object.keys(go_anns);
  let key;
  let complete_key;
  go_data.forEach(function(d) {
    complete_key = go_anns[d.cid] + "( "+d.name+" )";
    reverse_map[complete_key] = d.name;
  })
  return reverse_map;
}

function create_name_reverse_map(go_anns) {
  let reverse_map = {};
  let go_terms = Object.keys(go_anns);
  let key;
  let complete_key;

  for (let i =0; i < go_terms.length; i ++ ) {
    complete_key = go_anns[go_terms[i]] + "("+go_terms[i]+")";

    reverse_map[complete_key] = go_terms[i];
  }
  return reverse_map;
}


// TODO REMOVE LATER
function initialize_node_link_in_cntx(in_data, curr_cntx) {
  // retrieve all nodes in the full context
  // let curr_cntx = "full_context";
  let tot_n_nodes = in_data[curr_cntx].length;
  // iteration 1: parse through all nodes to contruct the node data
  let main_nodes = [];
  for (let i = 0; i < tot_n_nodes; i ++) {
    main_nodes.push(
      {
        "id" : in_data[curr_cntx][i].id,
        "name" : in_data[curr_cntx][i].name,
        "queried": in_data[curr_cntx][i].queried,
      }
    );
  }
  let main_links = [];
  for (let i = 0; i < tot_n_nodes; i ++) {
    let children = in_data[curr_cntx][i].children;
    for (let j = 0; j < children.length; j++) {
      // add the children links
      main_links.push(
        { "source" : main_nodes[i],
          "target" : main_nodes[children[j]],
          "name": main_nodes[i].name + "-" + main_nodes[children[j]].name,
        }
      );
    }
  }
  return({"nodes": main_nodes, "links": main_links})
}


function create_go_name_map(go_anns) {
  let go_name_map = {};
  let go_terms = Object.keys(go_anns);
  let key;
  let complete_key;

  for (let i =0; i < go_terms.length; i ++ ) {
    complete_key = go_anns[go_terms[i]] + "("+go_terms[i]+")";

    go_name_map[go_terms[i]] = complete_key;
  }
  return go_name_map;
}

