# guesswhat

###Prerequisites
* [nodeJS](https://nodejs.org)
* [Redis](http://redis.io/download) (NoSQL Database)

###Installation
1. `git clone https://github.com/NeenuAVarghese/guesswhat.git`
2. `cd guesswhat`
3. `npm install`

**Note:** these node modules will be installed via [package.json](package.json) by [*npm*](https://github.com/npm/npm)
- [express](https://www.npmjs.com/package/express)
- [multimap](https://www.npmjs.com/package/multimap)
- [nconf](https://www.npmjs.com/package/nconf)
- [random-js](https://www.npmjs.com/package/random-js)
- [redis](https://www.npmjs.com/package/redis)
- [request](https://www.npmjs.com/package/request)
- [socket.io](https://www.npmjs.com/package/socket.io)
- [xss-filters](https://www.npmjs.com/package/xss-filters)

###Playing
1. `cd guesswhat`
2. `npm start` *OR* `foreman start` *OR* `nf start`
3. Open web browser to [`http://localhost:3000`](http://localhost:3000)
4. Repeat **Step 3**, for each client

**Note:** a _Procfile_ is included for [`foreman`](https://github.com/ddollar/foreman) *or* [`nf`](https://github.com/strongloop/node-foreman)

**Note:** if `redis-server` _and/or_ `node` are not in your `PATH`, then manually run
- `/path/to/redis-server`
- `/path/to/node server/server.js`

###Testing
1. Install [csslint](https://www.npmjs.com/package/csslint) (CSS validator)
2. Install [jshint](https://www.npmjs.com/package/jshint) (Javascript validator)
3. Install [tidy](https://github.com/htacg/tidy-html5/tree/master/README) (HTML validator)
4. `npm test`

**Note:** [`validate.sh`](https://github.com/mittman/validate.sh) is [included](scripts/validate.sh) with this project for testing

###Debugging
**Problem:** Express will not start if port is already in use.

**Option 1:** Add a `config.json` file
```
{
    "httpPort": 8080
    "redisPort": 7777
}
```

**Option 2:** Temporarily change the port number

1. `redis-server`
2. `node server/server.js --httpPort <number>`

**Problem:** Redis will not start if port is already in use.

**Option 1:** Kill the process(es)

1. `lsof -i :6379`
2. `kill $(lsof -t -i :6379)`

**Option 2:** Temporarily change the port number

1. `redis-server --port <number>`
2. `node server/server.js --redisPort <number>`

**Problem:** Redis DB has junk data

**Option 1:** Set an environmental variable
```
export purgeDB=true
```

**Option 2:** Use CLI interface

1. `redis-server`
2. `redis-cli flushdb`

**Problem:** API for socket.io has changed

**Option 1:** Print all properties of object "guesswhat"
```
console.log("====> DEBUG", Object.getOwnPropertyNames(guesswhat));
```

**Option 2:** Enable verbose debugging in nodejs
```
DEBUG=socket.io-parser node server/server.js
```

### Client-side libraries
- [Bootstrap](http://getbootstrap.com) - grid layout
- [Font Awesome](https://fortawesome.github.io/Font-Awesome/) - icon font
- [jQuery](https://jquery.com) - simplify ~~life~~ Javascript
- [Knockout](http://knockoutjs.com) - observe user typing with MVVM
- [LiveStamp](https://mattbradley.github.io/livestampjs/) - auto-update elapsed times in chat
- [Moment](http://momentjs.com/) - convert UNIX timestamps to human-readable
- [Montserrat](https://www.google.com/fonts/specimen/Montserrat) - web font
- [xss-filters](https://github.com/yahoo/xss-filters) - sanitize user input

###Licensing
Copyright &copy; 2016

**GuessWhat** is dual licensed under the [MIT](LICENSE) (aka X11) and [GPLv2](COPYING) licenses.
