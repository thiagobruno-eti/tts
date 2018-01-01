var express = require('express');
var request = require('request');
var AWS = require('aws-sdk');
var awsConfig = require('aws-config');
var fs = require('fs');
var crypto = require('crypto');

AWS.config = awsConfig({
  region: 'us-east-1',
  maxRetries: 3,
  accessKeyId: 'POLLYACCESSKEY',		// TODO replace this string with the all-caps access key id of your IAM user
  secretAccessKey: 'pollysecretkey',	// TODO replace this string with the longer, mixed-case secret key of your IAM user
  timeout: 15000
});

var common = {
    key: "11111111",					// TODO replace this string with the 8 digit key from your Character API signup email
    character: "SusanHead",
    version: "3.0",
    return: "true",
    recover: "true",
    webgl: "true",
    format: "jpeg",
    backcolor: "808080"
};

var app = express();
app.get('/animate.jpeg', function (req, res) {
    var hash = crypto.createHash('md5');
    for (var key in req.query)
        if (key != "audio") // we want urls with and without audio=true to hash to the same string
            hash.update(req.query[key]);
    var filename = hash.digest("hex");
    if (!req.query.format) req.query.format = "png";
    if (!req.query.action) req.query.action = "";
    var audioFile = './cache/' + filename + '.mp3';
    var imageFile = './cache/' + filename + '.' + req.query.format;
    var dataFile = './cache/' + filename + '.js';

	// Case where we can send straight to animate
	if (req.query.action.indexOf("<say>") == -1)
	{
		if (!fs.existsSync(imageFile)) {
			var urlAnimate = "http://characterapi.com/animate";
			var newquery = {};
            for (var key in common)
				newquery[key] = common[key];
			for (key in req.query)
				if (!newquery[key])
					newquery[key] = req.query[key];
			request.get({url:urlAnimate, qs: newquery, encoding: null}, function(err, httpResponse, body) {
				if (httpResponse.statusCode == 404) {res.setHeader('content-type', 'text/plain'); console.log(body); res.write(body); res.end(); return;}
				fs.writeFile(dataFile, httpResponse.headers["x-msi-animationdata"] || "", "binary", function(err) {
					if (err) {var s = "Please create a cache subdirectory with read/write permissions, as described in the README."; console.log(s); res.write(s); res.end(); return;}
					fs.writeFile(imageFile, body, "binary", function(err) {
						finish(res, req.query.audio, req.query.format, audioFile, imageFile, dataFile);
					});
				});
			});
		}
		else {
			finish(res, req.query.audio, req.query.format, audioFile, imageFile, dataFile);
		}
	}
	// Case where we need to get tts and lipsync it first
	else
	{
		if (!fs.existsSync(imageFile)) {
			var textOnly = req.query.action.replace(new RegExp("<[^>]*>", "g"), "").replace("  "," "); // e.g. <say>Look <cmd/> here.</say> --> Look here.
			var polly = new AWS.Polly();
			var pollyData = {
			  OutputFormat: 'mp3',
			  Text: textOnly,
			  VoiceId: "Joanna"
			};
			polly.synthesizeSpeech(pollyData, function (err, data) {
                if (err) {var s = "Polly: " + err.message; console.log(s); res.write(s); res.end(); return;}
                fs.writeFile(audioFile, data.AudioStream, function (err) {
					pollyData.OutputFormat = 'json';
					pollyData.SpeechMarkTypes = ['viseme'];
					polly.synthesizeSpeech(pollyData, function (err, data) {
						var zip = new require('node-zip')();
						zip.file('lipsync', data.AudioStream);
						var dataZipBase64 = zip.generate({base64:true,compression:'DEFLATE'});
						var urlAnimate = "http://characterapi.com/animate";
                        var newquery = {};
                        for (var key in common)
                            newquery[key] = common[key];
						for (var key in req.query)
							if (!newquery[key] && key != "audio")
								newquery[key] = req.query[key];
                        newquery.lipsync = dataZipBase64;
						request.get({url:urlAnimate, qs: newquery, encoding: null}, function(err, httpResponse, body) {
							if (httpResponse.statusCode >= 400) {res.statusCode = httpResponse.statusCode; res.setHeader('content-type', 'text/plain'); res.write(body); console.log(body); res.end(); return;}
							fs.writeFile(dataFile, httpResponse.headers["x-msi-animationdata"] || "", "binary", function(err) {					
								fs.writeFile(imageFile, body, "binary", function(err) {
									finish(res, req.query.audio, req.query.format, audioFile, imageFile, dataFile);
								});
							});
						});
					});
				});
			}); 
		}
		else {
			finish(res, req.query.audio, req.query.format, audioFile, imageFile, dataFile);
		}
	}
});
    
function finish(res, audio, format, audioFile, imageFile, dataFile) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Expose-Headers', 'x-msi-animationdata');
    if (audio) {
        res.setHeader('content-type', 'audio/mpeg');
        fs.createReadStream(audioFile).pipe(res);
    }
    else {
        fs.readFile(dataFile, "utf8", function(err, data) {
			res.setHeader('x-msi-animationdata', data);
			res.setHeader('content-type', 'image/' + format);
			fs.createReadStream(imageFile).pipe(res);
		});
    }   
}   

app.listen(3000, function() {
  console.log('Listening on port 3000');
});