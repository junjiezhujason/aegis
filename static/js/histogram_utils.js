
function process_summary_data(data, container, config) {

  //parameters
  let margin = config["margins"];
  let width = 700 - margin.left-margin.right;
  let height = 500 - margin.top - margin.bottom;
  let padding = 15;
  let n_layers = 17;

  //scaling
  var scale = d3.scaleLinear();
  //Add svg element
  let svg_root2leaf = container.append("svg")
    .attr("width", width+margin.left+margin.right)
    .attr("height",height+margin.top+margin.bottom)
    ;
  let svg_leaf2root = container.append("svg")
    .attr("width", width+margin.left+margin.right)
    .attr("height",height+margin.top+margin.bottom)
    ;

  let data_depth = [];
  let data_height = [];
  let data_temp = [];

  for (i = 0; i<n_layers; i++){
    data_depth.push(data.depth_histogram[i]);
    data_height.push(data.height_histogram[i]);
    data_temp.push(data.depth_histogram[i]);
    data_temp.push(data.height_histogram[i]);
  }
  //set up scaling
  let xscale = d3.scaleLinear()
    .domain([0,d3.max(data_temp)])
    .range([margin.left,margin.left+width]);

  let yscale = d3.scaleLinear()
    .domain([0,16])
    .range([margin.top,margin.top+height])
    ;
  let bar_bandwidth = (yscale(16)-yscale(0))/16-padding;
  let bar_shift = -0.5;

  // let yscale = d3.scaleLinear()
  //   .domain([0,16])
  //   .range([margin.top+height, margin.top])
  //   ;
  // let bar_bandwidth = (yscale(0)-yscale(16))/16-padding;
  // let bar_shift = 0.5;


  console.log(xscale(1));
  //setup axis
  // define the axis
  let xAxis = d3.axisBottom()
    .scale(xscale)
    .ticks(10)
    ;

  let yAxis = d3.axisLeft()
    .scale(yscale)
    .ticks(17)
    ;

  //Scale by range of data
  //console.log(d3.max(data_depth));
  //x_root2leaf.domain([0, d3.max(data, function(d) { return d.depth_histogram; })]);
  //y_root2leaf.domain(data.map(function(d,i) { return d.depth_histogram; }));

  //Add axis
  console.log(data_height);
  svg_root2leaf.append("g")
    .attr("class","xaxis")
    .call(xAxis)
    .attr("transform","translate(0,"+(height+margin.top+margin.bottom/2)+")")
  ;
  svg_root2leaf.append("g")
    .attr("class","yaxis")
    .call(yAxis)
    .attr("transform","translate(20,0)")
    .append("text")
    .attr("y",height+margin.top+20)
    .attr("x",5)
    .style("font-size","15px")
    .text("Layer")
  ;

  svg_leaf2root.append("g")
    .attr("class","xaxis")
    .call(xAxis)
    .attr("transform","translate(0,"+(height+margin.top+margin.bottom/2)+")")
  ;
  svg_leaf2root.append("g")
    .attr("class","yaxis")
    .call(yAxis)
    .attr("transform","translate(20,0)")
    .append("text")
    .attr("y",height+margin.top+20)
    .attr("x",5)
    .style("font-size","15px")
    .text("Layer")
  ;

  //Add plot name
  svg_root2leaf.append("g")
    .attr("class","plotname")
    .append("text")
    .attr("y",margin.top+20)
    .attr("x",width+margin.left-200)
    .style("font-size","25px")
    .text("Depth (from root)")
  ;

   svg_leaf2root.append("g")
    .attr("class","plotname")
    .append("text")
    .attr("y", margin.top+20)
    .attr("x",width+margin.left-200)
    .style("font-size","25px")
    .text("Height (from leaf)")
  ;


  //Add bar chart for root2leaf
  svg_root2leaf.selectAll("bar")
    .data(data_depth)
    .enter()
    .append("g")
    .attr("class","bars")
    .append("rect")
    .attr("x",function(d,i){return xscale(0)})
    .attr("y",function(d,i){return yscale(i+bar_shift)})
    .attr("width",function(d) {return xscale(d)-xscale(0)})
    .attr("height", bar_bandwidth)
    .attr("fill","black")
    ;

  //Add text
  svg_root2leaf.selectAll(".bars")
    .append("text")
    .text(function(d){return d;})
    .attr("x",function(d,i){
      return xscale(d)+5;
    })
    .attr("y",function(d,i){
      return yscale(i);
    })
    .style("font-size","12px")
    .style("font-family","sans-serif")
  ;

  //Add bar chart for leaf2root
  svg_leaf2root.selectAll("bar")
    .data(data_height)
    .enter()
    .append("g")
    .attr("class","bars")
    .append("rect")
    .attr("x",function(d,i){return xscale(0)})
    .attr("y",function(d,i){return yscale(i+bar_shift)})
    .attr("width",function(d) {return xscale(d)-xscale(0)})
    .attr("height", bar_bandwidth)
    .attr("fill","black")
    ;
  //Add text
  svg_leaf2root.selectAll(".bars")
    .append("text")
    .text(function(d){return d;})
    .attr("x",function(d,i){
      return xscale(d)+5;
    })
    .attr("y",function(d,i){
      return yscale(i);
    })
    .style("font-size","12px")
    .style("font-family","sans-serif")

}
