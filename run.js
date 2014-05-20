var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs");

exports.init = function (base, port) {
    base = base || process.cwd;
    port = port || 1337;
    http.createServer(function (request, response) {
        
        var root = "/",
            uri = root + url.parse(request.url).pathname,
            filename = path.join(base(), uri),
            errorHandler = function (error, code) {
                response.writeHead(code, {"Content-Type": "text/plain"});
                response.write(code + " \n" + error + " \n");
                response.end();
                return;
            };
        console.log(filename);
        
        path.exists(filename, function(exists) {
            if(!exists) {
                errorHandler("Not Found", 404)
                return;
            }

            if (fs.statSync(filename).isDirectory()) {
                filename += "/index.html";
            }

            fs.readFile(filename, "binary", function(error, file) {
                if (error) {
                    errorHandler(error, 500)
                    return;
                }

                response.writeHead(200);
                response.write(file, "binary");
                response.end();
            });
        });
    }).listen(parseInt(port, 10), "127.0.0.1");

    console.log("Static file server running at\n  => http://127.0.0.1:" + port + "/\nCTRL + C to shutdown");
};

exports.init();