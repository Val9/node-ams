## About
node-ams - asset management system for nodejs. The goal is to have a system for 
dependencies management, preprocessing and serving static files which is 
flexible, powerfull and scalable at the same time. 
It is built for massive websites where dependencies management and performance in the 
client are really important.

Auto dependencies management means you don't have to configurate each file to be loaded
in the client. You just write your commonjs modules same way like server side in nodejs.

## What is ams?

- very flexible build tool
- dependecies detector with purpose to combine files
- easy extendable preprocessing framework
- enables you to write your js code for client at the same way like for the nodejs server
- it is static file server


## Features
- Expressive API
- Find your files
  - static dependencies detection (looks for commonjs 'require' calls)
  - finder using regexp
- process
  - minify js (using uglifyjs)
  - minify css (using cssmin from yahoo)
  - wrap js with commonjs module definition string (requirejs compatible) for transport
  - add vendor css prefixes (-o, -ms, -moz, -webkit)
  - inline small images in css using base64 data encoding
  - combine css files using @import declaration
  - add host to background image paths and external css (@import), to load it from cdn
  - add your own preprocessor ...
- combine 
- write to disk 
- serve (uses connect)
  - caching (server and client)
  - cache invalidation (server and client)
  - setting correct response headers
  - serving files

## API

### require ams
	
	var ams = require('ams');
	
### build tool

#### ams.build.create(root)
Create a build instance from passed root path. Returns build Instance.
Instance properties are:

- `this.root` - passed path to the src dir. 
- `this.options` - current options object, contains all options for all methods. 
- `this.paths` - like require.paths. 
- `this.data` - key/value hash of path/contents

Example:
	var build = ams.build.create('/path/to/src');

#### Build#find(options)
Find files to be added to the build instance. Returns build Instance.

Defaults are:

	{
        detect: null, // path to the file, where static 'require' dependencies tracking should start from, 
        pattern: /\.[\w]+$/, // regexp to match files, is used if detect is not defined
        filter: null, // regexp to filter files, is used if detect is not defined
        rec: true, // recursive search, is used if detect is not defined
        paths: null // like require.paths to resolve deps
    }

Example:

	build.find();


#### Build#add(path, [targetDir]);
Add one file from given path, optionally define the target dir. Returns build Instance.

Example:

	build.add('/path/to/file');

#### Build#process(options)
Run processors over files previously added to the build instance. Returns build Instance.

Defaults are:
    {
        uglifyjs: true,
        cssvendor: true,
        cssdataimg: true,
        cssimport: true,
        cssabspath: true,
        htmlabspath: true,
        cssmin: true,
        jstransport: true,
        texttransport: true
    }

You can turn off any processor, add your own or set any options for every processor.

Example:

	build.process({
		uglifyjs: false,
		cssabspath: {
			host: 'http://localhost:8888'
		}
	})

If options is a function, it will be called for each file and act like a custom preprocessor.

Example:

	build.process(function(path, data) {
		// `poth` is path to the file
		// `data` is contents of the file
		// `this` is reference to build instance
	});

#### Build#combine(options)
Combine all files of current build instance to one, of caurse without to mix css and js etc. Returns build Instance.

Example:
	build.combine({
		js: 'main.js',
		css: 'main.css'
	});

#### Build#cleanup(dir)
Remove all files and dirs from given dir. Returns build Instance.

Example:
	build.cleanup('/path/to/dir');


#### Build.write(dir)
Write proccessed files to disk in passed dir. Returns build Instance.

Example:
	build.write('/path/to/public/dir');

#### Build.end([message])
Write a success message to stdout, pass a message string optionally. Returns build Instance.	


## Installation
	npm install ams
	  