
# Join Waitlist Page Deployment Instructions

## Files Included
1. `join_waitlist.html` - The main HTML file for the waitlist page.
2. `submit.php` - Backend PHP script to handle form submissions.
3. `create_zip.php` - PHP script to create a zip file of the data.
4. `signups.csv` - File where signup data will be stored (initially empty).

## Deployment Steps
1. Upload all files (`join_waitlist.html`, `submit.php`, `create_zip.php`, and `signups.csv`) to your DreamHost domain using an FTP client or the DreamHost control panel.
2. Ensure the server has PHP installed and is configured to execute PHP scripts.
3. Navigate to `join_waitlist.html` on your website to view the form.
4. After form submissions, use `create_zip.php` to download the collected data as a zip file.

## Notes
- Ensure write permissions are set for the `signups.csv` file on the server so that the PHP script can write to it.
- The `create_zip.php` script should only be accessed by authorized personnel as it contains sensitive user data.
