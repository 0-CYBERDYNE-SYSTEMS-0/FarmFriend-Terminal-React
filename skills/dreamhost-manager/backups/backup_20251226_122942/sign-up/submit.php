
<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST['name'];
    $email = $_POST['email'];

    // Validation
    if (empty($name) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "Invalid input";
        return;
    }

    // Save data
    $data = $name . "," . $email . "\n";
    file_put_contents('signups.csv', $data, FILE_APPEND);

    

   

    echo "Thank you for joining our waitlist! We will be in touch.
    
    <a href='https://totaldicotsolutions.gumroad.com'>Visit Our Store</a>";
}
?>
