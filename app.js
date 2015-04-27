var     http = require('http'),
        url = require('url'),
        path = require('path'),
        mime = require('mime'),
        path = require('path'),
        fs = require('fs'),
        io = require('socket.io');
		
var userArray = new Array();
var sktArray = {};
var scoreArray = {};
var thisGame = {};
// Make a simple fileserver for all of our static content.
// Everything underneath <STATIC DIRECTORY NAME> will be served.
var app = http.createServer(function(req, resp){
        var filename = path.join(__dirname, "static", url.parse(req.url).pathname);
        (fs.exists || path.exists)(filename, function(exists){
                if (exists) {
                        fs.readFile(filename, function(err, data){
                                if (err) {
                                        // File exists but is not readable (permissions issue?)
                                        resp.writeHead(500, {
                                                "Content-Type": "text/plain"
                                        });
                                        resp.write("Internal server error: could not read file");
                                        resp.end();
                                        return;
                                }

                                // File exists and is readable
                                var mimetype = mime.lookup(filename);
                                resp.writeHead(200, {
                                        "Content-Type": mimetype
                                });
                                resp.write(data);
                                resp.end();
                                return;
                        });
                }else{
                        // File does not exist
                        resp.writeHead(404, {
                                "Content-Type": "text/plain"
                        });
                        resp.write("Requested file not found: "+filename);
                        resp.end();
                        return;
                }
        });
});
app.listen(3456);

io.listen(app).sockets.on("connection", function(socket){
        socket.on("letmejoin", function(data){
            console.log("letmejoin: "+data); // log it to the Node.JS output
			if (userArray.indexOf(data)!=-1) {
				socket.emit("nameoccupied", "Username has been occupied");
			}
			else {
				userArray.push(data);
				sktArray[data] = socket;
				if (scoreArray[data] != null) {
					scoreArray[data] = scoreArray[data];
				}
				else {
					scoreArray[data] = 0;
				}
				console.log("sktArray: "+sktArray);
				console.log("userArray: "+ userArray);
				for (var i=0; i< userArray.length; i++) {
					socket.broadcast.emit("someonesaid", {
						name: userArray[i],
						score: scoreArray[userArray[i]],
					});
					socket.emit("someonesaid", {
						name: userArray[i],
						score: scoreArray[userArray[i]],
					});
				}
			}

        });
		
		socket.on("letusstart", function(data){
            console.log("letusstart from: "+data.from);
			console.log("letusstart to: "+data.to);
			socket.opponent = sktArray[data.to];
			thisGame[data.to] = 0;
			thisGame[data.from] = 0;
			console.log("socket opponent: "+socket.opponent);
			socket.opponent.emit("startorno", data);
		});
		
		socket.on("pauseorno", function(data){
            console.log("paused from: "+data);
			socket.emit("pauseit", data);
			socket.opponent.emit("pauseit", data);
		});
		
		socket.on("resumeit", function(data){
			socket.emit("resumeit", data);
			socket.opponent.emit("resumeit", data);
		});
		
		socket.on("startdeny", function(data){
            console.log("startdeny: "+data.message); 
			socket.opponent = sktArray[data.from];
            console.log("startdeny opponent: "+data.from);
			socket.opponent.emit("gamedeny", "game deny");
		});
		
		socket.on("launch", function(data){
			socket.opponent = sktArray[data.from];
            console.log("launch opponent: "+data.from); // log it to the Node.JS output
			socket.opponent.emit("gamestart", data);
			var index = userArray.indexOf(data.from);
			if (index > -1) {
				userArray.splice(index, 1);
			}
			index = userArray.indexOf(data.to);
			if (index > -1) {
				userArray.splice(index, 1);
			}
			for (var i=0; i< userArray.length; i++) {
					socket.broadcast.emit("someonesaid", {
						name: userArray[i],
						score: scoreArray[userArray[i]],
					});
			}
		});
				
		socket.on("reflect", function(data){
			console.log("reflect: "+data); 
			socket.opponent.emit("reflect", data);
		});
		
		socket.on("padmove", function(data){
			socket.opponent.emit("padmove", data.y);
		});
		
		socket.on("misspad", function(data){
			thisGame[data.add] = thisGame[data.add] + 1;
			console.log("misspad: oppo who get point "+data.add); 
			console.log("misspad: point of add "+thisGame[data.add]);
			console.log("misspad: point of me "+thisGame[data.by]);			
			socket.emit("updatescore", {
				name1: data.by,
				name2: data.add,
				score1: thisGame[data.by],
				score2: thisGame[data.add]
			});
			socket.opponent.emit("updatescore", {
				name1: data.by,
				name2: data.add,
				score1: thisGame[data.by],
				score2: thisGame[data.add]
			});
			if (thisGame[data.add] >= 5) {
				scoreArray[data.add] = scoreArray[data.add] + 1;
				socket.emit("loses", "loses");
				userArray.push(data.add);
				socket.opponent.emit("wins", "wins");
				userArray.push(data.by);
				for (var i=0; i< userArray.length; i++) {
					socket.broadcast.emit("someonesaid", {
						name: userArray[i],
						score: scoreArray[userArray[i]],
					});
					socket.emit("someonesaid", {
						name: userArray[i],
						score: scoreArray[userArray[i]],
					});
				}
			}
			else {
				socket.emit("pause", data.by);
				socket.opponent.emit("pause", data.by);
			}
		});
		
		socket.on("sendresume", function(data){
			socket.opponent.emit("resume", data);
		});
		
		socket.on("quitgame", function(data){
			socket.emit("quitgame", data);
			socket.opponent.emit("quitgame", data);
			//sktArray[data.quitter].opponent = null;
			//sktArray[data.toquit].opponent = null;
			userArray.push(data.quitter);
			userArray.push(data.toquit);
			console.log("quit users: "+ userArray);
			for (var i=0; i< userArray.length; i++) {
				socket.broadcast.emit("someonesaid", {
					name: userArray[i],
					score: scoreArray[userArray[i]],
				});
				socket.emit("someonesaid", {
					name: userArray[i],
					score: scoreArray[userArray[i]],
				});
			}
		});
		
		socket.on('disconnect', function () {
			var disconnectindex = -1;
			var disconnectuser;
			for (var i = 0; i < userArray.length; i++) {
				if (sktArray[userArray[i]] == socket) {
					disconnectindex = i;
					delete sktArray[userArray[i]];
					console.log("disconnect: "+ userArray[i]);
					break;
				}
			}
			disconnectuser = userArray[disconnectindex];
			for (j in thisGame) {
				if (sktArray[j] == socket) {
					delete sktArray[j];
					console.log("disconnect: "+ j);
					disconnectuser = j;
					break;
				}
			}
			socket.broadcast.emit("someoneleft", disconnectuser);
			userArray.splice(disconnectindex, 1);
			for (var i=0; i< userArray.length; i++) {
				socket.broadcast.emit("someonesaid", {
					name: userArray[i],
					score: scoreArray[userArray[i]],
				});
			}
        });

});