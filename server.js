const express       = require('express');
const app           = express();
const bodyParser    = require('body-parser');
const bcrypt        = require('bcrypt');
const cors          = require('cors');
const knex          = require('knex');
const Clarifai      = require('clarifai');

//const PORT          = process.env.PORT || 3000;

const appClar = new Clarifai.App({
    apiKey: '3693f65b455746a6bc3474fecbe4bda7'
});

const handleApiCall = (req, res) =>{
    appClar.models
    .predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data => {
        res.json(data);
    })
    .catch(err => res.status(400).json('unable to work with API'))
}

const postgresDB = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres', // the owner name when I do /d on the console for postgres
      password : 'elephantman', //ill learn later
      database : 'smart_brain'
    }
  });

 postgresDB.select('*').from('users').then(data => {
   console.log(data); //dont have to do JSON since im not sending anything through HTTP, I just get back data

 });

  
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());


 
const database = {
    users: [
    {
        id: '123',
        name: 'John',
        email: 'john@gmail.com',
        password: 'cookies',
        entries: 0,
        joined: new Date()

    },
    {
        id: '124',
        name: 'Sally',
        email: 'sally@gmail.com',
        password: 'bananas',
        entries: 0,
        joined: new Date()

    }

    ]

}

 


app.get('/', (req, res)=> {
  res.send("its working!");

})

  // when sending data from the front-end and its using JSON, I need to parse it because express doesnt know what I sent over!in order to use req.body I need to use body parser!  
app.post('/signin',(req,res) => {
    const{email, password} =  req.body;
    if(!email || !password){
        return res.status(400).json('incorrect form submission');
    }
    postgresDB('email','hash').from('login')
    .where('email', '=', email )
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if(isValid){
        return postgresDB.select('*').from('users')
            .where('email', '=',  email)
            .then(user => {
                res.json(user[0])
            })
            .catch(err => res.status(400).json('unable to get user'))
      }
      else{
      res.status(400).json('wrong credentials')
      }
    })
     .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
    const {email,name,password} = req.body;
    if(!email || !name || !password){
        return res.status(400).json('incorrect form submission');
    }
    var saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
 
    bcrypt.hash(password, 10, (err, hash) =>{
        // Store hash in your password DB.
        console.log(hash);
      });
      //Transactions are code blocks that make sure that if im doing multiple operations on a database, if one fails they all fail!
      //Create a transaction when I have to do more than 2 things at once
    postgresDB.transaction(trx => {
        trx.insert({
            hash: hash, //hash from bcrypt
            email: email //email from req.body
        })
        .into('login')
        .returning('email')
        .then(loginEmail =>{
            return trx('users')
            .returning('*') //returning is a method from knex which is the response(user) I send back. THe '*' means that users insert the new entry e.g 'Cole' and return all the columns.  
            .insert({
                email: loginEmail[0],
                name: name,
                joined: new Date()
    
            }).then(user => {
                res.json(user[0]); //because when I register a user, there should only be one that shows
            })
        })
        .then(trx.commit) //NEED THIS TO WORK
        .catch(trx.rollback);
    })
        
    .catch(err => res.status(400).json('unable to register since this email is already registered'))// in case for error

})

app.get('/profile/:id', (req,res) =>{ // the colons : make it a variable. : tells express to not match the characters for character but to make it a pattern that im listening for. 
    const { id } = req.params; //to save :id I get it from req.params
 
    postgresDB.select('*').from('users').where({
        id: id
    })
    .then(user =>{
        if(user.length){
            res.json(user[0]); //grabbing the array of the user
        }
        else{
            res.status(400).json('Not Found')

        }
    })
    .catch(err => res.status(400).json('Error getting user'));
})

app.put('/image', (req,res) => {
    const { id } = req.body;  
    postgresDB('users').where('id', '=', id)
    .increment('entries',1)
    .returning('entries')
    .then(entries =>{
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('unable to get entries'))
})

app.post('/imageurl', (req,res) => {
   
        appClar.models
        .predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
        .then(data => {
            res.json(data);
        })
        .catch(err => res.status(400).json('unable to work with API'))
    
})
 
 
app.listen(process.env.PORT||3000,()=>{
console.log(`app is running on port ${process.env.PORT}` );

})

/*
    ==> res = this is working
    /signin --> POST = success/fail  signin is POST request becuase its posting a json response. Using Post becuase when I send a password, I dont want to send it as a query string! I want to send it inside of the body ideally over HTTPS soo that its hidden from man-in-the-middle attacks and is secure
    /register -->POST = new user object
    /profile/:userId --> GET = user
    /image --> PUT --> user

*/