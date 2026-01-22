
<?php
$zip = new ZipArchive();
$filename = "./signups.zip";

if ($zip->open($filename, ZipArchive::CREATE)!==TRUE) {
    exit("Cannot open <$filename>
");
}

$zip->addFile("signups.csv");
$zip->close();

echo 'Zip file created. <a href="signups.zip">Download Zip</a>';
?>
