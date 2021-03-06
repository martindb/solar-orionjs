// authored by Dion Mitchell ( danofar@gmail.com )
'use strict';

var request = require('request');

module.exports = init;

function init(options) {
    return new Orion(options);
}

/**
 * Class definition
 * @example
 * var orion = require("solar-orionjs")({
 *      server: "127.0.0.1",
 *      port: 17778,
 *      auth: {
 *          username: "admin",
 *          password: "password"
 *      }
 * });
 */
var Orion = function (options) {
    this.options = options !== undefined ? options : defaultOptions;
}

Orion.prototype.query = query;
Orion.prototype.invoke = invoke;
Orion.prototype.update = update;
Orion.prototype.read = read;
Orion.prototype.create = create;
Orion.prototype.remove = remove;
Orion.prototype.removeBulk = removeBulk;

// module specific functions
Orion.prototype.getOptions = getOptions;
Orion.prototype.setOptions = setOptions;

var defaultOptions = {
    server: "127.0.0.1",
    port: 17778,
    auth: {
        username: "admin",
        password: ""
    }
}

/********************************* */

/**
 * Performs a SWQL query 
 * @param {Object} query - JSON Query object in form of {query:"<query>"} 
 * @param {Function} callback - callback function on return
 * @example
 * orion.query({query:"SELECT NodeID, URI from Orion.Nodes"}, 
 *      function (result){
 *          console.log(result);
 *      });
 * 
 * // Also with the parameter syntax:
 * 
 * orion.query({query:"SELECT NodeID, URI from Orion.Nodes WHERE NodeID = @id", param:{id:5}}, 
 *      function (result){
 *          console.log(result);
 *      }); 
 */
function query(query, callback) {
    request.post(_gfa(this.options).q, _cspr(this.options, query), (err, res, body) => {
        _parseRequestResults(err, res, body, callback);
    });
}

/**
 * Update Orion object
 * @param {Object} update - JSON object of update
 * @param {String} swisUri - the swis URI of the object to be updated
 * @param {Function} callback - callback function on return
 * @example
 * orion.update({Caption:"new node caption"}, 
 *      "swis://hostname/Orion/Orion.Nodes/NodeID=1", 
 *      function (result){
 *          console.log(result);
 *      });
 */
function update(update, swisUri, callback) {
    request.post(_gfa(this.options).fa + swisUri, _cspr(this.options, update), (err, res, body) => {
        _parseRequestResults(err, res, body, callback);
    });
}

/**
 * Read Orion object
 * @param {String} swisUri - the swis URI of the object to be read
 * @param {Function} callback - callback function on return
 * @example
 * orion.read("swis://hostname/Orion/Orion.Nodes/NodeID=1", 
 *      function (result){
 *          console.log(result);
 *      });
 */
function read(swisUri, callback) {
    request.get(_gfa(this.options).fa + swisUri, _cspr(this.options, {}), (err, res, body) => {
        _parseRequestResults(err, res, body, callback);
    });
}

/**
 * Create Orion object
 * @param {Object} data - JSON object of update
 * @param {String} object - the object to be created
 * @param {Function} callback - callback function on return
 */
function create(data, object, callback) {
    request.post(_gfa(this.options).c + orionObject, _cspr(this.options, data), (err, res, body) => {
        _parseRequestResults(err, res, body, callback);
    });
}

/**
 * Performs an Orion verb invoke 
 * @param {String} verb - Verb to invoke, eg Orion.Nodes/Unmanage
 * @param {any[]} data - An array of the data to be passed to Verb 
 * @param {Function} callback - callback function on return
 * @example
 * var now = new Date();
 * var later = new Date();
 * later.setHours(later.getHours() + 3);
 *
 * orion.invoke("Orion.Nodes/Unmanage", [ "N:1", now, later, false ], 
 *    function (result){
 *        console.log(result);
 *    });
 */
function invoke(verb, data, callback) {
    request.post(_gfa(this.options).i + verb, _cspr(this.options, data), (err, res, body) => {
        _parseRequestResults(err, res, body, callback);
    });
}

/**
 * remove Orion object
 * @param {String} swisUri - the swisURI of the object to be removed
 * @param {Function} callback - callback function on return
 */
function remove(swisUri, callback) {
    request.del(_gfa(this.options).fa + swisUri, _cspr(this.options, {}), (err, res, body) => {
        _parseRequestResults(err, res, body, callback);
    });
}

/**
 * Bulk remove Orion objects
 * @param {String[]} swisUris - an array of swisUris representing objects to be deleted
 * @param {Function} callback - callback function on return
 */
function removeBulk(swisUris, callback) {
    request.post(_gfa(this.options).bd, _cspr(this.options, { uris: swisUris }), (err, res, body) => {
        _parseRequestResults(err, res, body, callback);
    });
}

/**
 * Get options
 * @returns {object} options - currently set options
 */
function getOptions() {
    return this.options;
}


/**
 * Set options
 * @param {object} options - JSON object of options to set
 */
function setOptions(options) {
    this.options = options;
}

//// helper functions
var _cspr = function _constructServerPostRequest(options, json) {
    var result = {
        json: json,
        auth: options.auth,
        rejectUnauthorized: false
    }
    return result;
}

var _gfa = function _getFullAddress(options) {
    let fa = `https://${options.server}:${options.port}/SolarWinds/InformationService/v3/Json/`;
    return {
        fa: fa,
        q: fa + 'Query',
        c: fa + 'Create/',
        i: fa + 'Invoke/',
        bd: fa + 'BulkDelete'
    };
}


// universal parsing function for callback results from request action.
function _parseRequestResults(err, res, body, callback) {

    res = res != undefined ? res : {};

    if (!err && res.statusCode == 200) {

        var results;

        // Orion.Query returns results in 'Body.Results' so we need to check this first
        if (body != undefined && body.results) {
            results = body.results.length == 0 ? null : body.results;

            //invoke and create return a result in 'Body'            
        } else if (body != undefined) {
            results = body;

            //otherwise just return the empty results object
        } else {
            results = undefined;
        }

        callback({
            err: undefined,  // error object
            results: results,    // results        
            status: { code: res.statusCode, message: res.statusMessage }  // status code and message
        });

    } else {
        callback({
            err: (err != undefined ? err : body),
            results: undefined,
            status: { code: res.statusCode, message: res.statusMessage }
        });
    }
}