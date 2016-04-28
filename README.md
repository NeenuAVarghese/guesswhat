# guesswhat

###Prerequisites
* [nodeJS](https://nodejs.org)
* [Redis](http://redis.io/download) (NoSQL Database)

###Installation
1. `git clone https://github.com/NeenuAVarghese/guesswhat.git`
2. `cd guesswhat`
3. `npm install`

###Playing
1. `cd guesswhat`
2. `npm start`
3. Open web browser to `http://localhost:3000`
4. Repeat _Step 3_, for each client

**Note:** if `redis-server` _and/or_ `node` are not in your `PATH`, then manually run
- `/path/to/redis-server --port 6379`
- `/path/to/node server/server.js`

###Testing
1. Install [csslint](https://www.npmjs.com/package/csslint) (CSS validator)
2. Install [jshint](https://www.npmjs.com/package/jshint) (Javascript validator)
3. Install [tidy](https://github.com/htacg/tidy-html5/tree/master/README) (HTML validator)
4. `npm test`
