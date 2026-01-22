<?php
// Check if the form is submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get form data
    $fullName = $_POST['fullName'];
    $email = $_POST['email'];
    $message = $_POST['message'];

    // Sanitize input data
    $fullName = filter_var($fullName, FILTER_SANITIZE_STRING);
    $email = filter_var($email, FILTER_SANITIZE_EMAIL);
    $message = filter_var($message, FILTER_SANITIZE_STRING);

    // Prepare data for CSV
    $data = [$fullName, $email, $message];
    $csvFile = 'submissions.csv';
    $fileHandle = fopen($csvFile, 'a'); // Open the file in append mode

    // Write data to CSV file
    fputcsv($fileHandle, $data);

    // Close the file
    fclose($fileHandle);

    // Redirect to the thank you page
    header('Location: thank_you.html');
    exit;
}
?>