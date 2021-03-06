// DEFINE VARIABLES
// Define size of map group
// Full world map is 2:1 ratio
// Using 12:5 because we will crop top and bottom of map
var color_normal = "#333";
var color_selected = "#0000ff";

var dealers = [];// distributor info json array.
var json_data = [];//total json datas
w = 3000;
h = 1250;
// variables for catching min and max zoom factors
var minZoom;
var maxZoom;

//for showing tooltip
var div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// DEFINE FUNCTIONS/OBJECTS
// Define map projection
var projection = d3
  .geoEquirectangular()
  .center([0, 15]) // set centre to further North as we are cropping more off bottom of map
  .scale([w / (2 * Math.PI)]) // scale to fit group width
  .translate([w / 2, h / 2]); // ensure centred in group  

// Define map path
var path = d3
  .geoPath()
  .projection(projection);

// Create function to apply zoom to countriesGroup
function zoomed() {
  t = d3
    .event
    .transform;

  countriesGroup
    .transition()
    .attr("transform", "translate(" + [t.x, t.y] + ")scale(" + t.k + ")");
}

// Define map zoom behaviour
var zoom = d3
  .zoom()
  .on("zoom", zoomed);

// Function that calculates zoom/pan limits and sets zoom to default value 
function initiateZoom() {
  // Define a "minzoom" whereby the "Countries" is as small possible without leaving white space at top/bottom or sides
  minZoom = Math.max($("#map-holder").width() / w, $("#map-holder").height() / h);
  // set max zoom to a suitable factor of this value
  maxZoom = 20 * minZoom;
  // set extent of zoom to chosen values
  // set translate extent so that panning can't cause map to move out of viewport
  zoom
    .scaleExtent([minZoom, maxZoom])
    .translateExtent([[0, 0], [w, h]]);
  // define X and Y offset for centre of map to be shown in centre of holder
  midX = ($("#map-holder").width() - minZoom * w) / 2;
  midY = ($("#map-holder").height() - minZoom * h) / 2;
  // change zoom transform to min zoom and centre offsets
  svg.call(zoom.transform, d3.zoomIdentity.translate(midX, midY).scale(minZoom));
}

// zoom to show a bounding box, with optional additional padding as percentage of box size
function boxZoom(box, centroid, paddingPerc) {
  minXY = box[0];
  maxXY = box[1];
  // find size of map area defined
  zoomWidth = Math.abs(minXY[0] - maxXY[0]);
  zoomHeight = Math.abs(minXY[1] - maxXY[1]);
  // find midpoint of map area defined
  zoomMidX = centroid[0];
  zoomMidY = centroid[1];
  // increase map area to include padding
  zoomWidth = zoomWidth * (1 + paddingPerc / 100);
  zoomHeight = zoomHeight * (1 + paddingPerc / 100);
  // find scale required for area to fill svg
  maxXscale = $("svg").width() / zoomWidth;
  maxYscale = $("svg").height() / zoomHeight;
  zoomScale = Math.min(maxXscale, maxYscale);
  // handle some edge cases
  // limit to max zoom (handles tiny countries)
  zoomScale = Math.min(zoomScale, maxZoom);
  // limit to min zoom (handles large countries and countries that span the date line)
  zoomScale = Math.max(zoomScale, minZoom);
  // Find screen pixel equivalent once scaled
  offsetX = zoomScale * zoomMidX;
  offsetY = zoomScale * zoomMidY;
  // Find offset to centre, making sure no gap at left or top of holder
  dleft = Math.min(0, $("svg").width() / 2 - offsetX);
  dtop = Math.min(0, $("svg").height() / 2 - offsetY);
  // Make sure no gap at bottom or right of holder
  dleft = Math.max($("svg").width() - w * zoomScale, dleft);
  dtop = Math.max($("svg").height() - h * zoomScale, dtop);
  // set zoom
  svg
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(dleft, dtop).scale(zoomScale)
    );
}

// on window resize
$(window).resize(function () {
  // Resize SVG
  // console.log($("#map-holder").width() + ":" + $("#map-holder").height())
  svg
    .attr("width", $("#map-holder").width())
    .attr("height", $("#map-holder").height());
  initiateZoom();
});

// create an SVG
var svg = d3
  .select("#map-holder")
  .append("svg")
  // set to the same size as the "map-holder" div
  .attr("width", $("#map-holder").width())
  .attr("height", $("#map-holder").height())
  // add zoom functionality
  .call(zoom);


// get map data
d3.json(
  "./json/custom50.json",
  function (json) {
    json_data = json;
    //Bind data and create one path per GeoJSON feature
    countriesGroup = svg.append("g").attr("id", "map");
    // add a background rectangle
    countriesGroup
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", w)
      .attr("height", h);

    // draw a path for each feature/country
    countries = countriesGroup
      .selectAll("path")
      .data(json_data.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("id", function (d, i) {
        return "country" + d.properties.iso_a3;
      })
      .attr("class", "country")
      .style("opacity", 0.7)
      // add a mouseover action to show name label for feature/country
      .on("mouseover", function (d, i) {
        d3.select(this).transition().style("opacity", 1);
        d3.select(this).style("cursor", "pointer");

        div.transition()
          .duration(200)
          .style("opacity", 0.9);
          
        // console.log(path.bounds(d))
        // console.log(d3/event.pagex)
        div.html(d.properties.formal_en)
          .style("left", (d3.event.pageX) + 30/1 + "px")
          .style("top", (d3.event.pageY) + "px");
      })
      .on("mouseout", function (d, i) {
        d3.select(this).transition().style("opacity", 0.7);
        div.transition()
          .duration(2000)
          .style("opacity", 0);
      })
      // add an onclick action to zoom into clicked country
      .on("click", function (d, i) {
        show_info(d.properties.iso_n3);
        d3.selectAll(".country")
          .style("fill", color_normal)

        d3.select(this).transition().style("fill", color_selected);
        boxZoom(path.bounds(d), path.centroid(d), 100);
      });
    initiateZoom();
  }
);
//show information 
var selected_dealer;
function show_info(country_id) {

  //show company informations per country
  selected_dealer = dealers.filter(ag => ag.id == country_id);
  if (selected_dealer.length > 0) {// if there is any matched company         
    selected_dealer = selected_dealer[0];
  } else {
    selected_dealer = dealers[0];
  }
  $(".company-name").text(selected_dealer.company_name);
  $(".distor-name").text('Distributor for ' + selected_dealer.country);
  $(".country-name").text(selected_dealer.country);
  // $("#description").text(selected.description);
  // $("#contact-company").text("Contact");
  $(".phone-number").css("display","none");
  var call_number = selected_dealer.phone != '' ? selected_dealer.phone : selected_dealer.tel;
  $(".call-partner").text(call_number);
  // $("#visit-partner").text("Visit");
}
//handler for phone number
// $('.call-partner').on('click', function () {
//   if($(".phone-number").css("display") == "none"){
//     var call_number = selected_dealer.phone != '' ? selected_dealer.phone : selected_dealer.tel;
//     $(".phone-number").css("display","flex");
//     $(".phone-number").text(call_number);
//   }else{
//     $(".phone-number").css("display", "none")
//   }
// });

//handler for zoom home/in/out
$('.zoom-home').on('click', function () {
  initiateZoom();
});
$('.zoom-in').on('click', function () {
  zoom.scaleBy(d3.select("svg"), 1.2);
});
$('.zoom-out').on('click', function () {
  zoom.scaleBy(d3.select("svg"), 0.8);
});

//setting for select
$(document).ready(function () {

  jQuery.ajax({
    dataType: "json",
    url: "json/dealer.json",
    async: false,
    success: function (data) { dealers = data; }
  });

  //show international distributor
  show_info();

  var data = $.map(dealers, function (obj) {
    obj.id = obj.id; // replace id with your identifier
    obj.text = obj.text || obj.country;
    return obj;
  });
  $('.distor-selector').select2({
    theme: "classic",
    placeholder: "Select destination",
    allowClear: true,
    data: data
  });
  $('.distor-selector').on('select2:select', function (e) {
    var data = e.params.data;
    d3.selectAll(".country").style("fill", color_normal);
    d3.selectAll(".country").filter(d => d.properties.iso_n3 == data.id).style("fill", color_selected);
    var j_node = json_data.features.filter(jd => jd.properties.iso_n3 == data.id)[0];
    boxZoom(path.bounds(j_node), path.centroid(j_node), 20);
    show_info(j_node.properties.iso_n3);
  });
});