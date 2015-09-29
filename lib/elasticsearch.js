var config = require('histograph-config');
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: config.elasticsearch.host + ':' + config.elasticsearch.port
});

var pageSize = 50;

function baseQuery() {
  return {
    size: pageSize,
    _source: [
      '_id'
    ],
    query: {
      filtered: {
        filter: {
          bool: {
            must: []
          }
        },
        query: {
          bool: {
            must: []
          }
        }
      }
    }
  };
}

module.exports.searchQuery = function(params) {
  console.log('params are:');
  return function(callback) {
    var index = '*';
    if (params.dataset) {
      index = params.dataset.join(',');
    }

    var query = baseQuery();
    if (!params.expand) {
      query._source = ['*'];
    }

    if (params.name) {
      //searchParam = searchParam + '.analyzed';

      query.query.filtered.query.bool.must.push({
        query_string: {
          query: params.name,
          fields: [
            'name'
          ]
        }
      });
    }

    var id = params.uri || params.id;
    if (id) {
      query.query.filtered.filter.bool.must.push({
        term: {
          _id: id
        }
      });
    }

    if (params.type) {
      query.query.filtered.filter.bool.must.push({
        or: params.type.map(function(type) {
          return {
            type: {
              value: type
            }
          };
        })
      });
    }

    if (params.intersects) {
      query.query.filtered.filter.bool.must.push({
        geo_shape: {
          geometry: {
            shape: params.intersects
          }
        }
      });
    }

    if (params.before) {
      query.query.filtered.query.bool.must.push({
        range: {
          validSince: {
            lte: params.before
          }
        }
      });
    }

    if (params.after) {
      query.query.filtered.query.bool.must.push({
        range: {
          validUntil: {
            gte: params.after
          }
        }
      });
    }

    // TODO:
    // - exact

    client.search({
      index: index,
      body: query
    }).then(function(resp) {
      callback(null, resp.hits.hits.map(function(hit) {
        if (params.expand) {
          return hit._id;
        } else {
          return hit;
        }
      }));
    },

    function(err) {
      callback(err);
    });
  };
};
