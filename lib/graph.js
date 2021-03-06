var fs = require('fs');
var path = require('path');
var config = require('histograph-config');
var request = require('request');
var neo4j = require('neo4j');

if (config.neo4j.user && config.neo4j.password) {
  var neo4jUrl = 'http://' + config.neo4j.user + ':' + config.neo4j.password + '@' +
    config.neo4j.host + ':' + config.neo4j.port;
} else {
  var neo4jUrl = 'http://' + config.neo4j.host + ':' + config.neo4j.port;
}

var graphDb = new neo4j.GraphDatabase(neo4jUrl);

var shortestPathQuery = fs.readFileSync(path.join(__dirname, '..', 'data', 'shortest-path.cypher'), {encoding: 'utf8'});
var relatedQuery = fs.readFileSync(path.join(__dirname, '..', 'data', 'related.cypher'), {encoding: 'utf8'});

function replaceRelations(query, relations) {
  return query.replace('«relations»', relations.map(function(relation) {
    return '`' + relation + '`';
  }).join('|'));
}

exports.shortestPath = function(idsFrom, idsTo, relations, callback) {
  var query = replaceRelations(shortestPathQuery, relations);

  graphDb.cypher({
    query: query,
    params: {
      idsFrom: idsFrom,
      idsTo: idsTo
    }
  }, function(err, results) {
    var ids;
    if (results) {
      ids = results.map(function(result) {
        return result.id;
      });
    }

    callback(err, ids);
  });
};

exports.related = function(ids, relations, direction, callback) {
  var query = replaceRelations(relatedQuery, relations);

  if (direction === 'from') {
    query = query.replace('«directionFrom»', '-').replace('«directionTo»', '->');
  } else if (direction === 'to') {
    query = query.replace('«directionFrom»', '<-').replace('«directionTo»', '-');
  }

  graphDb.cypher({
    query: query,
    params: {
      ids: ids
    }
  }, function(err, results) {
    var ids;
    if (results) {
      ids = results.map(function(result) {
        return result.id;
      });
    }

    callback(err, ids);
  });
};

exports.expand = function(ids, callback) {
  var reqOptions = {
    uri: neo4jUrl + '/histograph/expand',
    method: 'POST',
    json: {
      ids: ids,
      equivalence: config.schemas.equivalence,
      hairs: config.api.hairRelations
    }
  };

  request(reqOptions, function(error, response) {
    if (!error && response.statusCode == 200) {
      try {
        callback(null, response.body);
      } catch (e) {
        callback({
          message: 'Neo4j plugin returned incorrect JSON data'
        });
      }
    } else {
      callback(error);
    }
  });

};
