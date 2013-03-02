var http = require('http');
var bind = require('bind-this');
var SpotifyService = require('./SpotifyService');

var TweetService = {
	QUERY: 'spoti.fi',

	POLL_TIMEOUT: 8000,

	MAX_CACHE: 20,

	cache: {
		tweets: [],
		since_id: 0
	},

	getTweetsSinceId: function (sinceId) {
		var filtered = this.cache.tweets.filter(function (tweet) {
			return tweet.since_id > sinceId;
		});
		return JSON.stringify({
			tweets: filtered,
			since_id: this.cache.since_id
		});
	},

	poll: function (refreshURL) {
		var url, self = this;

		url = 'http://search.twitter.com/search.json';
		url += refreshURL ? refreshURL : '?q=' + this.QUERY;

		http.get(url, function (res) {
			var buffer = '';
			res.setEncoding('utf8');

			if (res.statusCode !== 200) {
				self.poll.apply(self, arguments);
			}

			res.on('data', function (chunk) {
				buffer += chunk;
			});

			res.on('end', function () {
				self.onTweetsResponse(buffer);
			});
		});

		return this;
	},

	onTweetsResponse: function (buffer) {
		var response, tweets;

		response = JSON.parse(buffer);
		tweets = response.results;

		// Delegate to Spotify service to get image data
		SpotifyService.addImageURLSToTweets(tweets)
		.then(bind(this, function success (tweets) {
			this.cache.since_id = response.since_id;
			this.addTweetsToCache(tweets, response.since_id);

			setTimeout(bind(this, 'poll', response.refresh_url), this.POLL_TIMEOUT);
		}));
	},

	addTweetsToCache: function (tweets, since_id) {
		tweets.forEach(bind(this, function (tweet) {
			if (this.cache.tweets.length === this.MAX_CACHE) {
				this.cache.tweets.splice(0, 1);
			}
			tweet.since_id = since_id;
			this.cache.tweets.push(tweet);
		}));
	}
}.poll();

module.exports = TweetService;