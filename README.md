College Tuition Cost API

This API serves to allows users to request information on annual education cost based on a college with or without room and board.

Files required:
    server.js
    package.json
    college-costs.csv

This API uses Node.js to run the server and read in the CVS file. Express was then used to handle the Http requests. Express is designed to work with Node.js and is a Javascript framework as well.

Set-up:

1. Node.js must be installed. It can be installed here at https://nodejs.org/en/download/.

2. Once Node.js is istalled. Copy the required files into your directory and then navigate to your directory.

3. Run

    npm install

4. Start the server by running

    npm start

5. Server is now listening on http://localhost:8080/.

Routes:

1. GET /colleges
        Returns all college information stored from the CVS file.
        Parameters: 
            N/A

2.  GET /college (example: http://localhost:8080/college?name=Purdue University, West Lafayette)
        Search for total cost plus room and board (by default) for specified college name.
        Parameters: 
            name: (college name)
        
3. GET /college/room-and-board (example: http://localhost:8080/college/room-and-board?name=Purdue University, West Lafayette&include=false)
        Same as "GET /college" however you can specifiy whether you want room and board included in the total cost with the include parameter.
        Parameters: 
            name: (college name)
            include: (true or false whether room and board will be included in cost)

Notes:

This server was developed using Windows and Visual Studio Code. Testing done using Postman.
