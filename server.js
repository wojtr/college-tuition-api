const express = require("express");
const fs = require('fs');
const server = express();
const port = 8080;

/* Object to hold all tuitionData for each college where a college's data is stored at the key with the colleges name. */
var tuitionData = {};

/* This fuction takes in a string (data) that represents a rawCSV file created from fs.readFile.
   It makes one pass over the string and orders all the information into the global tuitionData object.
   Assumes conditions of example file:
        Four Columns: College Name, In-state Tuition, Out-of-state Tuition, Room and Board Cost
        Row 1: Column Titles.
        Empty Rows are removed from tuition data.
*/
function processCSVTuitionData(data) {

    var i;
    
    /* Track all data from a college. */
    var row = [];

    /* Start position of value seperated by a comma. */
    var valueStart = 0;

    /* Some Universities have locations seperated from the college name by a comma.
       This comma should not be used to seperate values as the location is part of the college's name.
       The college name is always surrounded by quotations in this case as is tracked by the variable location. 
    */
    var location = false;

    /* Loop passes through the entire string once checking each char and seperating values on a comma that are not part of the college's name. */
    for (i = 0; i < data.length; i++) {

        var c = data.charAt(i);

        /* "\n" indicates the end of a row  and the totality of a colleges information has been read. */
        if (c === '\n') {

            /* Final value in the row. (ie. board and room cost) */
            var value = data.substring(valueStart, i);

            /* Push the value onto the row array.
               If the value is a number push the number.
               If the value is a string (ie. the college's name) remove quotation markes and unreadable characters (found in place of spaces in some college names).
            */
            if (Number(value)) {
                row.push(Number(value));
            } else {
                row.push(value.replace(/\"/g, "").replace(/[^\x20-\x7E]/g, " "));
            }

            valueStart = i + 1;

            /* Add the row to tuition data at the key specified as the college's name.
               For values that are supposed to be numbers but were simply left blank in the CSV file, I revert those values to zero before pushing the row.
            */
            var college = {};
            college["name"] = row[0];
            if (row[1] === "") {
                college["in-state"] = 0;
            } else {
                college["in-state"] = row[1];
            }
            if (row[2] === "") {
                college["out-state"] = 0;
            } else {
                college["out-state"] = row[2];
            }
            college["room-and-board"] = row[3];
            tuitionData[row[0]] = college;

            row = [];

        /* "," indicates the end of a value unless the comma is part of the college's name. 
           Process is the same as above minus pushing the row to tuitionData.
        */
        } else if (c === ',' && location === false) {

            var value = data.substring(valueStart, i);
            if (Number(value)) {
                row.push(Number(value));
            } else {
                row.push(value.replace(/\"/g, "").replace(/[^\x20-\x7E]/g, " "));
            }
            valueStart = i + 1;

        /* Mark the end and begining of a college name with a location. */
        } else if (c === "\"") {

            if (location === true) {
                location = false;
            } else {
                location = true;
            }

        }
    }

    /* Delete empty and title rows. */
    delete tuitionData["College"];
    delete tuitionData[""];

}

/* This function takes in a string (file) representing the file path to the CSV file.
   The file is read by fs.readFile returning a raw String that is passed on to processCSVTuitionData.
   Once the file is processed and stored in tuitionData then the server can be started. (Placed in readFile to issure server is synchronized with the data as readFile is done asynchronously)
   processCSVTuitionData Assumes conditions of example file:
        Four Columns: College Name, In-state Tuition, Out-of-state Tuition, Room and Board Cost
        Row 1: Column Titles.
        Empty Rows are removed from tuition data.
*/
function processCSVTuitionFile(file) {

    fs.readFile(file, "utf8", function(err, data) {
        if (err) {
            throw err;
        }
        processCSVTuitionData(data);
        startServer();
    });

}

/* The function begins the process of processing date given by the file specified by the path below.
   Since processCSVTuitionFile calls startServer we insure tuitionData is populated when the server is started so we can correctly service HTTP requests.
*/
function getTuitionDataAndStartServer() {

    var file = "./college-costs.csv";
    processCSVTuitionFile(file);

}

/* This function starts the server and maps the operations that can be proformed.

    GET /colleges
        Returns all college information stored in tuition data.
        Parameters: 
            N/A

    GET /college (example: http://localhost:8080/college?name=Purdue University, West Lafayette)
        Search for total cost plus room and board (by default) for specified college name.
        Parameters: 
            name: <college name>

    GET /college/room-and-board (example: http://localhost:8080/college/room-and-board?name=Purdue University, West Lafayette&include=false)
        Same as "GET /college" however you can specifiy whether you want room and board included in the total cost with the include parameter.
        Parameters: 
            name: <college name>
            include: <true or false whether room and board will be included in cost>
    
*/
function startServer() {

    
    /* GET /colleges
        Returns all college information stored in tuition data.
        Parameters: 
            N/A
    */
    server.get('/colleges', (req, res) => {

        var data = {};
        data["data"] = tuitionData;
        res.json(data);

    });

    /* GET /college (example: http://localhost:8080/college?name=Purdue University, West Lafayette)
        Search for total cost plus room and board (by default) for specified college name.
        Parameters: 
            name: <college name>
    */
    server.get('/college', (req, res) => {

        /* Try to retrieve the college name from request parameters. */
        const collegeName = req.query.name;

        /* If college was not speified then return the error meessage “Error: College name is required”. */
        if (!collegeName) {

            res.json({ Error: "College name is required" });

        } else {

            /* If tuitionData contains information on the college specified return the cost plus room and board (as default). 
               Otherwise return the error message “Error: College name is required”.
            */
            if (tuitionData[collegeName]) {

                var data = {};

                var college = {};
                college["name"] = tuitionData[collegeName]["name"];

                /* Due to some colleges not having a in-state cost, I use out-state cost to perform the calculation for total annual cost for those colleges. */
                if (tuitionData[collegeName]["in-state"] != 0) {
                    college["cost"] = tuitionData[collegeName]["in-state"] + tuitionData[collegeName]["room-and-board"];
                } else {
                    college["cost"] = tuitionData[collegeName]["out-state"] + tuitionData[collegeName]["room-and-board"];
                }

                /* Return the name and total cost for the college. */
                data["data"] = college;
                res.json(data);

            } else {
                res.json({ Error: "College not found" });
            }

        }

    });

    /* GET /college/room-and-board (example: http://localhost:8080/college/room-and-board?name=Purdue University, West Lafayette&include=false)
        Same as "GET /college" however you can specifiy whether you want room and board included in the total cost with the include parameter.
        Parameters: 
            name: <college name>
            include: <true or false whether room and board will be included in cost>
    */
    server.get('/college/room-and-board', (req, res) => {
        
        /* Try to retrieve the college name and include value from request parameters. */
        const collegeName = req.query.name;
        var includeRoomAndBoard = req.query.include;

        /* If college was not speified then return the error meessage “Error: College name is required”. */
        if (!collegeName) {

            res.json({ Error: "College name is required"} );

        } else {

            /* If include value was not speified then return the error meessage “Error: Include parameter required”. */
            if (!includeRoomAndBoard) {

                res.json({ Error: "Include parameter required"} );

            } else {

                /* Insure the include value is equal to true or false being case insensitive. 
                   Otherwise return the error message "Error: Include parameter for room-and-board must be equal to true or false".
                */
                includeRoomAndBoard = includeRoomAndBoard.toLowerCase();
                if (includeRoomAndBoard === "true" || includeRoomAndBoard === "false") {

                    /* If tuitionData contains information on the college specified and the include value equals true, return the cost plus room and board. */
                    if (tuitionData[collegeName] && includeRoomAndBoard === "true") {
                        
                        var data = {};

                        var college = {};
                        college["name"] = tuitionData[collegeName]["name"];

                        /* Due to some colleges not having a in-state cost, I use out-state cost to perform the calculation for total annual cost for those colleges. */
                        if (tuitionData[collegeName]["in-state"] != 0) {
                            college["cost"] = tuitionData[collegeName]["in-state"] + tuitionData[collegeName]["room-and-board"];
                        } else {
                            college["cost"] = tuitionData[collegeName]["out-state"] + tuitionData[collegeName]["room-and-board"];
                        }

                        /* Return the name and total cost for the college. */
                        data["data"] = college;     
                        res.json(data);

                    /* If tuitionData contains information on the college specified and the include value equals false, return the cost without including room and board. */
                    } else if (tuitionData[collegeName] && includeRoomAndBoard === "false") {

                        var data = {};

                        var college = {};
                        college["name"] = tuitionData[collegeName]["name"];

                        /* Due to some colleges not having a in-state cost, I use out-state cost to perform the calculation for total annual cost for those colleges. */
                        if (tuitionData[collegeName]["in-state"] != 0) {
                            college["cost"] = tuitionData[collegeName]["in-state"];
                        } else {
                            college["cost"] = tuitionData[collegeName]["out-state"];
                        }

                        /* Return the name and total cost for the college. */
                        data["data"] = college;
                        res.json(data);

                    /* If tuitionData does not contain information on the specified college then return the error message “Error: College not found”. */
                    } else if (!tuitionData[collegeName]) {

                        res.json({ Error: "College not found"} );

                    }

                } else {

                    res.json({ Error: "Include parameter for room-and-board must be equal to true or false"} );

                }
            }
        }
    });

    /* Function to revert all other GET paths to a costum error message. */
    server.get('*', function(req, res) {  
        res.json({ Error: "This is not a implemented URL for this College Tuition Cost API." });
    });
    
    /* Sets up port for the server and begins listening for requests. */
    server.listen(port, () => {
        console.log("Starting Server!")
        console.log("Listening on http://localhost:8080/")
    });

}

getTuitionDataAndStartServer();
