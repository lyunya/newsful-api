# Newsful Server

### Newsful was developed to help you see how the news is reported on from all over the political spectrum.

## Server Hosted here:
https://boiling-springs-79266.herokuapp.com/

## API Documentation

## Routes
#### Login endpoint
'/api/auth/login'  

##### Method: Post  
Required:  ```{ email: [string],  
    password: [string] }```
 
Success Response:  
Code: 200  
Sample Data: ```{
        "authToken": 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF6IjoxNTKYOTQwNjk0LCJzdWIiOiJsZW9ubWFyYnVraEBnbWFpbC5jb19ifQ.XbnLTDqAI1rkPlTr2BTSCILwqsVqET9CFrTgrbAzu4
        "userId": 1
    }```  

Error Response:  
Code: 400  
Content: ```{ error: "Incorrect email or password }```  
___
#### Saved Articles endpoint  
'/api/saved-articles'  

##### Method: Get  
Returns all saved articles  
Success Response:  
Code: 200  
Sample Data: ```{
        "title": "This is a headline of a news article",
        "url": "www.cnn.com/news/headline-article",
        "image": "www.cnn.com/news/headline-article/images/article-image.png",
        "user_id": 37,
    }```  

##### Method: Post  
Inserts new saved article 
Required: ```{
        title: [string],
        url: [string],
        image: [string],
        user_id: [integer]
        }```
        
Success Response:   
Code: 201  
Content: article object in JSON  

Error Response:  
Code: 400  
Content: ```{ error: "Missing ${key} in request body" }```  

##### Method: Delete
Deletes saved article
Success Response:
Code: 204
___
#### Users endpoint  
'/api/users'  

##### Method: Post  
Inserts new user  
Required: ```{ email: [string],
        password: [string] }```

Success Response:   
Code: 201  
Content: user object in JSON ```{ "id": [integer], "email": [string] }```  

Error Response:  
Code: 400  
Content: ```{ error: "Missing ${field} in request body" } ```  
or  
Code: 400  
Content: ```{ error: "Email already taken" }```  


## Technology Used
* Node.js
* Express
* Mocha
* Chai
* Postgres
* JWT
* Knex.js

## Security
Application uses JWT authentication