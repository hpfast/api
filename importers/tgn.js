#!/usr/local/bin/node

var fileNameOut = 'tgn.json';
var source = 'tgn';

var grex = require('grex'),
    argv = require('optimist')
      .usage('Transforms TGN data set into GraphSON format.\nUsage: $0')
      .demand('f')
      .alias('f', 'file')
      .describe('f', 'Load a file')
      .argv
    fs = require('fs'),
    async = require('async'),
    parse = require('csv-parse');

var objectTypeMap = { 
	"inhabited places": "place",
	"national capitals": "place",
	"provincial capitals": "place",
	"cities": "place",
	"island groups": "place",
	"islands (landforms)": "place",
	"villages": "place",
	"towns": "place",
	"regional capitals": "place",
	"capitals (seats of government)": "place",
	
	"polders": "polder",
	
	"canals (waterways)": "waterway",
	"marine channels": "waterway",
	"ponds (water)": "waterway",
	"navigation channels": "waterway",
	"lakes (bodies of water)": "waterway",
	"stream channels": "waterway",
	"inlets": "waterway",
	"rivers": "waterway",
	"tidal watercourses": "waterway",
	"seas": "waterway",
	"sections of watercourses": "waterway",
	"distributaries (streams)": "waterway",
	"bays (bodies of water)": "waterway",
	"channels (bodies of water)": "waterway",
	"channels (water bodies)": "waterway",
	
	"provinces": "province"
};

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true;
        }
    }

    return false;
}

var notUsed = [
	"parks (recreation areas)",
	"docks",
	"ports (settlements)",
	"locales (settlements)",
	"coves (bodies of water)",
	"nature reserves",
	"heaths (landforms)",
	"estates (agricultural)",
	"castles (fortifications)",
	"railroad stations",
	"marshes",
	"forests (cultural landscapes)",
	"points (landforms)",
	"farms",
	"general regions",
	"streams",
	"ruins",
	"first level subdivisions (political entities)",
	"second level subdivisions (political entities)",
	"area (measurement)",
	"bridges (built works)",
	"reservoirs (water distribution structures)",
	"tunnels",
	"dikes",
	"churches (buildings)",
	"landhouses",
	"dunes",
	"straits",
	"locks (hydraulic structures)",
	"dams (hydraulic structures)",
	"flats (landforms)",
	"shoals (landforms)",
	"hills",
	"archaeological sites",
	"forts",
	"lighthouses",
	"beaches",
	"schools (buildings)",
	"banks (landforms)",
	"breakwaters",
	"capes (landforms)",
	"trade centers",
	"museums (buildings)",
	"textile centers",
	"bars (landforms)",
	"concentration camp sites",
	"royal residences",
	"megalithic sites",
	"uplands",
	"anabranches",
	"national parks",
	"palaces",
	"mountains",
	"episcopal sees",
	"battlefields",
	"resorts",
	"oil fields",
	"estuaries",
	"fortified settlements",
	"seaports",
	"naval bases",
	"parts of inhabited places",
	"suburbs",
	"historic sites"
];

var provinceURIs = { // Hard-coded, taken from source file
	"NH": "7006951",
	"NB": "7003624",
	"Ut": "7003627",
	"Ze": "7003635",
	"Fl": "7003615",
	"Gr": "7003613",
	"Ge": "7003619",
	"Fr": "7003616",
	"Li": "7003622",
	"Ov": "7003626",
	"Dr": "7003614",
	"ZH": "7003632"
};

var verticesHeader = '{ "graph": { "mode": "NORMAL", "vertices": ',
		edgesHeader = ', "edges": ',
		footer = '} }';

var usedURIs = [];

// VERTICES
function parseVertices(callback) {
	
	fs.writeFileSync(fileNameOut, verticesHeader);

	parse(fs.readFileSync(argv.file, {encoding: 'utf8'}), {delimiter: ','}, function(err, data) {
	
		console.log("Parsing vertices...");
		
		var vertices = [];

		for (var i=1; i<data.length; i++) { // Skip CSV header -- contents hardcoded
			var obj = data[i];
			var objType = obj[7];
			
			var splitURI = obj[1].split("/");
			var uri = splitURI[splitURI.length - 1];
	
			if (objectTypeMap.hasOwnProperty(objType)) {
				if (!containsObject(uri, usedURIs)) {
		
					var vertex = {};
					var objType = objectTypeMap[obj[7]];
		
					vertex["uri"] = source + /*"/" + objType +*/ "/" + uri;

					vertex["name"] = obj[2];
					vertex["source"] = source;
					vertex["type"] = "hg:" + objType.charAt(0).toUpperCase() + objType.slice(1);				
					vertex["geometry"] = {"type": "Point", "coordinates": [parseFloat(obj[5]), parseFloat(obj[4])]};
					vertex["startDate"] = "";
					vertex["endDate"] = "";
				
					vertices.push(vertex);
					usedURIs.push(uri);
				}
		
			} else if (!containsObject(obj[7], notUsed)) {
				console.log("Property " + obj[7] + " not part of object types map. Skipping...");
			}
		}
		
		fs.appendFileSync(fileNameOut, JSON.stringify(vertices, null, 4));
		callback(null, true);		
		
	});
}

function parseEdges(callback) {
	fs.appendFileSync(fileNameOut, edgesHeader);

	parse(fs.readFileSync(argv.file, {encoding: 'utf8'}), {delimiter: ','}, function(err, data){
		console.log("Parsing province edges...");
		
		var edges = [];
		var edgeCounter = 0;

		for (var i=1; i<data.length; i++) { // Skip CSV header -- contents hardcoded
			var obj = data[i];
			var objType = obj[7];
			
			var splitURI = obj[1].split("/");
			var uri = splitURI[splitURI.length - 1];
	
			if (containsObject(uri, usedURIs)) {
				if (provinceURIs.hasOwnProperty(obj[3])) {
	
					var edge = {};
					var objType = objectTypeMap[obj[7]];
	
					edge["uri"] = source + "/e" + ++edgeCounter;
					edge["_outV"] = source + "/" + uri;
					edge["_inV"] = source + "/" + provinceURIs[obj[3]];
					edge["source"] = source;
					edge["label"] = "hg:liesIn";
					edge["startDate"] = "";
					edge["endDate"] = "";
				
					edges.push(edge);
				}
			}
		}
		
		fs.appendFileSync(fileNameOut, JSON.stringify(edges, null, 4));
		
		callback(null, true);
	});

}

function doneMsg(callback) {
	fs.appendFileSync(fileNameOut, footer);
	console.log("Done!");
	callback(null, true);
}

async.series([
    parseVertices,
    parseEdges,
		doneMsg
  ]
);
