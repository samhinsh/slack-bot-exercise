require('dotenv').config();

const express = require('express');
const WebClient = require('@slack/client').WebClient;
const slackEventsAPI = require('@slack/events-api');
const slackInteractiveMessages = require('@slack/interactive-messages');
const bodyParser = require('body-parser');

const slackEvents = slackEventsAPI.createSlackEventAdapter(process.env.SLACK_VERIFICATION_TOKEN);
const slackMessages = slackInteractiveMessages.createMessageAdapter(process.env.SLACK_VERIFICATION_TOKEN);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/slack/events', slackEvents.expressMiddleware());
app.use('/slack/actions', slackMessages.expressMiddleware());

const bot = new WebClient(process.env.SLACK_BOT_TOKEN);
const web = new WebClient(process.env.SLACK_AUTH_TOKEN);

const PORT = process.env.PORT || 4390;

app.listen(PORT, function() {
	console.log("Bot listening on port " + PORT);
});

let users = [];

slackEvents.on('reaction_added', (event) => {
	// Reaction added, send reaction as message
	web.chat.postMessage(event.item.channel, ':' + event.reaction + ':', function(err, info) {
		if (err) console.log(err);
	});
});

slackMessages.action('emoji', (payload) => {
	// Original message to modify
	const replacement = payload.original_message;

	if (payload.actions[0].value == 'yes') {
		replacement.text = `Good choice, ${payload.user.name} :relieved:`;
  		delete replacement.attachments;
  		return replacement;
	} else {
		replacement.text = `Yikes :stuck_out_tongue_winking_eye:`;
  		delete replacement.attachments;
  		//check if userID
  		if (users[payload.user.id]) {
  			web.channels.leave(users[payload.user.id])
  				.then((info) => { console.log(info) })
  				.catch(console.error);
  		}
  		
  		return replacement;
	}
});

slackEvents.on('member_joined_channel', (event) => {
	// Add user to user array
	if (!users[event.user]) users[event.user] = event.channel;

	// Send DM to event.user
	sendDM(event.user, JSON.stringify(onboardingAttachment))	
});

function sendDM(id, msg) {
	// Open and send intial DM
	bot.im.open(id)
		.then((info) => { bot.chat.postMessage(info.channel.id, "", {attachments: msg})})
		.catch(console.error);
};

const onboardingAttachment = [{
	text: 'Do you like emoji?',
	color: "#ffc211",
	attachment_type: 'default',
	callback_id: 'emoji',
	actions: [
		{
			"name": "yes",
			"text": "Yes :thumbsup:",
			"type": "button",
			"value": "yes"
		},
		{
			"name": "no",
			"text": "No",
			"type": "button",
			"value": "no",
			"style": "danger",
			"confirm": {
				"title": "Are you sure?",
				"text": "Think about it :thinking_face:",
				"ok_text": "Yes",
				"dismiss_text": "No"
			}
		}
	]
}];