var http = require('http'),
    dot = require('dot');



module.exports = function(log, cache) {
    var opts = {host: 'localhost', port: 8888};

    var server = http.createServer(handler).listen(opts.port, opts.host, function (err) {
        if (err) throw err;
        log.info('Admin UI listening on %s:%s [%d]', opts.host, opts.port, process.pid);
    });


    function handler(req, res) {
        if (req.url === "/_status") {
            status(res, cache);
            return;
        }

        if (req.url === "/favicon.ico") {
            return;
        }
    }

    function status(res, cache) {
        try {
            var templates = dot.process({path: './views'});
            res.writeHead(200, {'Content-Type': 'text/html'});

            res.end(templates.status({cache: cache}));
        } catch (e) {
            console.trace();
            console.log(e.stack);
            console.dir(cache)
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(e.toString());
        }
    }
};