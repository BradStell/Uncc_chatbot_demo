const express = require('express');
const app = express();
const twilio = require('twilio');
const bodyParser = require('body-parser');
const NLU_V1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

const vans = {
    'old-school': 'https://www.dropbox.com/s/mpldv80yjh5faw8/vans_oldschool.jpg?raw=1',
    'normal': 'https://www.dropbox.com/s/ih6tuz6x0l62bye/vans-era-mens.jpg?raw=1',
    'high-top': 'https://www.dropbox.com/s/lq3rs3ja0kowfqa/vans-hi-top.jpg?raw=1'
}

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

            if (sentiment !== 'negative') {
                let subject = (response.keywords.length > 0) ? response.keywords[0].text : '';

                if (~subject.toLowerCase().indexOf('vans') && (response.semantic_roles.length > 0 && response.semantic_roles[0].action.verb.text === 'need')) {
                    
                    twiml.message(function() {
                        this.body('Ok, Do you like any of these?');
                        this.media(vans['old-school']);
                        this.media(vans['normal']);
                        this.media(vans['high-top']);
                    });
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());

                    return;
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