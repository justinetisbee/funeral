const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'funeral',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});


app.post('/account', (req, res) => {
  const username= req.query.username;
  const password= req.query.password;
  console.log(req.query);
    if (!username || !password) {
      res.status(400).send({ error: 'Missing username or password' });
      return;
    }
  const query= "SELECT * FROM `account` where username=?";
  db.query(query, [username], (err, result) => {
    if (err) {
      res.status(500).send({ error: 'Error fetching data' });
      return;
    }
    if (result.length === 0) {
      res.status(401).send({ error: 'Invalid credentials' });
      return;
    }
    const hashedPassword = result[0].password;
    bcrypt.compare(password, hashedPassword, (err, passwordMatch) => {
      if (err) {
        res.status(500).send({ error: 'Error logging in' });
        return;
      }

      if (passwordMatch) {
        res.status(200).send(result);
      } else {
        res.status(401).send({ error: 'Invalid password' });
      }
    });
  });
});

/// Generate a random secret key
const SECRET_KEY ='00881166jamd';
// Token verification middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).send({ error: 'No token provided' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: 'Invalid token' });
    }
    next();
  });
};


// Create account endpoint
app.post('/create-account', (req, res) => {
  const { Username, Password } = req.query;

  if (!Username || !Password ) {
    res.status(400).send({ error: 'Missing parameter or role ID error' });
    return;
  }

  const token = jwt.sign({ Username }, SECRET_KEY); // Generate JWT token

  bcrypt.hash(Password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      res.status(500).send({ error: 'Error creating account' });
      return;
    }

    const query =
      'INSERT INTO `account`(`username`, `password`, `token`) VALUES (?,?,?)';

    db.query(query, [Username, hashedPassword,  token], (err, result) => {
      if (err) {
        console.error('Error creating account:', err);
        res.status(500).send({ error: 'Error creating account' });
      } else {
        res.status(200).send({ message: 'Account created successfully' });
      }
    });
  });
});

// Create account endpoint
app.put('/update-account',verifyToken, (req, res) => {
  const { Name, Username, Password, Date_Updated, oldToken} = req.query;
  console.log(req.query);
  if (!Name || !Username || !Password || !Date_Updated ) {
    res.status(400).send({ error: 'Missing parameter or role ID error' });
    return;
  }

  const token = jwt.sign({ Username }, SECRET_KEY); // Generate JWT token

  bcrypt.hash(Password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      res.status(500).send({ error: 'Error creating account' });
      return;
    }

    const query =
      'UPDATE accounts SET Name=?, Username= ?, Password=?, Date_Updated=?,token=? WHERE token=?';

    db.query(query, [Name, Username, hashedPassword, Date_Updated,token, oldToken], (err, result) => {
      if (err) {
        console.error('Error creating account:', err);
        res.status(500).send({ error: 'Error creating account' });
      } else {
        res.status(200).send({ message: 'Account updated successfully' });
      }
    });
  });
});


app.get('/funeral', verifyToken, (req, res) => {
  const displayData = req.query.displayData; // Get the value of 'displayData' from req.query
  console.log(displayData);
  let sqlQuery;
  if (displayData === "billing") {
    // SQL query for 'billing' table
    sqlQuery = "SELECT `billing_id`,concat (client_information.first_name,' ',client_information.last_name) as Name ,  `balance`, billing.`date` FROM `billing` INNER JOIN client_information on client_information.client_id=billing.client_id where balance !=0";
  } else if (displayData === "billingPaid") {
    // SQL query for 'billingPaid' table
    sqlQuery = "SELECT `billing_id`,concat (client_information.first_name,' ',client_information.last_name) as Name ,  `balance`, billing.`date` FROM `billing` INNER JOIN client_information on client_information.client_id=billing.client_id where balance =0";
  } else if (displayData === "clientinformation") {
    // SQL query for 'clientinformation' table
    sqlQuery = "SELECT * FROM `client_information`";
  } else if (displayData === "clientinfo") {
    // SQL query for 'clientinfo' table
    sqlQuery = "SELECT `client_id`,`first_name`, `last_name`, `email`, `phone_number`, `address` FROM `client_information`";
  } else if (displayData === "purchaseCbx") {
    // SQL query for 'purchaseCbx' table
    sqlQuery = "SELECT Concat(`first_name`, `last_name`) as name, client_id FROM `client_information`";
  } else if (displayData === "deceased_body") {
    // SQL query for 'deceased_body' table
    sqlQuery = "SELECT * FROM `deceased_body`";
  } else if (displayData === "package") {
    // SQL query for 'package' table
    sqlQuery = "SELECT * FROM `package`";
  } else {
    return res.status(400).send({ error: 'Invalid table name!!' });
  }

  db.query(sqlQuery, (err, result) => {
    if (err) {
      res.status(500).send({ error: 'Error' });
    } else {
      res.status(200).send({ result });
    }
  });
});



app.get('/search', verifyToken, (req, res) => {
  const id=req.query;
  let {displayData,searchData}=req.query;
  if (!displayData.trim()  || !searchData.trim() ) {
    res.status(400).send({ error: 'Invalid or missing Parameter' });
    return;
  }
  let sqlQuery;
  if (displayData === "billing") {
    sqlQuery = "SELECT `billing_id`,concat (client_information.first_name,' ',client_information.last_name) as Name ,  `balance`, billing.`date` FROM `billing` INNER JOIN client_information on client_information.client_id=billing.client_id where balance !=?";
  } 
  else if (displayData === "clientinformation") {
    sqlQuery = "SELECT * FROM `client_information` WHERE first_name LIKE ?";
  } else if (displayData === "deceased_body") {
    
    sqlQuery = "SELECT * FROM `deceased_body` WHERE first_name LIKE ?";
  } else {
    return res.status(400).send({ error: 'Invalid table name' });
  }
  db.query(sqlQuery, [id], (err, result) => {
    if (err) {
      res.status(500).send({ error: 'Error' });
    } else {
      res.status(200).send({ message: 'Successfully deleted' });
    }
  });
});

app.delete('/funeral', verifyToken, (req, res) => {
  const {id,tableName}= req.query;
  let sqlQuery;
  if (!id || isNaN(id) || !tableName) {
    res.status(400).send({ error: 'Invalid or missing Parameter'});
    return;
  }
  if(tableName==="client_information"){
    sqlQuery = "DELETE FROM `client_information` WHERE Client_ID = ?";
  }
  else if(tableName==="deceased_body"){
    sqlQuery = "DELETE FROM `deceased_body` WHERE Deceased_ID = ?";
  }else {
    return res.status(400).send({ error: 'Invalid table name'});
  }
  db.query(sqlQuery, [id], (err, result) => {
    if (err) {
      res.status(500).send({ error: 'Error'});
    } else {
      res.status(500).send({ error: 'Successfully deleted'});
    }
  }); 
});

app.put('/funeral', verifyToken, (req, res) => {
  const id=req.query.id;
  const tableName=req.query.tableName;

  if ( !id.trim()  || isNaN(id) || !tableName.trim() ) {
    res.status(400).send({ error: "Missing parameter or id error" });
    return;
  }

  if(tableName==="client_information"){
    const {First_Name,Last_Name,Email,Phone_Number,Address} = req.query;
    if (!First_Name || !Last_Name || !Email || !Phone_Number || !Address ) {
      res.status(400).send({ error: "Missing parameter" });
      return;
    }
    const query = "UPDATE client_information SET First_Name = ?, Last_Name = ?, Email = ?, Phone_Number = ?, Address = ? WHERE Client_ID = ?";
    db.query(query, [First_Name,Last_Name,Email,Phone_Number,Address,id], (err, result) => {
      if (err) {
        res.status(500).send({ error: 'Error' });
      } else {
        res.status(200).send({ message: 'Successfully updated' });
      }
    });
  }
  if(tableName==="billing"){
    
    const query = "UPDATE `billing` SET `balance`='0' WHERE billing_id= ?";
    db.query(query, [id], (err, result) => {
      if (err) {
        res.status(500).send({ error: 'Error' });
      } else {
        res.status(200).send({ message: 'Successfully updated' });
      }
    });
  }
  else{
    return res.status(400).send({ error: 'Invalid table name' });
  }
});


app.post('/funeral', verifyToken, (req, res) => {
  const tableName=req.query.tableName;
  console.log(tableName);
  if(tableName==="client_information"){
    const {first_name,last_name,email,phone_number,address} = req.query;
    console.log(req.query);
    if (!first_name || !last_name || !email || !phone_number || !address) {
      res.status(400).send({ error: "Missing parameter" });
      return;
    }
    const query = "INSERT INTO `client_information`(`first_name`, `last_name`, `email`, `phone_number`, `address`) VALUES (?,?,?,?,?)";
    db.query(query, [first_name,last_name, email,phone_number,address], (err, result) => {
      if (err) {
        res.status(500).send({ error: 'Error' });
      } else {
        res.status(200).send({ message: 'Successfully inserted' });
      }
    });
  }
  else if(tableName==="deceased_body"){
    const {first_name,last_name,birth_date,death_date} = req.query;
    if (!first_name || !last_name || !birth_date || !death_date) {
      res.status(400).send({ error: "Missing parameter or id error" });
      return;
    }
    const query = "INSERT INTO `deceased_body`(`first_name`, `last_name`,`birth_date`, `death_date`) VALUES (?,?,?,?)";
    db.query(query, [first_name,last_name,birth_date,death_date], (err, result) => {
      if (err) {
        res.status(500).send({ error: 'Error' });
      } else {
        res.status(200).send({ message: 'Successfully inserted' });
      }
    });
  }
  else if(tableName==="billing"){
    const {client_id,package_id,balance} = req.query;
    if (!client_id || !package_id || !balance) {
      res.status(400).send({ error: "Missing parameter or role id error" });
      return;
    }
    const query = "INSERT INTO `billing`( `client_id`, `package_id`, `balance`) VALUES (?,?,?)";
    db.query(query, [client_id,package_id,balance], (err, result) => {
      if (err) {
        res.status(500).send({ error: 'Error' });
      } else {
        res.status(200).send({ message: 'Successfully inserted' });
      }
    });
  } else{
    return res.status(400).send({ error: 'Invalid table name' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});