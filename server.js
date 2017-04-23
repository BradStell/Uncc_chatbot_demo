const express = require('express');
const app = express();
const twilio = require('twilio');
const bodyParser = require('body-parser');
const NLU_V1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
const ConversationV1 = require('watson-developer-cloud/conversation/v1');
let lastConvoContext;

const vans = {
    'old-school': 'https://www.dropbox.com/s/mpldv80yjh5faw8/vans_oldschool.jpg?raw=1',
    'normal': 'https://www.dropbox.com/s/ih6tuz6x0l62bye/vans-era-mens.jpg?raw=1',
    'high-top': 'https://www.dropbox.com/s/lq3rs3ja0kowfqa/vans-hi-top.jpg?raw=1'
}

const conversation = new ConversationV1({
    username: 'ff71802a-62b2-47ae-9692-df5e71c142b9',
    password: 'fRohP03kApiD',
    version_date: ConversationV1.VERSION_DATE_2017_02_03
});

let nlp = new NLU_V1({
    'username': 'e102f18e-7997-468e-9b9a-a9ca61fdcc71',
    'password': '1U0SqFl2aGRy',
    'version_date': '2017-02-27',
    headers: {
        'X-Watson-Learning-Opt-Out': true
    }
});

let params = {
    'text': '',
    'features': {
        // 'entities': {               // not so good  ~ maybe
        //     'emotion' : true,
        //     'sentiment': true,
        //     'limit': 2
        // },
        'keywords': {               // good
            'emotion': true,
            'sentiment': true,
            'limit': 2
        },
        // 'concepts': {},             // good
        // 'categories': {},           // good
        // 'relations': {},            // not good
        'semantic_roles': {},       // good
        'sentiment': {}             // maybe for mood
    },
    'language': 'en',
    'clean': false,
    'return_analyzed_text': true
};

app.use(bodyParser.urlencoded({ extended: false })); 

app.post('/receive', (req, res) => {
    console.log('Server hit /');

    let twiml = new twilio.TwimlResponse();
    let message = req.body.Body;
    params.text = message;

    nlp.analyze(params, (err, response) => {
        if (err) console.error(err);

        else {
            console.log(JSON.stringify(response, null, 2));
            
            let sentiment = (response && response.sentiment && response.sentiment.document) ? response.sentiment.document.label : '';
            let subject = (response.keywords.length > 0) ? response.keywords[0].text : '';

            let one = message.toLowerCase().indexOf('upset');
            let one_ = ~message.toLowerCase().indexOf('upset');
            let two = message.toLowerCase().indexOf('disappointed');
            let two_ = ~message.toLowerCase().indexOf('disappointed');

            if (sentiment !== 'negative' || !(~message.toLowerCase().indexOf('upset') || ~message.toLowerCase().indexOf('disappointed'))) {
                

                if (~subject.toLowerCase().indexOf('vans')/* && (response.semantic_roles.length > 0 && (response.semantic_roles[0].action.verb.text === 'need' || response.semantic_roles[0].action.verb.text === 'want'))*/) {
                    
                    twiml.message(function() {
                        this.body('Ok, Do you like any of these?');
                        this.media(vans['old-school']);
                        this.media(vans['normal']);
                        this.media(vans['high-top']);
                    });
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());

                    return;
                } else { // all other convo will be routed to Watson's Conversation API

                    if (lastConvoContext) {
                        conversation.message({
                                input: { text: message },
                                workspace_id: '267b330b-e345-4e6d-9eb8-1962deba1999',
                                context: lastConvoContext
                            }, function (err, response) {
                                if (err) console.error(err);

                                else {
                                    twiml.message(response.output.text[0]);
                                    res.writeHead(200, {'Content-Type': 'text/xml'});
                                    res.end(twiml.toString());
                                }
                        });
                    } else {
                        conversation.message({
                                input: { text: message },
                                workspace_id: '267b330b-e345-4e6d-9eb8-1962deba1999'                            
                            }, function(err, response) {
                                if (err) console.error(err);

                                else {
                                    console.log(JSON.stringify(response, null, 2));
                                    conversation.message({
                                            input: { text: message },
                                            workspace_id: '267b330b-e345-4e6d-9eb8-1962deba1999',
                                            context: response.context
                                        }, function(err, response) {
                                            if (err) console.error(err);
                                            else {
                                                lastConvoContext = response.context;

                                                twiml.message(response.output.text[0]);
                                                res.writeHead(200, {'Content-Type': 'text/xml'});
                                                res.end(twiml.toString());
                                            }
                                    });
                                }
                        });
                    }
                }
            } else {
                
                twiml.message('I\'m very sorry. Our customer service rep will call you shortly.');
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
            }
        }
    });    
});

app.listen(3333, () => {
    console.log(`Server started at http://localhost:3333`);
});