Ext.DomHelper.useDom = true; // prevent XSS
var socket = io.connect(window.location.origin);
var currentuser;
var opponent;
var currentscore = 0;
var opposcore = 0;
var userList = new Array();

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById("join").addEventListener("click", 
	function(){
		if (currentuser == null) {
			currentuser = document.getElementById("username").value;
			currentuser = htmlEntities(currentuser);
			socket.emit("letmejoin", currentuser);
		}
		else {
			alert("You have joined!");
		}
});

document.getElementById("ps").addEventListener("click", 
	function(){
		if (currentuser != null && opponent != null && pong.ready()) {
			socket.emit("pauseorno", currentuser);
		}
	});

socket.on("pauseit", function(data){
	pong.pauseOrResumeGame();
	if (currentuser == data) {
	//data = person who paused
		if (confirm("Resume?")) {
			socket.emit("resumeit", data);
		}
		else {
			socket.emit("quitgame", {
					quitter: currentuser,
					toquit: opponent
			});
		}
	}
});

socket.on("resumeit", function(data){
	pong.pauseOrResumeGame();
});

socket.on("nameoccupied", function(data){
	currentuser = null;
	alert(data);
});

socket.on("someonesaid", function(data){
	if (data.name != currentuser && userList.indexOf(data.name) == -1 ) {
		var others = document.getElementById("others");
		var newE = document.createElement("dt");
		newE.setAttribute("name", "other");
		newE.appendChild(document.createTextNode(data.name));
		userList.push(data.name);
		var newED = document.createElement("dd");
		newED.setAttribute("nameDes", "otherDes");
		newED.appendChild(document.createTextNode("Total game won: " + data.score));
		others.appendChild(newE);
		others.appendChild(newED);
		
		newE.addEventListener("click", function() {
			if (currentuser != null) {
				opponent = this.innerText;
				socket.emit("letusstart", {
					from: currentuser,
					to: opponent
				});
			} else {
				alert("enter your name first");
			}
		});
	};
});

socket.on("someoneleft", function(data){
	if (data == opponent) {
		document.getElementById("gameContainer").style.display = "none";
	}
	var others = document.getElementById("others");
		while (others.firstChild) {
			others.removeChild(others.firstChild);
	}
	userList = new Array();
});

socket.on("gamedeny", function(data){
	opponent = null;
});

socket.on("startorno", function(data){
	var con = confirm("start game?");
	if( con == true ){
		opponent = data.from;
		var others = document.getElementById("others");
		while (others.firstChild) {
			others.removeChild(others.firstChild);
		}
		userList = new Array();
		var initAngle = -60 + 120*Math.random();
		var initDirection = Math.random() < 0.5 ? -1 : 1;
		document.getElementById("gameContainer").style.display = "block";
		pong.init();
		pong.resetBall();
		pong.launch(initAngle, initDirection);
		socket.emit("launch", {
			from: data.from,
			to: data.to,
			angle: initAngle,
			direction: (-1)*initDirection
		});
		return true;
	}
	else{
		socket.emit("startdeny", {
			from: data.from,
			to: data.to,
			message: "deny"
		});
		return false;
	}
});

socket.on("gamestart", function(data){
	var others = document.getElementById("others");
	while (others.firstChild) {
		others.removeChild(others.firstChild);
	}
	userList = new Array();
	var initAngle = data.angle;
	var initDirection = data.direction;
	document.getElementById("gameContainer").style.display = "block";
	pong.init();
	pong.resetBall();
	pong.launch(initAngle, initDirection);
});

window.addEventListener("paddlehit-left", function(e){
	if (e.detail.hit) {
		console.log("HIT PADDLE.  New angle: %f", e.detail.angle); 
		socket.emit("reflect", {
			angle: e.detail.angle,
			position: e.detail.position
		});
	}else{
		console.log("MISSED PADDLE");
		socket.emit("misspad", {
			by: currentuser,
			add: opponent
		});
	}
});

socket.on("reflect", function(data){
	pong.resetBall(960, data.position);
	pong.launch(data.angle, -1);
});

socket.on("updatescore", function(data){
	if (currentuser == data.name1) {
		currentscore = data.score1;
		opposcore = data.score2;
	}
	else {
		currentscore = data.score2;
		opposcore = data.score1;	
	}
	pong.setScore({left: currentscore, right: opposcore});
});

socket.on("wins", function(data){
	alert("Yeah! You win");
	opponent = null;
	document.getElementById("gameContainer").style.display = "none";
});

socket.on("loses", function(data){
	alert("Oh no! You lose");
	opponent = null;
	document.getElementById("gameContainer").style.display = "none";
});

socket.on("pause", function(data){
	pong.pauseOrResumeGame();
	if (currentuser == data) {
	//data = by the person miss pad
		if (confirm("Resume?")) {
			pong.pauseOrResumeGame();
			if( pong.ready()) {
				var initAngle = -60 + 120*Math.random();
				var initDirection = Math.random() < 0.5 ? -1 : 1;
				document.getElementById("gameContainer").style.display = "block";
				pong.init();
				pong.resetBall();
				pong.launch(initAngle, initDirection);
				
				pong.setScore({left: currentscore, right: opposcore});
				
				socket.emit("sendresume", {
					angle: initAngle,
					direction: (-1)*initDirection
				});
			}
		}
		else {
			socket.emit("quitgame", {
					quitter: currentuser,
					toquit: opponent
			});
		}
	}
});

socket.on("quitgame", function(data){
	userList = new Array();
	var others = document.getElementById("others");
		while (others.firstChild) {
			others.removeChild(others.firstChild);
	}
	opponent = null;
	document.getElementById("gameContainer").style.display = "none";
});

socket.on("resume", function(data){
	pong.pauseOrResumeGame();
	if( pong.ready()) {
		var initAngle = data.angle;
		var initDirection = data.direction;
		document.getElementById("gameContainer").style.display = "block";
		pong.init();
		pong.resetBall();
		pong.launch(initAngle, initDirection);
		
		pong.setScore({left: currentscore, right: opposcore});
	}
});

window.addEventListener("paddlemove", function(e){
	console.log("HIT PADDLE.  New angle: %f", e.detail.angle); 
	socket.emit("padmove", {
		y: event.detail.position
	});
});

socket.on("padmove", function(data){
	pong.updateOpponentPaddle(data);
});