var https = require('https');
var express = require('express');
var querystring = require('querystring');

var consumerToken = "CD0EDA9465F773368B26D217995B67CDE22F37D5";
var consumerSecret = "57BD88F0F212A69398188604E11E59F6781C2089";

var app = express()
	.use(express.cookieParser())
	.use(express.session({ secret: "don't steal this!" }))
	.set('views', __dirname + '/views')
    .set('view engine', 'ejs')
	.get('/login', function(request, response) {
		https.request({
			hostname: 'auth.logos.com',
			method: 'POST',
			path: '/oauth/v1/temporarytoken',
			headers: {
				Authorization: 'OAuth oauth_consumer_key="' + consumerToken + '", oauth_signature="' + consumerSecret + '%26", oauth_signature_method="PLAINTEXT", oauth_version="1.0", oauth_callback="http://minmap-imprint.rhcloud.com/verify"'
			}
		}, function(temporaryTokenResponse) {
			var responseData = '';
			temporaryTokenResponse.on('data', function(data) {
				responseData += data;
			});

			temporaryTokenResponse.on('end', function() {
				request.session.oauth_token_secret = querystring.parse(responseData).oauth_token_secret;
				response.redirect('https://auth.logos.com/oauth/v1/authorize?' + responseData);
			})
		}).end();
	})
	.get('/verify', function(request, response) {
		https.request({
			hostname: 'auth.logos.com',
			method: 'POST',
			path: '/oauth/v1/accesstoken',
			headers: {
				Authorization: 'OAuth oauth_consumer_key="' + consumerToken + '", oauth_signature="' + consumerSecret + '%26' + request.session.oauth_token_secret + '", oauth_signature_method="PLAINTEXT", oauth_version="1.0", oauth_token="' + request.query.oauth_token + '", oauth_verifier="' + request.query.oauth_verifier + '"'
			}
		}, function(accessTokenResponse) {
			var responseData = '';
			accessTokenResponse.on('data', function(data) {
				responseData += data;
			});

			accessTokenResponse.on('end', function() {
				var parsedResponse = querystring.parse(responseData);
				request.session.oauth_token = parsedResponse.oauth_token;
				request.session.oauth_token_secret = parsedResponse.oauth_token_secret;
				response.redirect('/');
			});
		}).end();
	})
	.get('/', function(request, response) {
		if (!request.session.oauth_token || !request.session.oauth_token_secret) {
			        	response.render('login', {});
			return;
		}

		https.request({
			hostname: 'accountsapi.logos.com',
			method: 'GET',
			path: '/v2/users/me',
			headers: {
				Authorization: 'OAuth oauth_consumer_key="' + consumerToken + '", oauth_signature="' + consumerSecret + '%26' + request.session.oauth_token_secret + '", oauth_signature_method="PLAINTEXT", oauth_version="1.0", oauth_token="' + request.session.oauth_token + '"'
			}
		}, function(userResponse) {
			var responseData = '';
			userResponse.on('data', function(data) {
				responseData += data;
			});

			userResponse.on('end', function() {
			    var user = JSON.parse(responseData);
			    var userId = user.id;
			    console.log(userId);
					https.request({
                    hostname: 'accountsapi.logos.com',
                    method: 'GET',
                    path: '/v2/users/' + userId + '/groups',
        			headers: {
        				Authorization: 'OAuth oauth_consumer_key="' + consumerToken + '", oauth_signature="' + consumerSecret + '%26' + request.session.oauth_token_secret + '", oauth_signature_method="PLAINTEXT", oauth_version="1.0", oauth_token="' + request.session.oauth_token + '"'
        			}
        		}, function(userResponse) {
        			var responseData = '';
        			userResponse.on('data', function(data) {
        				responseData += data;
        			});
        
        			userResponse.on('end', function() {
        			    console.log(responseData);
        				response.render('index', {
                            groups: JSON.parse(responseData),
                            user: user
                        });
        			});
        		}).end();
			});
		}).end();
	});
	
	
var server = app.listen(process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000, process.env.OPENSHIFT_NODEJS_IP || process.env.IP || "0.0.0.0");