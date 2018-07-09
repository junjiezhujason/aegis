
//  TODO: remove later
function create_query_prompt(container) {
  let query_prompt = container.append("div")
    .attr("class","query_prompt")
    .style("white-space", "nowrap")
    .style("position", "absolute")
    ;

  query_prompt
    .append("p")
    .text("New focus graph queries: ")
    .style("position", "relative")
    // .style("width", query_name_len + "px")
    .style("display", "inline-block")
    .style("vertical-align", "top")
    ;

   let input_box = query_prompt.append("div")
    .attr("height","auto")
    .attr("id","input_box")
    // .style("width","590px")
    .style("position", "relative")
    .style("display", "inline-block")
    .style("margin-left", "10px")
    ;

  input_box.append("input")
    .attr("id","query_list")
    .attr("multiple","multiple")
    .attr("size",50)
    ;

  query_prompt.append("div")
    .attr("height","auto")
    .style("position", "relative")
    .style("width","10px")
    .style("display", "inline-block")
    ;

  let submit_box = query_prompt.append("div")
    .attr("height","auto")
    .style("position", "relative")
    .style("display", "inline-block")
    .style("width","30px")
    .style("vertical-align", "top")
    // .style("left", "510px")
    ;

  submit_box.append("input")
    .attr("id","submit_query")
    .attr("type","submit")
    .attr("value","Submit")
    // .style("font-size","16px")
    // .style("font-family","Arial")
    .style("background","white")
    .style("vertical-align", "top")
    ;

}

function create_query_div(container){
  let query_name_len = 130;

  container.append("div")
    .attr("class","curr_query")
    .style("height", "30px")
    .append("p")
    .text("Current queries: ")
    .style("width", query_name_len + "px")
    .style("display", "inline-block")
    ;

  // container.call(create_query_prompt);
}

function create_search_bars(container) {
  let inputid_div = container.append("div")
    .attr("class", "column")
    .attr("id", "search_goterm")
    .style("display", "inline-block")
    .style("width", full_fixed_width+ "px")
    .style("left", 0)
    .style("height", 100 + "px") // TODO: change to auto later
    .style("background", "lightblue")

  inputid_div.append("p")
    .style("display", "inline-block")
    .text("GO term search:")
    ;
  inputid_div.append("input")
    .style("display", "inline-block")
    .attr("id","inputID")
    .attr("size",40)
    ;
}

//this function counts how many number in each layer for each category
function initialize_level_count(level_map, max_val){
  let level_count = {};

  let v = Object.values(level_map);
  for (var i = 0; i < v.length; i++) {
    if(!(v[i] in level_count)){
      level_count[v[i]] = {"queried":0, "total":0,"selected": 0};
    }
    level_count[v[i]]["total"] += 1;
  }
  return level_count;
}

function update_level_count(level_map, reverse_map, max_level, level_count, data){

  for(i=0; i<=max_level;i++){
    level_count[i]["queried"]=0;
    level_count[i]["selected"]=0;
  }

  console.log(level_map[reverse_map[data[1]]])

  for (var i = 0; i < data.length; i++) {


    console.log(reverse_map[data[i]]);
    level_count[level_map[reverse_map[data[i]]]]["queried"] += 1;
  }
  console.log(level_count);

  return level_count;
}





