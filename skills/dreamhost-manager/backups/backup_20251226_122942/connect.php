```php
<?php
//Your MySQL details
$servername = "ddsmysql.desmond-digital.com";
$username = "2Dogseeds";
$password = "171Kenco";
$dbname = "ddigital";

$conn = new mysqli($servername, $username, $password, $dbname);

//Check the database connection
if($conn->connect_error){
  die("Connection failed: " . $conn->connect_error);
}

//values from the form
$first_name = $conn->real_escape_string($_POST["first_name"]);
$last_name = $conn->real_escape_string($_POST["last_name"]);
$email= $conn->real_escape_string($_POST["email"]);
$message = $conn->real_escape_string($_POST["message"]);

//insert data to the database
$sql = "INSERT INTO users (first_name, last_name, email, message) VALUES ('$first_name', '$last_name', '$email', '$message')";

if($conn->query($sql) === TRUE){
  echo "New record created successfully";
} else {
  echo "Error: ".$sql ."<br>" . $conn->error;
}

$conn->close();
?>
```
