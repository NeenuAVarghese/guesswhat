# guesswhat

###Prerequisites
* [nodeJS](https://nodejs.org)
* [Redis](http://redis.io/download) (NoSQL Database)

###Installation
1. `git clone https://github.com/NeenuAVarghese/guesswhat.git`
2. `cd guesswhat`
3. `npm install`

**Note:** these node modules will be installed via [package.json](package.json) by *npm*
- express
- random-js
- redis
- request
- socket.io

###Playing
1. `cd guesswhat`
2. `npm start` *OR* `foreman start` *OR* `nf start`
3. Open web browser to `http://localhost:3000`
4. Repeat _Step 3_, for each client

**Note:** a _Procfile_ is included for [`foreman`](https://github.com/ddollar/foreman) or [`nf`](https://github.com/strongloop/node-foreman)

**Note:** if `redis-server` _and/or_ `node` are not in your `PATH`, then manually run
- `/path/to/redis-server --port 6379`
- `/path/to/node server/server.js`

###Testing
1. Install [csslint](https://www.npmjs.com/package/csslint) (CSS validator)
2. Install [jshint](https://www.npmjs.com/package/jshint) (Javascript validator)
3. Install [tidy](https://github.com/htacg/tidy-html5/tree/master/README) (HTML validator)
4. `npm test`

**Note:** [`validate.sh`](https://github.com/mittman/validate.sh) is [included](scripts/validate.sh) with this project for testing

###Debugging
**Problem:** Redis will not start if port is already in use.

#####Option 1: Kill the process(es)
1. `lsof -i :6379`
2. `kill $(lsof -t -i :6379)`

#####Option 2: Change the port number(s)
```
var httpPort = 3000;
var redisPort = 6379;
```
1. Edit *server/server.js*
2. `redis-server --port <number>`
3. `node server/server.js`

###Licensing
Copyright &copy; 2016

**GuessWhat** is dual licensed under the [MIT](LICENSE) (aka X11) and [GPLv2](COPYING) licenses.
