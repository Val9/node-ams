/*
 * Read json files generated by tracker-server, do preprocessing stuff,
 * recreate or symlink static files if they has changed.
 */

var $ = require('sharedjs'),
    n = require('natives'),
    deps = require('./deps'),
    utils = require('./utils');

/**
 * Default options object
 * @type {Object}
 * @export
 */
exports.options = {
    build: {
        root: null // root of src files
    },
    find: {
        detect: null, // detect deps using static require() parser
        root: null, // path where to look, this.root is default
        pattern: /\.[\w]+$/, // is used if detect is not defined
        filter: null, // is used if detect is not defined
        rec: true, // recursive search
        paths: null // like require.paths to resolve deps
    },
    // processors options
    process: {
        uglifyjs: true,
        cssvendor: true,
        dataimage: true,
        cssimport: true,
        cssabspath: true,
        htmlabspath: true,
        cssmin: true,
        jstransport: true,
        texttransport: true
    },
    // we have to ensure, that processors run in correct order, because f.e.
    // dataimg will not work if abspath with external url was done before
    processorsOrder: [
        'jstransport', 'uglifyjs',
        'cssvendor', 'dataimage', 'cssimport','cssmin', 'cssabspath',
        'htmlabspath', 'texttransport'
    ],
    combine: null // {css: '/path/to/file'}
};

/**
 * Create new build.
 * @param {string} root path to sources root.
 * @constructor
 */
function Build(root) {
    if (!root) {
        throw new Error('root is not defined');
    }
    this._now = Date.now();
    this.options = $.extend(true, {}, exports.options);

     // remove last slash if contained
    this.options.build.root = this.root = root.replace(/\/$/, '');
    this.paths = [root];
    this.data = {};
}

var proto = Build.prototype;

/**
 * Find files.
 * @param {Object} opts exports.options.find.
 * @this Build
 * @return {Build} this.
 */
proto.find = function(opts) {
    var o = this.options.find = $.extend({}, exports.options.find, opts),
        paths;

    if (o.paths) {
        this.paths = this.paths.concat(o.paths);
    }

    if (o.detect) {
        paths = deps.find(o.detect, o.paths);
    } else {
        paths = utils.findSync(o.root || this.root, o.pattern, o.rec);
    }

    paths.forEach(function(path) {
        if ((!o.filter || !o.filter.test(path)) &&
            (!o.pattern || o.pattern.test(path))) {
                this.data[path] = n.fs.readFileSync(path);
            }
    }, this);

    return this;
};

/**
 * Add one file from given path, optionally define the target dir
 * @param {string|Array} path to file.
 * @param {string=} targetDir path to target dir.
 * @this Build
 * @return {Build} this.
 */
proto.add = function add(path, targetDir) {
    var self = this,
        targetPath;

    if (Array.isArray(path)) {
        path.forEach(function(path) {
            add.call(self, path, targetDir);
        });

        return this;
    }

    // path is relative
    if (path.substr(0, 1) !== '/') {
        path = n.path.join(process.cwd(), path);
    }

    if (!targetDir) {
        targetDir = path.substr(0, this.root.length) === this.root ?
            n.path.dirname(path) : this.root;
    } else if (targetDir.substr(0, 1) !== '/') {
        targetDir = n.path.join(process.cwd(), targetDir);
    }

    targetPath = n.path.join(targetDir, n.path.basename(path));

    this.data[targetPath] = n.fs.readFileSync(path);
    return this;
};

/**
 * Run processors on files previously readed.
 * @param {Object|Function} opts exports.options.process
 *     or custom processing function.
 * @this Build
 * @return {Build} this.
 */
proto.process = function(opts) {
    var o, path,
        self = this;

    if (typeof opts === 'function') {
        for (path in this.data) {
            opts.call(
                this,
                path,
                this.data[path].toString('utf-8')
            );
        }

        return this;
    }

    o = $.extend(this.options.process || {}, opts);

    this.options.processorsOrder.forEach(function(name) {
        var path, proc, filter;

        if (!o[name]) {
            return;
        }

        proc = require('./processors/' + name);
        // merge options with processor options
        o[name] = $.extend({}, proc.options, o[name]);
        filter = o[name].filter;

        for (path in self.data) {
            // only process files if they mach processor pattern
            if (o[name].pattern.test(path) &&
                // check if the path should not be filtered
                (!filter || !filter.test(path))) {
                self.data[path] = proc.run.call(
                    self,
                    path,
                    self.data[path].toString('utf-8'),
                    o[name]
                );
            }
        }
    });

    return this;
};


/**
 * Combine files.
 * @param {Object} opts exports.options.combine.
 * @this Build
 * @return {Build} this.
 */
proto.combine = function(opts) {
    var o = $.extend(this.options.combine || {}, opts),
        ext, combinePath, path, regex;

    for (ext in o) {
        combinePath = o[ext];
        regex = new RegExp('\\.' + ext + '$');
        for (path in this.data) {
            if (regex.test(path)) {
                if (typeof this.data[combinePath] !== 'string') {
                    this.data[combinePath] = '';
                }
                this.data[combinePath] += this.data[path] + '\n';
                // delete original file reference, to avoid this
                // file will be included in any further steps again
                delete this.data[path];
            }
        }
    }

    return this;
};

/**
 * Clean up directory
 * @param {string} path to the dir.
 * @this Build
 * @return {Build} this.
 */
proto.cleanup = function(path) {
    utils.rmSync(path);
    return this;
};

/**
 * Write files to disk.
 * @param {string} targetRoot abs. path to target dir.
 * @this Build
 * @return {Build} this.
 */
proto.write = function(targetRoot) {
    var root = this.root,
        path, targetPath, data;

    if (!targetRoot) {
        throw new Error('target dir have to be specified');
    }

    for (path in this.data) {
        // make relative path
        if (path.substr(0, 1) === '/') {
            targetPath = path.replace(root, '');
        } else {
            targetPath = path;
        }

        // make abs path to target file
        targetPath = n.path.join(targetRoot, targetPath);

        utils.mkdirSync(n.path.dirname(targetPath));

        n.fs.writeFileSync(targetPath, this.data[path]);
    }

    return this;
};


/**
 * Show success message
 * @this Build
 * @param {string} msg optional message text.
 * @return {Build} this.
 */
proto.end = function(msg) {
    msg || (msg = 'Build was successfull');
    n.util.log(msg + ', runtime: ' + (Date.now() - this._now) + ' ms.');

    return this;
};

/**
 * Create a new build.
 * @param {string} root path to src root.
 * @return {Build} instance of Build.
 * @export
 */
exports.create = function(root) {
    return new Build(root);
};
