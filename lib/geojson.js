var normalizer = require('histograph-uri-normalizer');

// Expand Histograph URNs
function expandURN(id) {
  try {
    id = normalizer.URNtoURL(id);
  } catch (e) {
    // TODO: use function from uri-normalizer
    id = id.replace('urn:hgid:', '');
  }

  return id;
}

// Given an PIT or a hair, expand ID to URN,
// and only allow either ID or URI
function idOrUri(obj) {
  var id = expandURN(obj.id);
  if (obj.uri) {
    obj.uri = id;
    delete obj.id;
  } else {
    obj.id = id;
    delete obj.uri;
  }

  return obj;
}

// Turns output from Histograph Neo4j Plugin into GeoJSON!
module.exports = function(json, query) {
  if (json && json.length > 0) {
    return {
      type: 'FeatureCollection',
      features: json.map(function(concept) {
        var geometries = [];

        concept.forEach(function(p) {
          if (p.pit.geometry) {
            geometries.push(p.pit.geometry);
          }
        });

        var type;
        var geometryIndex = 0;
        var pits = concept.map(function(p) {
          var pit = p.pit;
          type = pit.type;

          if (pit.geometry) {
            pit.geometryIndex = geometryIndex;
            geometryIndex += 1;
          } else {
            pit.geometryIndex = -1;
          }

          delete pit.geometry;

          if (p.hairs && p.hairs.length > 0) {
            pit.hairs = p.hairs.map(idOrUri);
          }

          if (p.relations && p.relations.length > 0) {
            pit.relations = {};
            p.relations.forEach(function(relation) {
              if (!pit.relations[relation.type]) {
                pit.relations[relation.type] = [];
              }

              pit.relations[relation.type].push({
                '@id': expandURN(relation.to)
              });
            });
          }

          pit = idOrUri(pit);

          return pit;
        });

        var geometry;
        if (query.geometry) {
          geometry = {
            type: 'GeometryCollection',
            geometries: geometries
          };
        }

        return {
          type: 'Feature',
          properties: {
            type: type,
            pits: pits
          },
          geometry: geometry
        };
      })
    };
  } else {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }
};
