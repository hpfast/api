var util = require('util');
var context = require('../data/jsonldContext.json');

var dateIntersect = function(start, end, range) {


}

module.exports = function(geojson, query) {
  // TODO: kijk in query[hg:before] en query[hg:after] en query[source]
  // als die er zijn, filter pits uit geojson met filter op datum, en bron
  // geojson.features.filter(function(feature) { return featur}) maar dan op feature.properties.pits
  filtered = geojson.features.filter(function(feature) {
    return feature.properties.pits.source == query[source] || dateIntersect(feature.properties.pits.start, feature.properties.pits.end, [query[hg:before],query[hg:after]]);
  }

  return filtered;
};
