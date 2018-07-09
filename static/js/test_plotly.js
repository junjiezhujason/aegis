
function create_base_example(container) {
  let pd3 = Plotly.d3;
  let N = 40;
  let x = pd3.range(N);
  let y = pd3.range(N).map( pd3.random.normal() );
  let data = [ { x:x, y:y } ];
  let layout = { title:'Click-drag to zoom' };
  Plotly.plot(container, data, layout);
  container.on('plotly_relayout',
      function(eventdata){
          alert( 'ZOOM!' + '\n\n' +
              'Event data:' + '\n' +
               JSON.stringify(eventdata) + '\n\n' +
              'x-axis start:' + eventdata['xaxis.range[0]'] + '\n' +
              'x-axis end:' + eventdata['xaxis.range[1]'] );
      });
}

function update_slider(container, config) {

  let dummy_data = [{
    x: [1, 2, 3],
    y: [2, 1, 3],
    line: {
      color: 'red',
      simplify: false,
    }
  }];

  let new_laytout = {
     sliders: [
      setup_plotly_single_slider("Case",  config),
      setup_plotly_single_slider("Trial", config),
    ],
    //    updatemenus: [{
    //      type: 'buttons',
    //      showactive: false,
    //      x: 0.05,
    //      y: 0,
    //      xanchor: 'right',
    //      yanchor: 'top',
    //      direction: 'left',
    //      pad: {t: 60, r: 20},
    //      buttons: [{
    //        label: 'Play',
    //        method: 'update',
    //        args: [null, {
    //          fromcurrent: true,
    //          frame: {redraw: false, duration: 1000},
    //          transition: {duration: 500}
    //        }]
    //      }, {
    //        label: 'Pause',
    //        method: 'animate',
    //        args: [[null], {
    //          mode: 'immediate',
    //          frame: {redraw: false, duration: 0}
    //        }]
    //      }]
    //    }]
  };

  Plotly.relayout(container, new_laytout);

}

function create_slider_example(container, config) {

  let init_data = [{
    x: [1, 2, 3],
    y: [2, 1, 3],
    line: {
      color: 'red',
      simplify: false,
    }
  }];
  // we set the the options are combinatorial,
  // so the frames should be combinatorially defined
  let init_layout = {
    sliders: [
      setup_plotly_single_slider("Case",  config),
      setup_plotly_single_slider("Trial", config),
    ],
    //    updatemenus: [{
    //      type: 'buttons',
    //      showactive: false,
    //      x: 0.05,
    //      y: 0,
    //      xanchor: 'right',
    //      yanchor: 'top',
    //      direction: 'left',
    //      pad: {t: 60, r: 20},
    //      buttons: [{
    //        label: 'Play',
    //        method: 'update',
    //        args: [null, {
    //          fromcurrent: true,
    //          frame: {redraw: false, duration: 1000},
    //          transition: {duration: 500}
    //        }]
    //      }, {
    //        label: 'Pause',
    //        method: 'animate',
    //        args: [[null], {
    //          mode: 'immediate',
    //          frame: {redraw: false, duration: 0}
    //        }]
    //      }]
    //    }]
  };

 // The slider itself does not contain any notion of timing, so animating a slider
 // must be accomplished through a sequence of frames. Here we'll change the color
 // and the data of a single trace:
  var frames = [
    {
     name: 'c0',
     data: [{
       'line.color': 'red'
     }]
    }, {
     name: 'c1',
     data: [{
       'line.color': 'green'
     }]
    }, {
     name: 'c2',
     data: [{
       'line.color': 'blue'
     }]
    },
    {
     name: 's0',
     data: [{
       y: [1, 2, 3],
       // 'line.color': 'red'
     }]
    }, {
      name: 's1',
      data: [{
        y: [2, 3, 1],
         // 'line.color': 'green'
      }]
    }
  ];

  Plotly.plot(container, {
    data: init_data,
    layout: init_layout,
    frames: frames,
  });

}

//Plotly.newPlot('graph', data, layout);
